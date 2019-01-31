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

const prophet = {};

prophet.takeTurn = (self) => {
  const choices = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
  const choice = choices[Math.floor(Math.random() * choices.length)];
  const target = navigation.startMove(self, choice);
  // self.log("trying to move to " + target);
  return self.move(target.x, target.y);
};

const castle = {};

castle.takeTurn = (self) => {
  if (self.karbonite >= 100) {
    self.log("Building a pilgrim at " + (self.me.x + 1) + "," + (self.me.y + 1));
    self.pilgrimsBuilt++;
    return self.buildUnit(SPECS.PILGRIM, 1, 0);
  }

  //if (self.karbonite > 200) {
  //  return self.buildUnit(SPECS.CRUSADER, 1, 0);
  //}

  return null;
};

const PILGRIM_KARBONITE_CAPACITY = 20;
const PILGRIM_FUEL_CAPACITY = 100;
const PILGRIM_MOVE_SPEED = 4;
const CRUSADER_MOVE_SPEED = 9;
const PROPHET_MOVE_SPEED = 4;

const CASTLE = 0;

const pilgrim = {};

pilgrim.takeTurn = (self) => {
  const bots = self.getVisibleRobots();

  // save important info on the first cycle
  if (self.infant) {
    self.infant = false;
    self.origin = [self.me.x, self.me.y];
    const visibleUnits = bots;
    for (let i = 0; i < visibleUnits.length; i++) {
      if (visibleUnits[i].unit === CASTLE) {
        self.parentCastle = [visibleUnits[i].x, visibleUnits[i].y];
      }
    }
  }

  // check to see if there's a bot that isn't us already on our resource tile
  // if so, we need to pick a new resource tile
  for (let i = 0; i < bots.length; i++) {
    if (bots[i].id !== self.me.id) {
      if (bots[i].x === self.karbTile[0] && bots[i].y === self.karbTile[1]) {
        self.forbiddenResourceTiles.push(self.karbTile);
        self.karbTile = [-1, -1];
      }
      if (bots[i].x === self.fuelTile[0] && bots[i].y === self.fuelTile[1]) {
        self.forbiddenResourceTiles.push(self.fuelTile);
        self.fuelTile = [-1, -1];
      }
    }
  }

  self.log(self.karbTile + " " + self.fuelTile + " forb: " + self.forbiddenResourceTiles);

  // save resource tiles if necessary
  if (self.karbTile[0] === -1 && self.karbTile[1] === -1) {
    self.karbTile = self.getClosestResource(self.karbonite_map);
  }
  if (self.fuelTile[0] === -1 && self.fuelTile[1] === -1) {
    self.fuelTile = self.getClosestResource(self.fuel_map);
  }

  // mine karb if space and on its tile
  if ((self.me.x === self.karbTile[0]) && (self.me.y === self.karbTile[1]) && (self.me.karbonite < PILGRIM_KARBONITE_CAPACITY)) {
    self.log("Mine karb");
    return self.mine();
  }

  // mine fuel if space and on fuel tile
  if ((self.me.x === self.fuelTile[0]) && (self.me.y === self.fuelTile[1]) && (self.me.fuel < PILGRIM_FUEL_CAPACITY)) {
    self.log("Mine fuel");
    return self.mine();
  }

  // move to karb
  if (self.me.karbonite < PILGRIM_KARBONITE_CAPACITY) {
    self.log("Move to karb " + self.karbTile[0] + " " + self.karbTile[1]);
    return self.moveToTarget(self.karbTile[0], self.karbTile[1]);
  }

  // move to fuel
  if (self.me.fuel < PILGRIM_FUEL_CAPACITY) { // move to fuel
    self.log("Move to fuel " + self.fuelTile[0] + " " + self.fuelTile[1]);
    return self.moveToTarget(self.fuelTile[0], self.fuelTile[1]);
  }

  // standing next to castle so wait to give it automatically
  if ((self.me.x >= self.parentCastle[0] - 1) && (self.me.x <= self.parentCastle[0] + 1) && (self.me.y >= self.parentCastle[1] - 1) && (self.me.y <= self.parentCastle[1] + 1)) {
    const dX = self.parentCastle[0] - self.me.x;
    const dY = self.parentCastle[1] - self.me.y;
    self.log("Depositing resources " + self.me.x + " " + self.me.y + "  " + self.parentCastle[0] + " " + self.parentCastle[1] + "  " + dX + " " + dY);
    return self.give(dX, dY, 20, 100);
  }

  // go back home
  self.log("Going home");
  return self.moveToTarget(self.origin[0], self.origin[1]);
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
    this.forbiddenResourceTiles = [];
    this.karbTile = [-1, -1];
    this.fuelTile = [-1, -1];
    this.parentCastle = [-1, -1];
    this.origin = [-1, -1];
    this.infant = true;

    this.pendingRecievedMessages = {};
    this.enemyCastles = [];
    this.myType = undefined;
    this.step = -1;
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

  // move the max distance to the target x and y
  moveToTarget(tX, tY) {
    if ((this.me.x === tX && this.me.y === tY) || (tX === -1) || (tY === -1)) {
      return null;
    }

    const bots = this.getVisibleRobots();
    const terrain = [];

    for (let y = 0; y < this.map.length; y++) {
      const row = [];
      for (let x = 0; x < this.map[y].length; x++) {
        row.push(this.map[y][x]);
      }
      terrain.push(row);
    }

    for (let i = 0; i < bots.length; i++) {
      terrain[bots[i].y][bots[i].x] = false;
    }

    const distances = [];

    for (let y = 0; y < terrain.length; y++) {
      const row = [];
      for (let x = 0; x < terrain[y].length; x++) {
        if (terrain[y][x] === false || terrain[y][x] === 0) { // second case is for testing because true/false arrays are hard to read
          row.push(9999);
        } else {
          const distanceFromTileToTarget = ((x - tX) ** 2 + (y - tY) ** 2);
          const distanceFromTileToStart = ((x - this.me.x) ** 2 + (y - this.me.y) ** 2);
          if (distanceFromTileToStart <= this.speed) {
            row.push(distanceFromTileToTarget);
          } else {
            row.push(9999);
          }
        }
      }
      distances.push(row);
    }

    let bX = 0;
    let bY = 0;
    for (let y = 0; y < distances.length; y++) {
      for (let x = 0; x < distances[y].length; x++) {
        if (distances[y][x] < distances[bY][bX]) {
          bX = x;
          bY = y;
        }
      }
    }

    // no legal movements
    if (distances[bY][bX] === 9999) {
      return null;
    }

    const dX = bX - this.me.x;
    const dY = bY - this.me.y;
    this.log("Moving to: " + bX + " " + bY + " from: " + this.me.x + " " + this.me.y + " target: " + tX + " " + tY + " tdist: " + distances[tY][tX]);

    // if (bX !== this.me.x && bY !== this.me.y) {
    return this.move(dX, dY);
    // }

    //    return null;
  }


  getClosestResource(terrain) {
    const distances = [];

    for (let y = 0; y < terrain.length; y++) {
      const row = [];
      for (let x = 0; x < terrain[y].length; x++) {
        if (terrain[y][x] === false || terrain[y][x] === 0) { // second case is for testing because true/false arrays are hard to read
          row.push(9999);
        } else {
          let forbidden = false;
          for (let i = 0; i < this.forbiddenResourceTiles.length; i++) {
            if (this.forbiddenResourceTiles[i][0] === x && this.forbiddenResourceTiles[i][1] === y) {
              forbidden = true;
            }
          }
          if (forbidden) {
            row.push(9999);
          } else {
            const distanceFromTileToStart = ((x - this.me.x) ** 2 + (y - this.me.y) ** 2) ** 0.5;
            row.push(distanceFromTileToStart);
          }
        }
      }
      distances.push(row);
    }

    let bX = 0;
    let bY = 0;
    for (let y = 0; y < distances.length; y++) {
      for (let x = 0; x < distances[y].length; x++) {
        if (distances[y][x] < distances[bY][bX]) {
          bX = x;
          bY = y;
        }
      }
    }

    // no legal movements
    if (distances[bY][bX] === 9999) {
      return [-1, -1];
    }
    return [bX, bY];
  }
}

var robot = new MyRobot();
