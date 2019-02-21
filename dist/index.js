'use strict';

var SPECS = {"COMMUNICATION_BITS":16,"CASTLE_TALK_BITS":8,"MAX_ROUNDS":1000,"TRICKLE_FUEL":25,"INITIAL_KARBONITE":100,"INITIAL_FUEL":500,"MINE_FUEL_COST":1,"KARBONITE_YIELD":2,"FUEL_YIELD":10,"MAX_TRADE":1024,"MAX_BOARD_SIZE":64,"MAX_ID":4096,"CASTLE":0,"CHURCH":1,"PILGRIM":2,"CRUSADER":3,"PROPHET":4,"PREACHER":5,"RED":0,"BLUE":1,"CHESS_INITIAL":100,"CHESS_EXTRA":20,"TURN_MAX_TIME":200,"MAX_MEMORY":50000000,"UNITS":[{"CONSTRUCTION_KARBONITE":null,"CONSTRUCTION_FUEL":null,"KARBONITE_CAPACITY":null,"FUEL_CAPACITY":null,"SPEED":0,"FUEL_PER_MOVE":null,"STARTING_HP":200,"VISION_RADIUS":100,"ATTACK_DAMAGE":10,"ATTACK_RADIUS":[1,64],"ATTACK_FUEL_COST":10,"DAMAGE_SPREAD":0},{"CONSTRUCTION_KARBONITE":50,"CONSTRUCTION_FUEL":200,"KARBONITE_CAPACITY":null,"FUEL_CAPACITY":null,"SPEED":0,"FUEL_PER_MOVE":null,"STARTING_HP":100,"VISION_RADIUS":100,"ATTACK_DAMAGE":0,"ATTACK_RADIUS":0,"ATTACK_FUEL_COST":0,"DAMAGE_SPREAD":0},{"CONSTRUCTION_KARBONITE":10,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":4,"FUEL_PER_MOVE":1,"STARTING_HP":10,"VISION_RADIUS":100,"ATTACK_DAMAGE":null,"ATTACK_RADIUS":null,"ATTACK_FUEL_COST":null,"DAMAGE_SPREAD":null},{"CONSTRUCTION_KARBONITE":15,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":9,"FUEL_PER_MOVE":1,"STARTING_HP":40,"VISION_RADIUS":49,"ATTACK_DAMAGE":10,"ATTACK_RADIUS":[1,16],"ATTACK_FUEL_COST":10,"DAMAGE_SPREAD":0},{"CONSTRUCTION_KARBONITE":25,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":4,"FUEL_PER_MOVE":2,"STARTING_HP":20,"VISION_RADIUS":64,"ATTACK_DAMAGE":10,"ATTACK_RADIUS":[16,64],"ATTACK_FUEL_COST":25,"DAMAGE_SPREAD":0},{"CONSTRUCTION_KARBONITE":30,"CONSTRUCTION_FUEL":50,"KARBONITE_CAPACITY":20,"FUEL_CAPACITY":100,"SPEED":4,"FUEL_PER_MOVE":3,"STARTING_HP":60,"VISION_RADIUS":16,"ATTACK_DAMAGE":20,"ATTACK_RADIUS":[1,16],"ATTACK_FUEL_COST":15,"DAMAGE_SPREAD":3}]};

function insulate(content) {
    return JSON.parse(JSON.stringify(content));
}

class BCAbstractRobot {
    constructor() {
        this._bc_reset_state();
    }

    // Hook called by runtime, sets state and calls turn.
    _do_turn(game_state) {
        this._bc_game_state = game_state;
        this.id = game_state.id;
        this.karbonite = game_state.karbonite;
        this.fuel = game_state.fuel;
        this.last_offer = game_state.last_offer;

        this.me = this.getRobot(this.id);

        if (this.me.turn === 1) {
            this.map = game_state.map;
            this.karbonite_map = game_state.karbonite_map;
            this.fuel_map = game_state.fuel_map;
        }

        try {
            var t = this.turn();
        } catch (e) {
            t = this._bc_error_action(e);
        }

        if (!t) t = this._bc_null_action();

        t.signal = this._bc_signal;
        t.signal_radius = this._bc_signal_radius;
        t.logs = this._bc_logs;
        t.castle_talk = this._bc_castle_talk;

        this._bc_reset_state();

        return t;
    }

    _bc_reset_state() {
        // Internal robot state representation
        this._bc_logs = [];
        this._bc_signal = 0;
        this._bc_signal_radius = 0;
        this._bc_game_state = null;
        this._bc_castle_talk = 0;
        this.me = null;
        this.id = null;
        this.fuel = null;
        this.karbonite = null;
        this.last_offer = null;
    }

    // Action template
    _bc_null_action() {
        return {
            'signal': this._bc_signal,
            'signal_radius': this._bc_signal_radius,
            'logs': this._bc_logs,
            'castle_talk': this._bc_castle_talk
        };
    }

    _bc_error_action(e) {
        var a = this._bc_null_action();
        
        if (e.stack) a.error = e.stack;
        else a.error = e.toString();

        return a;
    }

    _bc_action(action, properties) {
        var a = this._bc_null_action();
        if (properties) for (var key in properties) { a[key] = properties[key]; }
        a['action'] = action;
        return a;
    }

    _bc_check_on_map(x, y) {
        return x >= 0 && x < this._bc_game_state.shadow[0].length && y >= 0 && y < this._bc_game_state.shadow.length;
    }
    
    log(message) {
        this._bc_logs.push(JSON.stringify(message));
    }

    // Set signal value.
    signal(value, radius) {
        // Check if enough fuel to signal, and that valid value.
        
        var fuelNeeded = Math.ceil(Math.sqrt(radius));
        if (this.fuel < fuelNeeded) throw "Not enough fuel to signal given radius.";
        if (!Number.isInteger(value) || value < 0 || value >= Math.pow(2,SPECS.COMMUNICATION_BITS)) throw "Invalid signal, must be int within bit range.";
        if (radius > 2*Math.pow(SPECS.MAX_BOARD_SIZE-1,2)) throw "Signal radius is too big.";

        this._bc_signal = value;
        this._bc_signal_radius = radius;

        this.fuel -= fuelNeeded;
    }

    // Set castle talk value.
    castleTalk(value) {
        // Check if enough fuel to signal, and that valid value.

        if (!Number.isInteger(value) || value < 0 || value >= Math.pow(2,SPECS.CASTLE_TALK_BITS)) throw "Invalid castle talk, must be between 0 and 2^8.";

        this._bc_castle_talk = value;
    }

    proposeTrade(karbonite, fuel) {
        if (this.me.unit !== SPECS.CASTLE) throw "Only castles can trade.";
        if (!Number.isInteger(karbonite) || !Number.isInteger(fuel)) throw "Must propose integer valued trade."
        if (Math.abs(karbonite) >= SPECS.MAX_TRADE || Math.abs(fuel) >= SPECS.MAX_TRADE) throw "Cannot trade over " + SPECS.MAX_TRADE + " in a given turn.";

        return this._bc_action('trade', {
            trade_fuel: fuel,
            trade_karbonite: karbonite
        });
    }

    buildUnit(unit, dx, dy) {
        if (this.me.unit !== SPECS.PILGRIM && this.me.unit !== SPECS.CASTLE && this.me.unit !== SPECS.CHURCH) throw "This unit type cannot build.";
        if (this.me.unit === SPECS.PILGRIM && unit !== SPECS.CHURCH) throw "Pilgrims can only build churches.";
        if (this.me.unit !== SPECS.PILGRIM && unit === SPECS.CHURCH) throw "Only pilgrims can build churches.";
        
        if (!Number.isInteger(dx) || !Number.isInteger(dx) || dx < -1 || dy < -1 || dx > 1 || dy > 1) throw "Can only build in adjacent squares.";
        if (!this._bc_check_on_map(this.me.x+dx,this.me.y+dy)) throw "Can't build units off of map.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] > 0) throw "Cannot build on occupied tile.";
        if (!this.map[this.me.y+dy][this.me.x+dx]) throw "Cannot build onto impassable terrain.";
        if (this.karbonite < SPECS.UNITS[unit].CONSTRUCTION_KARBONITE || this.fuel < SPECS.UNITS[unit].CONSTRUCTION_FUEL) throw "Cannot afford to build specified unit.";

        return this._bc_action('build', {
            dx: dx, dy: dy,
            build_unit: unit
        });
    }

    move(dx, dy) {
        if (this.me.unit === SPECS.CASTLE || this.me.unit === SPECS.CHURCH) throw "Churches and Castles cannot move.";
        if (!this._bc_check_on_map(this.me.x+dx,this.me.y+dy)) throw "Can't move off of map.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] === -1) throw "Cannot move outside of vision range.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] !== 0) throw "Cannot move onto occupied tile.";
        if (!this.map[this.me.y+dy][this.me.x+dx]) throw "Cannot move onto impassable terrain.";

        var r = Math.pow(dx,2) + Math.pow(dy,2);  // Squared radius
        if (r > SPECS.UNITS[this.me.unit]['SPEED']) throw "Slow down, cowboy.  Tried to move faster than unit can.";
        if (this.fuel < r*SPECS.UNITS[this.me.unit]['FUEL_PER_MOVE']) throw "Not enough fuel to move at given speed.";

        return this._bc_action('move', {
            dx: dx, dy: dy
        });
    }

    mine() {
        if (this.me.unit !== SPECS.PILGRIM) throw "Only Pilgrims can mine.";
        if (this.fuel < SPECS.MINE_FUEL_COST) throw "Not enough fuel to mine.";
        
        if (this.karbonite_map[this.me.y][this.me.x]) {
            if (this.me.karbonite >= SPECS.UNITS[SPECS.PILGRIM].KARBONITE_CAPACITY) throw "Cannot mine, as at karbonite capacity.";
        } else if (this.fuel_map[this.me.y][this.me.x]) {
            if (this.me.fuel >= SPECS.UNITS[SPECS.PILGRIM].FUEL_CAPACITY) throw "Cannot mine, as at fuel capacity.";
        } else throw "Cannot mine square without fuel or karbonite.";

        return this._bc_action('mine');
    }

    give(dx, dy, karbonite, fuel) {
        if (dx > 1 || dx < -1 || dy > 1 || dy < -1 || (dx === 0 && dy === 0)) throw "Can only give to adjacent squares.";
        if (!this._bc_check_on_map(this.me.x+dx,this.me.y+dy)) throw "Can't give off of map.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] <= 0) throw "Cannot give to empty square.";
        if (karbonite < 0 || fuel < 0 || this.me.karbonite < karbonite || this.me.fuel < fuel) throw "Do not have specified amount to give.";

        return this._bc_action('give', {
            dx:dx, dy:dy,
            give_karbonite:karbonite,
            give_fuel:fuel
        });
    }

    attack(dx, dy) {
        if (this.me.unit === SPECS.CHURCH) throw "Churches cannot attack.";
        if (this.fuel < SPECS.UNITS[this.me.unit].ATTACK_FUEL_COST) throw "Not enough fuel to attack.";
        if (!this._bc_check_on_map(this.me.x+dx,this.me.y+dy)) throw "Can't attack off of map.";
        if (this._bc_game_state.shadow[this.me.y+dy][this.me.x+dx] === -1) throw "Cannot attack outside of vision range.";

        var r = Math.pow(dx,2) + Math.pow(dy,2);
        if (r > SPECS.UNITS[this.me.unit]['ATTACK_RADIUS'][1] || r < SPECS.UNITS[this.me.unit]['ATTACK_RADIUS'][0]) throw "Cannot attack outside of attack range.";

        return this._bc_action('attack', {
            dx:dx, dy:dy
        });
        
    }


    // Get robot of a given ID
    getRobot(id) {
        if (id <= 0) return null;
        for (var i=0; i<this._bc_game_state.visible.length; i++) {
            if (this._bc_game_state.visible[i].id === id) {
                return insulate(this._bc_game_state.visible[i]);
            }
        } return null;
    }

    // Check if a given robot is visible.
    isVisible(robot) {
        return ('unit' in robot);
    }

    // Check if a given robot is sending you radio.
    isRadioing(robot) {
        return robot.signal >= 0;
    }

    // Get map of visible robot IDs.
    getVisibleRobotMap() {
        return this._bc_game_state.shadow;
    }

    // Get boolean map of passable terrain.
    getPassableMap() {
        return this.map;
    }

    // Get boolean map of karbonite points.
    getKarboniteMap() {
        return this.karbonite_map;
    }

    // Get boolean map of impassable terrain.
    getFuelMap() {
        return this.fuel_map;
    }

    // Get a list of robots visible to you.
    getVisibleRobots() {
        return this._bc_game_state.visible;
    }

    turn() {
        return null;
    }
}

const PILGRIM_KARBONITE_CAPACITY = 20;
const PILGRIM_FUEL_CAPACITY = 100;
const PILGRIM_MOVE_SPEED = 2;
const CRUSADER_MOVE_SPEED = 3;
const PROPHET_MOVE_SPEED = 2;

const CASTLE = 0;


const KARBONITE = "KARBONITE";
const FUEL = "FUEL";
const EMPTY = "EMPTY";

const RESOURCE_TILE_BUSY = "BUSY";
const RESOURCE_TILE_READY = "READY";

const STATUS_IDLE = 0;
const STATUS_BUILDING = STATUS_IDLE + 1;
const STATUS_MINING = STATUS_BUILDING + 1;
const STATUS_MOVING = STATUS_MINING + 1;
const STATUS_ATTACKING = STATUS_MOVING + 1;

const prophet = {};

const tileIsPorced = (x, y, self) => {
  const botMap = self.getVisibleRobotMap();
  if (botMap[y][x] > 0) {
    const bot = self.getRobot(botMap[y][x]).unit;
    if (bot === SPECS.PROPHET || bot === SPECS.CASTLE || bot === SPECS.CHURCH) {
      return true;
    }
  }

  return false;
};

const getPorcDestination = (self) => {
  const cX = self.me.x; // center x
  const cY = self.me.y; // center y

  const GRID_SPACE = 1;

  // create a map of distances from our castle to available porc tiles
  const botMap = self.getVisibleRobotMap();
  const porcMap = [];
  for (let y = 0; y < botMap.length; y++) {
    const row = [];
    for (let x = 0; x < botMap[y].length; x++) {
      if (x % (GRID_SPACE + 1) === 0 && y % (GRID_SPACE + 1) === 0) {
        if ((tileIsPorced(x, y, self)) || // can't build porc if there's already porc there
          (self.karbonite_map[y][x]) || // don't build on karb
          (self.fuel_map[y][x]) || // or fuel
          (!self.map[y][x]) // can't build on a wall
        ) {
          row.push(99999);
        } else {
          row.push((x - cX) ** 2 + (y - cY) ** 2);
        }
      } else {
        row.push(99999);
      }
    }
    porcMap.push(row);
  }

  // pick the closest open tile
  let bX = 0;
  let bY = 0;
  for (let y = 0; y < porcMap.length; y++) {
    for (let x = 0; x < porcMap[y].length; x++) {
      if (porcMap[y][x] < porcMap[bY][bX]) {
        bX = x;
        bY = y;
      }
    }
  }

  return [bX, bY];
};

prophet.takeTurn = (self) => {
  const bots = self.getVisibleRobots();

  if (self.infant) {
    self.infant = false;

    // save the first castle we see as our porc center to align the grid
    for (let i = 0; i < bots.length; i++) {
      if (bots[i].unit === SPECS.CASTLE) {
        self.castle = [bots[i].x, bots[i].y];
      }
    }

    self.porcDestination = getPorcDestination(self);
  }

  for (let i = 0; i < bots.length; i++) {
    if (bots[i].team !== self.me.team) {
      if (((self.me.x - bots[i].x) ** 2 + (self.me.y - bots[i].y) ** 2) <= SPECS.UNITS[SPECS.PROPHET].ATTACK_RADIUS) {
        return self.attack(bots[i].x - self.me.x, bots[i].y - self.me.y);
      }
    }
  }

  if (self.inTransit) {
    if (self.porcDestination[0] !== -1 && self.porcDestination[1] !== -1) {
      // if we're at our dest then stop moving
      // if someone got there first then pick a new dest
      const botMap = self.getVisibleRobotMap();
      if (botMap[self.porcDestination[1]][self.porcDestination[0]] > 0) {
        if (self.me.x === self.porcDestination[0] && self.me.y === self.porcDestination[1]) {
          self.inTransit = false;
        } else if (tileIsPorced(self.porcDestination[0], self.porcDestination[1], self)) {
          self.porcDestination = getPorcDestination(self);
        }
      }

      if (self.porcDestination[0] !== -1 && self.porcDestination[1] !== -1) {
        return self.sanitizeRet(self.moveToTarget(self.porcDestination[0], self.porcDestination[1]));
      }
    }
  }

  return null;
};

const castle = {};

castle.takeTurn = (self) => {
  self.step++;

  if (self.infant) {
    self.infant = false;
    for (let dY = -4; dY <= 4; dY++) {
      for (let dX = -4; dX <= 4; dX++) {
        if (self._coordIsValid(self.me.x + dX, self.me.y + dY)) {
          if (self.karbonite_map[self.me.y + dY][self.me.x + dX] || self.fuel_map[self.me.y + dY][self.me.x + dX]) {
            self.nNearbyResources++;
          }
        }
      }
    }
  }

  // update our robots list
  self.robots = self.getVisibleRobots();
  for (let i = 0; i < self.robots.length; i++) {
    if (self.robots[i].unit === SPECS.CRUSADER) ;
  }

  if (self.step === 200) {

    self.signal(29698, self.map.length ** 2);
    return null;

    // pick the radius that is guaranteed to cover the whole map
    const radiuses = [
      ((self.me.x - 0) ** 2 + (self.me.y - 0) ** 2) ** 0.5,
      ((self.me.x - self.map[0].length) ** 2 + (self.me.y - self.map.length) ** 2) ** 0.5,
      ((self.me.x - self.map[0].length) ** 2 + (self.me.y) ** 2) ** 0.5,
      ((self.me.x) ** 2 + (self.me.y - self.map.length) ** 2) ** 0.5,
    ];

    let radius = 0;
    for (let i = 0; i < radiuses.length; i++) {
      if (radiuses[i] > radius) {
        radius = radiuses[i];
      }
    }

    // figure out how the map is mirrored
    let mirroredVertically = true;
    for (let i = 0; i < self.map.length / 2; i++) {
      if (self.map[0][i] !== self.map[0][i + self.map.length / 2]) {
        mirroredVertically = false;
      }
    }

    // select a target by mirroring our location over
    const enemyCoords = { x: self.me.x, y: self.me.y };

    if (!mirroredVertically) {
      if (self.me.x > self.map.length / 2) {
        enemyCoords.x = self.me.x - self.map.length / 2;
      } else {
        enemyCoords.x = self.map.length / 2 - self.me.x;
      }
    } else if (mirroredVertically) {
      if (self.me.y > self.map.length / 2) {
        enemyCoords.y = self.me.y - self.map.length / 2;
      } else {
        enemyCoords.y = self.map.length / 2 - self.me.x;
      }
    }

    // calculate our signal
    const signal = enemyCoords.x * 256 + enemyCoords.y;

    // signal to everything on the map to target that enemy
    self.signal(signal, radius);
  }

  // get all robots within range
  const enemiesInRange = self.getVisibleRobots().filter((robot) => {
    const dist = (self.me.x - robot.x) ** 2 + (self.me.y - robot.y) ** 2;
    const minRange = SPECS.UNITS[self.me.unit].ATTACK_RADIUS[0];
    const maxRange = SPECS.UNITS[self.me.unit].ATTACK_RADIUS[1];
    if (self.me.team !== robot.team && dist >= minRange && dist <= maxRange) {
      return true;
    }
    return false;
  });

  // attack enemies in order of prophet > preacher > crusader > pilgrim
  if (enemiesInRange.length > 0 && self.fuel >= 10) {
    // break the list of attackable robots down by unit type
    const enemyRobots = {
      [SPECS.PROPHET]: [],
      [SPECS.PREACHER]: [],
      [SPECS.CRUSADER]: [],
      [SPECS.PILGRIM]: [],
    };

    // split the list up by unit to make it easy to prioritize targets
    for (let i = 0; i < enemiesInRange.length; i++) {
      enemyRobots[enemiesInRange[i].unit].push(enemiesInRange[i]);
    }

    // get the first enemy robot and attack it
    for (const key in enemyRobots) {
      if (enemyRobots[key].length > 0) {
        const dX = enemyRobots[key][0].x - self.me.x;
        const dY = enemyRobots[key][0].y - self.me.y;
        return self.attack(dX, dY);
      }
    }
  }

  // priority build a pilgrim for all of the resources within four tiles of the castle
  if (self.step <= self.nNearbyResources) {
    // return buildOnRandomEmptyTile(SPECS.PROPHET, self);
    return self.buildOnRandomEmptyTile(SPECS.PILGRIM);
  }

  //const unit = self.buildCycle[self.buildIndex];
  //if (self.haveResourcesToBuild(unit) && Math.random() < 0.33) { // random chance is so one castle doesn't hog all the resources
  //  self.buildIndex++;
  //  if (self.buildIndex >= self.buildCycle.length) {
  //    self.buildIndex = 0;
  //  }
  //  return self.buildOnRandomEmptyTile(unit);
  //}
};

const pilgrim = {};

// gather all of the actual valid resource cells into an array and turn them into objects
// each object has coords and state that change depending on if a robot is using the tile
const resourceMapToArray = (map) => {
  const resourceTiles = [];
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      if (map[y][x] !== EMPTY) { // has resource
        resourceTiles.push({
          x,
          y,
          state: RESOURCE_TILE_READY,
          type: map[y][x],
        });
      }
    }
  }
  return resourceTiles;
};

pilgrim.takeTurn = (self) => {
  // save important info on the first cycle of each trip
  if (self.infant) {
    self.infant = false;

    // merge the resource maps together
    self.resourceMap = [];
    for (let y = 0; y < self.karbonite_map.length; y++) {
      const row = [];
      for (let x = 0; x < self.karbonite_map[y].length; x++) {
        if (self.karbonite_map[y][x]) {
          row.push(KARBONITE);
        } else if (self.fuel_map[y][x]) {
          row.push(FUEL);
        } else {
          row.push(EMPTY);
        }
      }
      self.resourceMap.push(row);
    }

    self.resourceTiles = resourceMapToArray(self.resourceMap);

    // this will be recalculated each round
    self.resourceTile = self.getClosestReadyResource(self.resourceTiles);
  }

  // update our resource map
  // tiles in vision without robots get set to ready
  // tiles in vision with robots get set to busy
  const visibleRobotMap = self.getVisibleRobotMap();
  let visibleBase = false;
  for (let y = 0; y < visibleRobotMap.length; y++) {
    for (let x = 0; x < visibleRobotMap[y].length; x++) {
      // if we see a castle, its probably closer to our destination resource tile so save its location
      const bot = self.getRobot(visibleRobotMap[y][x]);
      if (bot !== null && (bot.unit === CASTLE || bot.unit === SPECS.CHURCH)) {
        self.castle = [x, y];
        const dist = ((bot.x - self.me.x) ** 2 + (bot.y - self.me.y) ** 2) ** 0.5;
        if (dist < 6) {
          visibleBase = true;
        }
      }

      if (self.resourceMap[y][x].type !== EMPTY) {
        // find the relevant resource tile
        let index = -1;
        for (let j = 0; j < self.resourceTiles.length; j++) {
          if (self.resourceTiles[j].x === x && self.resourceTiles[j].y === y) {
            index = j;
          }
        }
        if (index >= 0) {
          if (visibleRobotMap[y][x] === 0 || visibleRobotMap[y][x] === self.me.id) {
            self.resourceTiles[index].state = RESOURCE_TILE_READY;
          } else if (visibleRobotMap[y][x] > 0) {
            self.resourceTiles[index].state = RESOURCE_TILE_BUSY;
          }
        }
      }
    }
  }

  // check to see if we should build a church
  // only build a church if there's none nearby and there's a nearby resource patch
  if (!visibleBase) {
    //self.log("no base nearby");
    let nearbyPatches = 0;
    for (let i = 0; i < self.resourceTiles.length; i++) {
      const dist = ((self.resourceTiles[i].x - self.me.x) ** 2 + (self.resourceTiles[i].y - self.me.y) ** 2) ** 0.5;
      if (dist < 6) {
        nearbyPatches++;
      }
    }
    if (nearbyPatches >= 2) {
      return self.buildOnRandomEmptyTile(SPECS.CHURCH);
    }
  }


  // mine resource if carrying space and on its tile
  if (self.resourceTile !== -1) {
    if ((self.me.x === self.resourceTiles[self.resourceTile].x) && (self.me.y === self.resourceTiles[self.resourceTile].y)) {
      if (self.resourceTiles[self.resourceTile].type === KARBONITE && self.me.karbonite < PILGRIM_KARBONITE_CAPACITY) {
        //  self.log("Mine karb");
        return self.harvest();
      }
      if (self.resourceTiles[self.resourceTile].type === FUEL && self.me.fuel < PILGRIM_FUEL_CAPACITY) {
        //  self.log("Mine fuel");
        return self.harvest();
      }
    }
  }

  // pick the nearest available resource
  // if it's the same one as our current one just keep moving to it
  // otherwise switch to the new one
  const newResourceTile = self.getClosestReadyResource(self.resourceTiles);
  if (newResourceTile !== -1) {
    if (self.resourceTiles[newResourceTile].x === self.resourceTile.x && self.resourceTiles[newResourceTile].y === self.resourceTile.y) {
      if (self.moving) {
        return self.continueMovement();
      }
    } else {
      self.resourceTile = newResourceTile;
    }
  }

  if (self.resourceTile !== -1) {
    // move to karb
    if (self.resourceTiles[self.resourceTile].type === KARBONITE && self.me.karbonite < PILGRIM_KARBONITE_CAPACITY) {
      //self.log("Move to karb " + self.resourceTiles[self.resourceTile].x + " " + self.resourceTiles[self.resourceTile].y);
      return self.moveToTarget(self.resourceTiles[self.resourceTile].x, self.resourceTiles[self.resourceTile].y);
    }

    // move to fuel
    if (self.resourceTiles[self.resourceTile].type === FUEL && self.me.fuel < PILGRIM_FUEL_CAPACITY) {
      //self.log("Move to fuel " + self.resourceTiles[self.resourceTile].x + " " + self.resourceTiles[self.resourceTile].y);
      return self.moveToTarget(self.resourceTiles[self.resourceTile].x, self.resourceTiles[self.resourceTile].y);
    }
  }


  // standing next to castle so wait to give it automatically
  if ((self.me.x >= self.castle[0] - 1) && (self.me.x <= self.castle[0] + 1) && (self.me.y >= self.castle[1] - 1) && (self.me.y <= self.castle[1] + 1)) {
    const dX = self.castle[0] - self.me.x;
    const dY = self.castle[1] - self.me.y;
    // self.log("Depositing resources " + self.me.x + " " + self.me.y + "  " + self.castle[0] + " " + self.castle[1] + "  " + dX + " " + dY);

    self.infant = true;
    return self.give(dX, dY, self.me.karbonite, self.me.fuel);
  }

  // go back home
  //self.log("Going home");
  self.moveAdjacentToTarget(self.castle[0], self.castle[1]);

  return null;
};

const crusader = {};

const tileIsPorced$1 = (x, y, self) => {
  // don't porc next to bases cuz they'll get walled in
  if (self.adjacentToBase(x, y)) {
    return true;
  }


  const botMap = self.getVisibleRobotMap();
  if (botMap[y][x] > 0) {
    const bot = self.getRobot(botMap[y][x]).unit;
    if (bot === SPECS.CRUSADER || bot === SPECS.CASTLE || bot === SPECS.CHURCH) {
      return true;
    }
  }

  return false;
};

const getPorcDestination$1 = (self) => {
  const cX = self.me.x; // center x
  const cY = self.me.y; // center y

  const GRID_SPACE = 1;

  // create a map of distances from our castle to available porc tiles
  const botMap = self.getVisibleRobotMap();
  const porcMap = [];
  for (let y = 0; y < botMap.length; y++) {
    const row = [];
    let offset = 0;
    if (y % 2 === 0) {
      offset = 1;
    }
    for (let x = 0; x < botMap[y].length; x++) {
      if ((x - offset) % (GRID_SPACE + 1) === 0) {
        if ((tileIsPorced$1(x, y, self)) || // can't build porc if there's already porc there
          (self.karbonite_map[y][x]) || // don't build on karb
          (self.fuel_map[y][x]) || // or fuel
          (!self.map[y][x]) // can't build on a wall
        ) {
          row.push(99999);
        } else {
          row.push((x - cX) ** 2 + (y - cY) ** 2);
        }
      } else {
        row.push(99999);
      }
    }
    porcMap.push(row);
  }

  // pick the closest open tile
  let bX = 0;
  let bY = 0;
  for (let y = 0; y < porcMap.length; y++) {
    for (let x = 0; x < porcMap[y].length; x++) {
      if (porcMap[y][x] < porcMap[bY][bX]) {
        bX = x;
        bY = y;
      }
    }
  }

  return [bX, bY];
};

crusader.takeTurn = (self) => {
  const bots = self.getVisibleRobots();

  if (self.infant) {
    self.infant = false;

    // save the first castle we see as our porc center to align the grid
    for (let i = 0; i < bots.length; i++) {
      if (bots[i].unit === SPECS.CASTLE) {
        self.castle = [bots[i].x, bots[i].y];
      }
    }

    self.porcDestination = getPorcDestination$1(self);
  }

  const botMap = self.getVisibleRobotMap();
  const minY = self.me.y - SPECS.UNITS[SPECS.CRUSADER].ATTACK_RADIUS;
  const maxY = self.me.y + SPECS.UNITS[SPECS.CRUSADER].ATTACK_RADIUS;
  const minX = self.me.x - SPECS.UNITS[SPECS.CRUSADER].ATTACK_RADIUS;
  const maxX = self.me.x + SPECS.UNITS[SPECS.CRUSADER].ATTACK_RADIUS;


  for (let y = minY; y < maxY; y++) {
    for (let x = minX; x < maxX; x++) {
      const bot = self.getRobot(botMap[y][x]);
      if (bot.team !== self.me.team) {
        if (((self.me.x - bot.x) ** 2 + (self.me.y - bot.y) ** 2) <= SPECS.UNITS[SPECS.CRUSADER].ATTACK_RADIUS) {
          return self.shoot(bot.x - self.me.x, bot.y - self.me.y);
        }
      }
    }
  }

  if (self.moving) {
    return self.continueMovement();
  }

  if (self.inTransit) {
    if (self.porcDestination[0] !== -1 && self.porcDestination[1] !== -1) {
      // if we're at our dest then stop moving
      // if someone got there first then pick a new dest
      if (botMap[self.porcDestination[1]][self.porcDestination[0]] > 0) {
        if (self.me.x === self.porcDestination[0] && self.me.y === self.porcDestination[1]) {
          self.inTransit = false;
        } else if (tileIsPorced$1(self.porcDestination[0], self.porcDestination[1], self)) {
          self.porcDestination = getPorcDestination$1(self);
        }
      }

      if (self.porcDestination[0] !== -1 && self.porcDestination[1] !== -1) {
        self.moveToTarget(self.porcDestination[0], self.porcDestination[1]);
      }
    }
  }

  return null;
};

function BinaryHeap(scoreFunction) {
  this.content = [];
  this.scoreFunction = scoreFunction;
}

BinaryHeap.prototype = {
  push: function (element) {
    // Add the new element to the end of the array.
    this.content.push(element);
    // Allow it to bubble up.
    this.bubbleUp(this.content.length - 1);
  },

  pop: function () {
    // Store the first element so we can return it later.
    var result = this.content[0];
    // Get the element at the end of the array.
    var end = this.content.pop();
    // If there are any elements left, put the end element at the
    // start, and let it sink down.
    if (this.content.length > 0) {
      this.content[0] = end;
      this.sinkDown(0);
    }
    return result;
  },

  remove: function (node) {
    var length = this.content.length;
    // To remove a value, we must search through the array to find
    // it.
    for (var i = 0; i < length; i++) {
      if (this.content[i] != node) continue;
      // When it is found, the process seen in 'pop' is repeated
      // to fill up the hole.
      var end = this.content.pop();
      // If the element we popped was the one we needed to remove,
      // we're done.
      if (i == length - 1) break;
      // Otherwise, we replace the removed element with the popped
      // one, and allow it to float up or sink down as appropriate.
      this.content[i] = end;
      this.bubbleUp(i);
      this.sinkDown(i);
      break;
    }
  },

  size: function () {
    return this.content.length;
  },

  bubbleUp: function (n) {
    // Fetch the element that has to be moved.
    var element = this.content[n],
      score = this.scoreFunction(element);
    // When at 0, an element can not go up any further.
    while (n > 0) {
      // Compute the parent element's index, and fetch it.
      var parentN = Math.floor((n + 1) / 2) - 1,
        parent = this.content[parentN];
      // If the parent has a lesser score, things are in order and we
      // are done.
      if (score >= this.scoreFunction(parent))
        break;

      // Otherwise, swap the parent with the current element and
      // continue.
      this.content[parentN] = element;
      this.content[n] = parent;
      n = parentN;
    }
  },

  sinkDown: function (n) {
    // Look up the target element and its score.
    var length = this.content.length,
      element = this.content[n],
      elemScore = this.scoreFunction(element);

    while (true) {
      // Compute the indices of the child elements.
      var child2N = (n + 1) * 2,
        child1N = child2N - 1;
      // This is used to store the new position of the element,
      // if any.
      var swap = null;
      // If the first child exists (is inside the array)...
      if (child1N < length) {
        // Look it up and compute its score.
        var child1 = this.content[child1N],
          child1Score = this.scoreFunction(child1);
        // If the score is less than our element's, we need to swap.
        if (child1Score < elemScore)
          swap = child1N;
      }
      // Do the same checks for the other child.
      if (child2N < length) {
        var child2 = this.content[child2N],
          child2Score = this.scoreFunction(child2);
        if (child2Score < (swap == null ? elemScore : child1Score))
          swap = child2N;
      }

      // No need to swap further, we are done.
      if (swap == null) break;

      // Otherwise, swap and continue.
      this.content[n] = this.content[swap];
      this.content[swap] = element;
      n = swap;
    }
  }
};

// eslint-disable-next-line no-unused-lets
class MyRobot extends BCAbstractRobot {
  constructor() {
    super();
    // general
    this.infant = true;
    this.traversedTiles = [];
    this.destination = null;
    this.path = null;
    this.tempDestination = null;
    this.moving = false;

    // pilgrim
    this.resourceMap = null;
    this.resourceTile = -1; // index into this.resourceTiles
    this.castle = [-1, -1];
    this.resourceTiles = [];
    this.forbiddenResourceTiles = [];

    // prophet
    this.porcDestination = [-1, -1];
    this.inTransit = true;

    // crusader
    this.stashDest = [-1, -1];
    this.attacking = false;
    this.attackDest = [-1, -1];

    // castle
    this.step = 0;
    this.location = null;
    this.willBuild = false;
    this.nNearbyResources = 0;

    this.robots = [];
    this.buildLastTurn = false;

    this.buildIndex = 0;
    this.buildCycle = [
      SPECS.CRUSADER,
      SPECS.CRUSADER,
      SPECS.CRUSADER,
      SPECS.CRUSADER,
      SPECS.PILGRIM,
    ];

    this.pendingRecievedMessages = {};
    this.enemyCastles = [];
    this.myType = undefined;
    this.pilgrimsBuilt = 0;
    this.speed = -1;
  }

  construct(unit, dX, dY) {
    this.castleTalk(STATUS_BUILDING);
    return this.buildUnit(unit, dX, dY);
  }

  harvest() {
    this.castleTalk(STATUS_MINING);
    return this.mine();
  }

  shoot(dX, dY) {
    this.castleTalk(STATUS_ATTACKING);
    return this.attack(dX, dY);
  }

  moveWrapper(dX, dY) {
    this.castleTalk(STATUS_MOVING);
    return this.move(dX, dY);
  }

  turn() {
    this.castleTalk(STATUS_IDLE); // will be overridden later, if necessary
    this.sanityCheck();
    if (this.moving) {
      return this.continueMovement();
    }

    if (this.myType === undefined) {
      switch (this.me.unit) {
        case SPECS.PROPHET:
          this.myType = prophet;
          this.speed = PROPHET_MOVE_SPEED;
          break;
        case SPECS.CASTLE:
          this.myType = castle;
          this.speed = 0;
          break;
        case SPECS.PILGRIM:
          this.myType = pilgrim;
          this.speed = PILGRIM_MOVE_SPEED;
          break;
        case SPECS.CRUSADER:
          this.myType = crusader;
          this.speed = CRUSADER_MOVE_SPEED;
          break;
        default:
          this.log("Unknown unit type" + this.me.unit);
      }
    }
    if (this.myType !== undefined) {
      return this.myType.takeTurn(this);
    }
    return null;
  }

  sanityCheck() {
    let insane = false;
    if (this.location === null) {
      this.location = { x: this.me.x, y: this.me.y };
    }

    // check if a castle or church moved
    if (this.me.unit === SPECS.CASTLE || this.me.unit === SPECS.CHURCH) {
      if (this.location.x !== this.me.x || this.location.y !== this.me.y) {
        insane = true;
      }
    }

    // check if a unit has negative fuel/karb
    if (this.me.fuel < 0 || this.me.karbonite < 0) {
      insane = true;
    }

    // check if our global fuel/karb pool is negative
    if (this.fuel < 0 || this.karbonite < 0) {
      insane = true;
    }

    // check if we're off the map
    if (this.me.x < 0 || this.me.y < 0 || this.me.y >= this.map.length || this.me.x >= this.map[0].length) {
      insane = true;
    }

    // check if we're standing in impassable terrain
    if (!this.map[this.me.y][this.me.x]) {
      insane = true;
    }


    if (insane) {
      this.log("");
      this.log("");
      this.log("");
      this.log("");
      this.log("");
      this.log("");
      this.log("");
      this.log("");
      this.log("################################################################################");
      this.log("#################                                              #################");
      this.log("#######                                                                  #######");
      this.log("####                          !! BUG DETECTED !!                            ####");
      this.log("#######                                                                  #######");
      this.log("#################                                              #################");
      this.log("################################################################################");
      this.log("");
      this.log("");
      this.log("");
      this.log("");
      this.log("");
      this.log("");
      this.log("");
      this.log("");
      this.log("");
    }
  }

  // also adds in a buffer for churches in case pilgrims want to build them
  haveResourcesToBuild(unit) {
    if (this.karbonite >= SPECS.UNITS[unit].CONSTRUCTION_KARBONITE + 50 && this.fuel >= SPECS.UNITS[unit].CONSTRUCTION_FUEL + 200) {
      return true;
    }
    return false;
  }

  adjacentToBase(x, y) {
    const maxX = this.map[0].length - 1;
    const maxY = this.map.length - 1;
    const minX = 0;
    const minY = 0;

    const adjacentUnits = [];

    for (let dY = -1; dY <= 1; dY++) {
      for (let dX = -1; dX <= 1; dX++) {
        if (x + dX >= minX && x + dX <= maxX && minY + dY >= 0 && y + dY <= maxY) {
          adjacentUnits.push(this.getRobot(this.getVisibleRobotMap()[y + dY][x + dX]));
        }
      }
    }

    for (let i = 0; i < adjacentUnits.length; i++) {
      if (adjacentUnits[i] !== null) {
        if (adjacentUnits[i].unit === SPECS.CASTLE || adjacentUnits[i].unit === SPECS.CHURCH) {
          return true;
        }
      }
    }

    return false;
  }

  buildOnRandomEmptyTile(unit) {
    const validTiles = [];
    const botMap = this.getVisibleRobotMap();
    for (let dY = -1; dY <= 1; dY++) {
      for (let dX = -1; dX <= 1; dX++) {
        const x = this.me.x + dX;
        const y = this.me.y + dY;
        if (this._coordIsValid(x, y)) {
          if (this.map[y][x] && botMap[y][x] === 0 && !this.fuel_map[y][x] && !this.karbonite_map[y][x]) {
            validTiles.push({ dX, dY });
          }
        }
      }
    }

    const tile = validTiles[Math.floor(Math.random() * validTiles.length)];
    if (tile !== undefined) {
      return this.construct(unit, tile.dX, tile.dY);
    }
    return null;
  }

  _deepCopyMap(map) {
    const copy = [];
    for (let y = 0; y < map.length; y++) {
      const row = [];
      for (let x = 0; x < map[y].length; x++) {
        row.push(map[y][x]);
      }
      copy.push(row);
    }
    return copy;
  }

  // set each visible bot's tile to false
  // do the same for our traversed tiles
  _markImpassableTiles(bots, map) {
    for (let i = 0; i < bots.length; i++) {
      if (this._coordIsValid(bots[i].x, bots[i].y)) {
        map[bots[i].y][bots[i].x] = false;
      }
    }

    for (let i = 0; i < this.traversedTiles.length; i++) {
      if (this._coordIsValid(this.traversedTiles[i][0], this.traversedTiles[i][1])) {
        map[this.traversedTiles[i][1]][this.traversedTiles[i][0]] = false;
      }
    }
  }

  coordIsAdjacentToResource(x, y) {
    const maxX = this.karbonite_map[0].length - 1;
    const maxY = this.karbonite_map.length - 1;
    const minX = 0;
    const minY = 0;
    if (
      (y + 1 <= maxY && x + 1 <= maxX && x + 1 >= minX && y + 1 >= minY && this.karbonite_map[y + 1][x + 1]) ||
      (y + 1 <= maxY && x - 1 <= maxX && x - 1 >= minX && y + 1 >= minY && this.karbonite_map[y + 1][x - 1]) ||
      (y - 1 <= maxY && x + 1 <= maxX && x + 1 >= minX && y - 1 >= minY && this.karbonite_map[y - 1][x + 1]) ||
      (y + 1 <= maxY && x + 1 <= maxX && x + 1 >= minX && y + 1 >= minY && this.karbonite_map[y + 1][x + 1]) ||
      (y + 1 <= maxY && x + 1 <= maxX && x + 1 >= minX && y + 1 >= minY && this.karbonite_map[y + 0][x + 1]) ||
      (y + 1 <= maxY && x - 1 <= maxX && x - 1 >= minX && y + 1 >= minY && this.karbonite_map[y + 0][x - 1]) ||
      (y + 1 <= maxY && x + 1 <= maxX && x + 1 >= minX && y + 1 >= minY && this.karbonite_map[y + 1][x + 0]) ||
      (y - 1 <= maxY && x + 1 <= maxX && x + 1 >= minX && y - 1 >= minY && this.karbonite_map[y - 1][x + 0])
    ) {
      return true;
    }
    return false;
  }

  _coordIsValid(x, y) {
    if (x >= 0 && x < this.map[0].length && y >= 0 && y < this.map.length) {
      return true;
    }
    return false;
  }

  moveAdjacentToTarget(tX, tY) {
    // check that we aren't already adjacent
    const dX = this.me.x - tX;
    const dY = this.me.y - tY;
    if (dX >= -1 && dX <= 1 && dY >= -1 && dY <= 1) {
      return null;
    }

    const opts = [
      { dX: -1, dY: -1, dist: 9999 },
      { dX: -1, dY: 0, dist: 9999 },
      { dX: -1, dY: 1, dist: 9999 },
      { dX: 0, dY: -1, dist: 9999 },
      { dX: 0, dY: 0, dist: 9999 },
      { dX: 0, dY: 1, dist: 9999 },
      { dX: 1, dY: -1, dist: 9999 },
      { dX: 1, dY: 0, dist: 9999 },
      { dX: 1, dY: 1, dist: 9999 },
    ];

    for (let i = 0; i < opts.length; i++) {
      const x = tX + opts[i].dX;
      const y = tY + opts[i].dY;

      if (this.tileIsBlocked({ x, y })) {
        opts[i].dist = 99999;
      } else {
        opts[i].dist = ((x - this.me.x) ** 2 + (y - this.me.y) ** 2) ** 0.5;
      }
    }

    let best = 0;
    for (let i = 0; i < opts.length; i++) {
      if (opts[i].dist < opts[best].dist) {
        best = i;
      }
    }


    const opt = opts[best]; // opts[Math.floor(Math.random() * opts.length)];
    return this.moveToTarget(tX + opt.dX, tY + opt.dY);
  }

  tileIsBlocked(tile) {
    // null tile can't be blocked
    if (tile.x === null || tile.y === null) {
      return false;
    }

    // if tile is offscreen consider it blocked
    if (tile.x < 0 || tile.x > this.map[0].length - 1 || tile.y < 0 || tile.y > this.map[1].length - 1) {
      return true;
    }

    // if we're on the tile it's not blocked to us
    if (this.me.x === tile.x && this.me.y === tile.y) {
      return false;
    }

    // if impassable or someone is on it, it's blocked
    if (!this.map[tile.y][tile.x] || this.getVisibleRobotMap()[tile.y][tile.x] > 0) {
      return true;
    }
    return false;
  }

  recalculatePathIfNecessary() {
    if (this.path === null) {
      this.path = this.search(this.map, [this.me.x, this.me.y], [this.destination.x, this.destination.y], false, this.manhattan);
      if (this.path.length === 0) {
        this.moving = false;
      }
    }
  }

  continueMovement() {
    // check if arrived at ultimate goal
    if (this.me.x === this.destination.x && this.me.y === this.destination.y) {
      //  this.log("Movement over");
      this.moving = false;
      return null;
    }

    // check if arrived at subgoal
    if (this.tempDestination !== null && this.me.x === this.tempDestination.x && this.me.y === this.tempDestination.y) {
      this.tempDestination = null;
    }

    this.recalculatePathIfNecessary();

    // pick a new subgoal if necessary
    if (this.path.length > 0 && this.tempDestination === null) {
      let index = 0;
      let dist = 999999;
      for (let i = 0; i < this.path.length; i++) {
        const thisDist = ((this.path[i].x - this.path[index].x) ** 2 + (this.path[i].y - this.path[index].y) ** 2);
        if (thisDist < dist) {
          dist = thisDist;
          index = i;
        }
      }

      this.tempDestination = this.path[index];
      this.path.splice(index, 1);
    }

    if (this.tempDestination !== null) {
      // check if something or someone is in our way and recalc path if necessary
      if (!this.map[this.tempDestination.y][this.tempDestination.x] || this.getVisibleRobotMap()[this.tempDestination.y][this.tempDestination.x] > 0) {
        this.tempDestination = null;
        this.path = null;
        this.recalculatePathIfNecessary();
      } else {
        //move to the subgoal
        // this.log("Move to: [" + this.tempDestination.x + " " + this.tempDestination.y + "] from [" + this.me.x + " " + this.me.y + "] with deltas [" + (this.tempDestination.x - this.me.x) + " " + (this.tempDestination.y - this.me.y) + "]");
        //this.logPath();
        return this.moveWrapper(this.tempDestination.x - this.me.x, this.tempDestination.y - this.me.y);
      }
    }
    return null;
  }

  // move to the target x and y, but only one square at a time
  moveToTarget(tX, tY) {
    //  this.log("Movement begun");
    this.moving = true;
    this.destination = { x: tX, y: tY };
    this.path = this.search(this.map, [this.me.x, this.me.y], [this.destination.x, this.destination.y], false, this.manhattan);

    if (this.path.length === 0) {
      this.moving = false;
    }
  }

  logPath() {
    let str = "";
    for (let i = 0; i < this.path.length; i++) {
      str += "[" + this.path[i].x + " " + this.path[i].y + "]";
      if (i < this.path.length - 1) {
        str += "->";
      }
    }
    this.log(str);
  }

  getClosestReadyResource(tiles) {
    let closest = -1;
    let bestDist = 99999;
    for (let i = 0; i < tiles.length; i++) {
      if (tiles[i].state === RESOURCE_TILE_READY) {
        const dist = (tiles[i].x - this.me.x) ** 2 + (tiles[i].y - this.me.y) ** 2;
        if (dist < bestDist) {
          closest = i;
          bestDist = dist;
        }
      }
    }

    return closest;
  }

  // astar helper
  init(map) {
    const grid = [];
    const botmap = this.getVisibleRobotMap();
    for (let y = 0; y < map.length; y++) {
      const row = [];
      for (let x = 0; x < map[y].length; x++) {
        const node = {};
        node.f = 0;
        node.g = 0;
        node.h = 0;
        node.blocked = this.tileIsBlocked({ x, y });
        node.x = x;
        node.y = y;
        node.cost = 1;
        node.visited = false;
        node.closed = false;
        node.parent = null;
        row.push(node);
      }
      grid.push(row);
    }
    return grid;
  }

  // astar helper
  heap() {
    return new BinaryHeap((node) => {
      return node.f;
    });
  }

  // moveToTarget helper, executes astar to find a path
  search(map, start, end, diagonal, heuristic) {
    const grid = this.init(map);
    start = grid[start[1]][start[0]];
    end = grid[end[1]][end[0]];
    heuristic = this.manhattan;
    diagonal = true;

    const openHeap = this.heap();

    openHeap.push(start);

    while (openHeap.size() > 0) {
      // Grab the lowest f(x) to process next.  Heap keeps this sorted for us.
      const currentNode = openHeap.pop();

      // End case -- result has been found, return the traced path.
      if (currentNode.x === end.x && currentNode.y === end.y) {
        let curr = currentNode;
        const ret = [];
        while (curr.parent) {
          ret.push(curr);
          curr = curr.parent;
        }
        return ret.reverse();
      }

      // Normal case -- move currentNode from open to closed, process each of its neighbors.
      currentNode.closed = true;

      // Find all neighbors for the current node. Optionally find diagonal neighbors as well (false by default).
      const neighbors = this.neighbors(grid, currentNode, diagonal);

      for (let i = 0; i < neighbors.length; i++) {
        const neighbor = neighbors[i];

        if (neighbor.closed || neighbor.blocked) {
          // Not a valid node to process, skip to next neighbor.
          continue;
        }

        // The g score is the shortest distance from start to current node.
        // We need to check if the path we have arrived at this neighbor is the shortest one we have seen yet.
        const gScore = currentNode.g + neighbor.cost;
        const beenVisited = neighbor.visited;

        if (!beenVisited || gScore < neighbor.g) {
          // Found an optimal (so far) path to this node.  Take score for node to see how good it is.
          neighbor.visited = true;
          neighbor.parent = currentNode;
          neighbor.h = neighbor.h || heuristic(neighbor, end);
          neighbor.g = gScore;
          neighbor.f = neighbor.g + neighbor.h;

          if (!beenVisited) {
            // Pushing to heap will put it in proper place based on the 'f' value.
            openHeap.push(neighbor);
          } else {
            // Already seen the node, but since it has been rescored we need to reorder it in the heap
            openHeap.remove(neighbor);
            openHeap.push(neighbor);
          }
        }
      }
    }

    // No result was found - empty array signifies failure to find path.
    //  this.log("failed attempt start: [" + start.x + " " + start.y + "] end: [" + end.x + " " + end.y + "]");
    return [];
  }

  // astar helper
  manhattan(pos0, pos1) {
    // See list of heuristics: http://theory.stanford.edu/~amitp/GameProgramming/Heuristics.html

    const d1 = Math.abs(pos1.x - pos0.x);
    const d2 = Math.abs(pos1.y - pos0.y);
    return d1 + d2;
  }

  // astar helper
  neighbors(grid, node, diagonals) {
    const ret = [];
    const x = node.x;
    const y = node.y;

    // West
    if (grid[y - 1] && grid[y - 1][x]) {
      ret.push(grid[y - 1][x]);
    }

    // East
    if (grid[y + 1] && grid[y + 1][x]) {
      ret.push(grid[y + 1][x]);
    }

    // South
    if (grid[y] && grid[y][x - 1]) {
      ret.push(grid[y][x - 1]);
    }

    // North
    if (grid[y] && grid[y][x + 1]) {
      ret.push(grid[y][x + 1]);
    }

    if (diagonals) {
      // Southwest
      if (grid[y - 1] && grid[y - 1][x - 1]) {
        ret.push(grid[y - 1][x - 1]);
      }

      // Southeast
      if (grid[y + 1] && grid[y + 1][x - 1]) {
        ret.push(grid[y + 1][x - 1]);
      }

      // Northwest
      if (grid[y - 1] && grid[y - 1][x + 1]) {
        ret.push(grid[y - 1][x + 1]);
      }

      // Northeast
      if (grid[y + 1] && grid[y + 1][x + 1]) {
        ret.push(grid[y + 1][x + 1]);
      }
    }
    return ret;
  }
}

var robot = new MyRobot();
