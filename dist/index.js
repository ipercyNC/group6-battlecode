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

const RESOURCE_TILE_BUSY = "BUSY";
const RESOURCE_TILE_READY = "READY";

const IDEAL_FUEL_TO_KARB_RATIO = 4;

const AT_TARGET = "AT_TARGET";
const TRAPPED = "TRAPPED";

const prophet = {};

const getPorcDestination = (self) => {
  let x = self.castle[0];
  let y = self.castle[1];

  const maxWidth = self.map[0].length;

  // this isn't quite a spiral but it's close enough
  for (let i = 1; i < maxWidth; i += 3) { // i is the radius of the spiral
    for (let dY = -i; dY <= i; dY += 3) {
      for (let dX = -i; dX <= i; dX += 3) {
        if ((dX === -i || dX === i) || (dY === -i || dY === i)) {
          x = self.castle[0] + dX;
          y = self.castle[1] + dY;
          if (self._coordIsValid(x, y)) {
            if (self.map[y][x]) { // check that the tile isn't impassable
              if (!self.karbonite_map[y][x] && !self.fuel_map[y][x]) { // don't stand on resource tiles
                let occupied = false;
                const bots = self.getVisibleRobots();
                for (let j = 0; j < bots.length; j++) {
                  if (bots[j].x === x && bots[j].y === y) {
                    occupied = true;
                  }
                }
                if (!occupied) {
                  self.log("Porc Dest: " + x + " " + y);
                  return [x, y];
                }
              }
            }
          }
        }
      }
    }
  }

  return [-1, -1];
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

  if (self.inTransit) {
    if (self.porcDestination[0] !== -1 && self.porcDestination[1] !== -1) {
      const botMap = self.getVisibleRobotMap();
      if (botMap[self.porcDestination[1]][self.porcDestination[0]] > 0) {
        if (botMap[self.porcDestination[1]][self.porcDestination[0]] !== self.me.id) {
          self.porcDestination = getPorcDestination(self);
        } else {
          self.inTransit = false;
        }
      }

      if (self.porcDestination[0] !== -1 && self.porcDestination[1] !== -1) {
        return self.sanitizeRet(self.moveToTarget(self.porcDestination[0], self.porcDestination[1]));
      }
    } else {
      self.porcDestination = getPorcDestination(self);
    }
  }

  return null;
};

const haveResourcesToBuild = (unit, self) => {
  if (self.karbonite >= SPECS.UNITS[unit].CONSTRUCTION_KARBONITE && self.fuel >= SPECS.UNITS[unit].CONSTRUCTION_FUEL) {
    return true;
  }
  return false;
};

const buildOnRandomEmptyTile = (unit, self) => {
  if (haveResourcesToBuild(unit, self)) {
    const validTiles = [];
    const botMap = self.getVisibleRobotMap();
    for (let dY = -1; dY <= 1; dY++) {
      for (let dX = -1; dX <= 1; dX++) {
        const x = self.me.x + dX;
        const y = self.me.y + dY;
        if (self._coordIsValid(x, y)) {
          if (self.map[y][x] && botMap[y][x] === 0) {
            validTiles.push({ dX, dY });
          }
        }
      }
    }

    const tile = validTiles[Math.floor(Math.random() * validTiles.length)];
    if (tile !== undefined) {
      return self.buildUnit(unit, tile.dX, tile.dY);
    }
  }
  return null;
};


const castle = {};

castle.takeTurn = (self) => {
  self.step++;

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

  // build a pilgrim for the first two turns
  if (self.step <= 2) {
    return buildOnRandomEmptyTile(SPECS.PILGRIM, self);
  }

  const unit = self.buildCycle[self.buildIndex];
  if (haveResourcesToBuild(unit, self) && Math.random() < 0.33) { // random chance is so one castle doesn't hog all the resources
    self.buildIndex++;
    if (self.buildIndex >= self.buildCycle.length) {
      self.buildIndex = 0;
    }
    return buildOnRandomEmptyTile(unit, self);
  }
};

const pilgrim = {};

// gather all of the actual valid resource cells into an array and turn them into objects
// each object has coords and state that change depending on if a robot is using the tile
const resourceMapToArray = (map) => {
  const resourceTiles = [];
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      if (map[y][x]) { // has resource
        resourceTiles.push({ x, y, state: RESOURCE_TILE_READY });
      }
    }
  }
  return resourceTiles;
};

pilgrim.takeTurn = (self) => {
  const bots = self.getVisibleRobots();

  // save important info on the first cycle of each trip
  if (self.infant) {
    self.infant = false;
    // pick a resource type based on stashes
    if (self.fuel >= self.karbonite * IDEAL_FUEL_TO_KARB_RATIO) {
      self.resource = KARBONITE;
      self.resourceMap = self.karbonite_map;
    } else {
      self.resource = FUEL;
      self.resourceMap = self.fuel_map;
    }
    self.resourceTiles = resourceMapToArray(self.resourceMap);

    // this will be recalculated each round
    self.resourceTile = self.getClosestReadyResource(self.resourceTiles);
  }

  // update our resource map
  // tiles in vision without robots get set to ready
  // tiles in vision with robots get set to busy
  const visibleRobotMap = self.getVisibleRobotMap();
  for (let y = 0; y < visibleRobotMap.length; y++) {
    for (let x = 0; x < visibleRobotMap[y].length; x++) {
      if (self.resourceMap[y][x]) {
        // find the relevant resource tile
        let index = -1;
        for (let j = 0; j < self.resourceTiles.length; j++) {
          if (self.resourceTiles[j].x === x && self.resourceTiles[j].y === y) {
            index = j;
          }
        }
        if (index >= 0) {
          if (visibleRobotMap[y][x] === 0) {
            self.resourceTiles[index].state = RESOURCE_TILE_READY;
          } else if (visibleRobotMap[y][x] > 0) {
            self.resourceTiles[index].state = RESOURCE_TILE_BUSY;
          }
        }
      }
    }
  }

  // if we see a castle, its probably closer to our destination resource tile so save its location
  for (let i = 0; i < bots.length; i++) {
    if (bots[i].unit === CASTLE) {
      self.castle = [bots[i].x, bots[i].y];
    }
  }

  // mine resource if carrying space and on its tile
  if (self.resourceTile !== -1) {
    if ((self.me.x === self.resourceTiles[self.resourceTile].x) && (self.me.y === self.resourceTiles[self.resourceTile].y)) {
      if (self.resource === KARBONITE && self.me.karbonite < PILGRIM_KARBONITE_CAPACITY) {
        //  self.log("Mine karb");
        return self.mine();
      }
      if (self.resource === FUEL && self.me.fuel < PILGRIM_FUEL_CAPACITY) {
        //  self.log("Mine fuel");
        return self.mine();
      }
    }
  }

  // pick the nearest available resource
  self.resourceTile = self.getClosestReadyResource(self.resourceTiles);

  if (self.resourceTile !== -1) {
    // move to karb
    if (self.resource === KARBONITE && self.me.karbonite < PILGRIM_KARBONITE_CAPACITY) {
      //  self.log("Move to karb " + self.resourceTiles[self.resourceTile].x + " " + self.resourceTiles[self.resourceTile].y);
      return self.sanitizeRet(self.moveToTarget(self.resourceTiles[self.resourceTile].x, self.resourceTiles[self.resourceTile].y));
    }

    // move to fuel
    if (self.resource === FUEL && self.me.fuel < PILGRIM_FUEL_CAPACITY) {
      //self.log("Move to fuel " + self.resourceTiles[self.resourceTile].x + " " + self.resourceTiles[self.resourceTile].y);
      return self.sanitizeRet(self.moveToTarget(self.resourceTiles[self.resourceTile].x, self.resourceTiles[self.resourceTile].y));
    }
  }


  // standing next to castle so wait to give it automatically
  if ((self.me.x >= self.castle[0] - 1) && (self.me.x <= self.castle[0] + 1) && (self.me.y >= self.castle[1] - 1) && (self.me.y <= self.castle[1] + 1)) {
    const dX = self.castle[0] - self.me.x;
    const dY = self.castle[1] - self.me.y;
    //self.log("Depositing resources " + self.me.x + " " + self.me.y + "  " + self.castle[0] + " " + self.castle[1] + "  " + dX + " " + dY);

    self.infant = true;
    return self.give(dX, dY, self.me.karbonite, self.me.fuel);
  }

  // go back home
  //self.log("Going home");
  return self.sanitizeRet(self.moveAdjacentToTarget(self.castle[0], self.castle[1]));
};

const navigation = {};

navigation.dirMove = (self, destination) => {
  // self.log("destx " + destination[0] + "dy " + destination[1]);
  // self.log("selfx " + self.me.x + "selfy " + self.me.y);
  let dx = destination[0] - self.me.x;
  let dy = destination[1] - self.me.y;
  if (dx < 0) {
    dx = -1;
  } else {
    dx = 1;
  }
  if (dy < 0) {
    dy = -1;
  } else {
    dy = 1;
  }
  // self.log("dx " + dx + "dy " + dy);
  return [dx, dy];
};

navigation.basicMove = (self, destination) => {
  // self.log("destx " + destination[0] + "dy " + destination[1]);
  return [destination[0], destination[1]];
};

const crusader = {};
crusader.takeTurn = (self) => {
  // make directional choice - either given by castle? or enemy?
  const visible = self.getVisibleRobots();

  // get attackable robots
  const attackable = visible.filter((r) => {
    if (!self.isVisible(r)) {
      return false;
    }

    const dist = Math.pow((r.x - self.me.x), 2) + Math.pow((r.y - self.me.y), 2);
    if (r.team !== self.me.team &&
      SPECS.UNITS[self.me.unit].ATTACK_RADIUS[0] <= dist &&
      dist <= SPECS.UNITS[self.me.unit].ATTACK_RADIUS[1]) {
      return true;
    }
    return false;
  });
  if (attackable.length > 0) {
    // attack first robot
    const r = attackable[0];
    // self.log("" + r);
    // self.log("attacking! " + r + " at loc " + (r.x - self.me.x, r.y - self.me.y));
    return self.attack(r.x - self.me.x, r.y - self.me.y);
  }

  // make random move to start
  const choices = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
  const choice = choices[Math.floor(Math.random() * choices.length)];
  const target = navigation.basicMove(self, choice);
  // self.log("trying to move to " + target);
  return self.move(target[0], target[1]);
};

// eslint-disable-next-line no-unused-vars
class MyRobot extends BCAbstractRobot {
  constructor() {
    super();
    // general
    this.infant = true;
    this.traversedTiles = [];

    // pilgrim
    this.resourceMap = null;
    this.resourceTile = -1; // index into this.resourceTiles
    this.castle = [-1, -1];
    this.resourceTiles = [];
    this.forbiddenResourceTiles = [];

    // prophet
    this.porcDestination = [-1, -1];
    this.inTransit = true;

    // castle
    this.step = 0;
    this.buildIndex = 0;
    this.buildCycle = [
      SPECS.PROPHET,
      SPECS.PROPHET,
      SPECS.PROPHET,
      SPECS.PROPHET,
      SPECS.PILGRIM,
    ];

    this.pendingRecievedMessages = {};
    this.enemyCastles = [];
    this.myType = undefined;
    this.pilgrimsBuilt = 0;
    this.speed = -1;
  }

  turn() {
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
    return this.myType.takeTurn(this);
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


    const opts = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 0], [0, 1], [1, -1], [1, 0], [1, 1]];
    const opt = opts[Math.floor(Math.random() * opts.length)];
    return this.moveToTarget(tX + opt[0], tY + opt[1]);
  }

  sanitizeRet(ret) {
    if (typeof ret === "string") {
      return null;
    }
    return ret;
  }

  // move to the target x and y, but only one square at a time
  moveToTarget(tX, tY) {
    // if already at the target then no need to do anything;
    if ((this.me.x === tX && this.me.y === tY) || (tX === -1) || (tY === -1)) {
      this.traversedTiles = [];
      return AT_TARGET;
    }

    // deep copy the terrain map so we can modify it
    const terrain = this._deepCopyMap(this.map);

    // mark all bot-filled tiles as impassable
    const bots = this.getVisibleRobots();
    this._markImpassableTiles(bots, terrain);

    // for each adjacent tile, calculate the distance from it to the target
    // if the tile is impassable then mark the distance as really really high so it won't ever be chosen
    const dists = [];
    for (let dY = -1; dY <= 1; dY++) {
      const row = [];
      for (let dX = -1; dX <= 1; dX++) {
        const x = this.me.x + dX;
        const y = this.me.y + dY;
        if (this._coordIsValid(x, y)) {
          if (terrain[y][x] === false) {
            row.push(9999);
          } else {
            row.push(((x - tX) ** 2 + (y - tY) ** 2) ** 0.5);
          }
        } else {
          row.push(9999);
        }
      }
      dists.push(row);
    }

    let bX = 0;
    let bY = 0;
    for (let i = 0; i < dists.length; i++) {
      for (let j = 0; j < dists[i].length; j++) {
        if (dists[i][j] < dists[bY][bX]) {
          bX = j;
          bY = i;
        }
      }
    }

    // no legal movements -- robot is trapped and needs to backtrack
    if (dists[bY][bX] === 9999) {
      this.traversedTiles = [[this.me.x, this.me.y]];
      return TRAPPED;
    }

    // calculate deltas
    const dX = bX - 1;
    const dY = bY - 1;

    // if we're about to move to the target then erase the slug trail, otherwise add the new tile to the trail
    if (this.me.x + dX === tX && this.me.y + dY === tY) {
      this.traversedTiles = [];
    } else {
      this.traversedTiles.push([this.me.x + dX, this.me.y + dY]);
    }

    return this.move(dX, dY);
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
}

var robot = new MyRobot();
