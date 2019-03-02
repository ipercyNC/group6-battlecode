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


const KARBONITE = "KARBONITE";
const FUEL = "FUEL";
const EMPTY = "EMPTY";

const RESOURCE_TILE_BUSY = "BUSY";
const RESOURCE_TILE_READY = "READY";

const STATUS_IDLE = 1; // this starts at 1 to differentiate it from zero, which is no castle talk was sent at all
const STATUS_BUILDING = STATUS_IDLE + 1;
const STATUS_MINING = STATUS_BUILDING + 1;
const STATUS_MOVING = STATUS_MINING + 1;
const STATUS_ATTACKING = STATUS_MOVING + 1;


const COMBAT_PHASE_IDLE = 1;
const COMBAT_PHASE_SEARCH_AND_DESTROY = COMBAT_PHASE_IDLE + 1;

const prophet = {};

prophet.takeTurn = (self) => {
  const bots = self.getVisibleRobots();

  if (self.infant) {
    self.infant = false;
  }

  // find out if there's an enemy to shoot
  // if there is, either attack them or move closer to them
  const enemy = self.tactician.getNearbyEnemy();
  if (enemy !== null) {
    return self.tactician.attackEnemy(enemy);
  }

  if (self.atlas.moving) {
    return self.atlas.continueMovement();
  }

  self.atlas.moveToPorcGrid();
  return self.atlas.continueMovement();
};

var SPECS$1 = {
  COMMUNICATION_BITS: 16,
  CASTLE_TALK_BITS: 8,
  MAX_ROUNDS: 1000,
  TRICKLE_FUEL: 25,
  INITIAL_KARBONITE: 100,
  INITIAL_FUEL: 500,
  MINE_FUEL_COST: 1,
  KARBONITE_YIELD: 2,
  FUEL_YIELD: 10,
  MAX_TRADE: 1024,
  MAX_BOARD_SIZE: 64,
  MAX_ID: 4096,
  CASTLE: 0,
  CHURCH: 1,
  PILGRIM: 2,
  CRUSADER: 3,
  PROPHET: 4,
  PREACHER: 5,
  RED: 0,
  BLUE: 1,
  CHESS_INITIAL: 100,
  CHESS_EXTRA: 20,
  TURN_MAX_TIME: 200,
  MAX_MEMORY: 50000000,

  UNITS: [{
      CONSTRUCTION_KARBONITE: null,
      CONSTRUCTION_FUEL: null,
      KARBONITE_CAPACITY: null,
      FUEL_CAPACITY: null,
      SPEED: 0,
      FUEL_PER_MOVE: null,
      STARTING_HP: 200,
      VISION_RADIUS: 100,
      ATTACK_DAMAGE: 10,
      ATTACK_RADIUS: [1, 64],
      ATTACK_FUEL_COST: 10,
      DAMAGE_SPREAD: 0,
    },
    {
      CONSTRUCTION_KARBONITE: 50,
      CONSTRUCTION_FUEL: 200,
      KARBONITE_CAPACITY: null,
      FUEL_CAPACITY: null,
      SPEED: 0,
      FUEL_PER_MOVE: null,
      STARTING_HP: 100,
      VISION_RADIUS: 100,
      ATTACK_DAMAGE: 0,
      ATTACK_RADIUS: 0,
      ATTACK_FUEL_COST: 0,
      DAMAGE_SPREAD: 0,
    },
    {
      CONSTRUCTION_KARBONITE: 10,
      CONSTRUCTION_FUEL: 50,
      KARBONITE_CAPACITY: 20,
      FUEL_CAPACITY: 100,
      SPEED: 4,
      FUEL_PER_MOVE: 1,
      STARTING_HP: 10,
      VISION_RADIUS: 100,
      ATTACK_DAMAGE: null,
      ATTACK_RADIUS: null,
      ATTACK_FUEL_COST: null,
      DAMAGE_SPREAD: null,
    },
    {
      CONSTRUCTION_KARBONITE: 15,
      CONSTRUCTION_FUEL: 50,
      KARBONITE_CAPACITY: 20,
      FUEL_CAPACITY: 100,
      SPEED: 9,
      FUEL_PER_MOVE: 1,
      STARTING_HP: 40,
      VISION_RADIUS: 49,
      ATTACK_DAMAGE: 10,
      ATTACK_RADIUS: [1, 16],
      ATTACK_FUEL_COST: 10,
      DAMAGE_SPREAD: 0,
    },
    {
      CONSTRUCTION_KARBONITE: 25,
      CONSTRUCTION_FUEL: 50,
      KARBONITE_CAPACITY: 20,
      FUEL_CAPACITY: 100,
      SPEED: 4,
      FUEL_PER_MOVE: 2,
      STARTING_HP: 20,
      VISION_RADIUS: 64,
      ATTACK_DAMAGE: 10,
      ATTACK_RADIUS: [16, 64],
      ATTACK_FUEL_COST: 25,
      DAMAGE_SPREAD: 0,
    },
    {
      CONSTRUCTION_KARBONITE: 30,
      CONSTRUCTION_FUEL: 50,
      KARBONITE_CAPACITY: 20,
      FUEL_CAPACITY: 100,
      SPEED: 4,
      FUEL_PER_MOVE: 3,
      STARTING_HP: 60,
      VISION_RADIUS: 16,
      ATTACK_DAMAGE: 20,
      ATTACK_RADIUS: [1, 16],
      ATTACK_FUEL_COST: 15,
      DAMAGE_SPREAD: 3,
    },
  ],
};

const castle = {};

castle.takeTurn = (self) => {
  if (self.infant) {
    self.infant = false;

    if (self.atlas.mapIsHorizontallyMirrored()) {
      if ((self.me.x < self.map.length * 0.5 && self.me.x > self.map.length * 0.25) || (self.me.x > self.map.length * 0.5 && self.me.x < self.map.length * 0.75)) {
        self.frontier = true;
      }
    } else if ((self.me.y < self.map.length * 0.5 && self.me.y > self.map.length * 0.25) || (self.me.y > self.map.length * 0.5 && self.me.y < self.map.length * 0.75)) {
      self.frontier = true;
    }
  }


  // signal nearby crusaders to attack
  /*
  if (self.me.turn % 50 === 0) {
    // select a target by mirroring our location over
    const target = { x: self.enemyCastles[0].x, y: self.enemyCastles[0].y };

    // calculate our signal
    const signal = target.x * 256 + target.y;

    if (self.fuel > 10 ** 2) {
      // signal to everything on the map to target that enemy
      self.log("BROADCAST " + signal + " " + target.x + " " + target.y);
      self.broadcasted = true;
      self.signal(signal, Math.ceil(10 ** 2));
    }
  }
*/

  // can only transmit 1 coord at a time so self takes a few turns
  if (self.me.turn <= 2) {
    self.network.getCastles(self.me.turn, self.castles);
    return null;
  }

  // gotten a full set of castle coordinates
  if (self.me.turn === 3) {
    // calculate which turn we take
    self.rank = 0;
    for (let i = 0; i < self.castles.length; i++) {
      if (self.atlas.mapIsHorizontallyMirrored() && self.castles[i].x > self.me.x) {
        self.rank++;
      } else if (!self.atlas.mapIsHorizontallyMirrored() && self.castles[i].y > self.me.y) {
        self.rank++;
      }
    }
    self.nCastles = self.castles.length;
    if (self.nCastles === 0) {
      self.nCastles = 1;
    }

    // calculate enemy castle locations by mirroring our castle locations
    for (let i = 0; i < self.castles.length; i++) {
      if (self.atlas.mapIsHorizontallyMirrored()) {
        self.enemyCastles.push({ x: self.map.length - self.castles[i].x, y: self.castles[i].y });
      } else {
        self.enemyCastles.push({ x: self.castles[i].x, y: self.map.length - self.castles[i].y });
      }
    }
  }

  // take turns with fellow castles so nobody monopolizes resources
  if (self.me.turn % (self.nCastles + self.network.getNumChurches()) !== self.rank && self.nCastles > 1) {
    return null;
  }


  const enemy = self.tactician.getNearbyEnemy();
  if (enemy !== null) {
    if (self.tactician.enemyInRange(enemy)) {
      return self.tactician.attackEnemy(enemy);
    }
    return self.buildOnRandomEmptyTile(SPECS$1.CRUSADER);
  }

  // priority build pilgrims until there's enough for all resource tiles on the map
  // note that self is halved to account for resources in enemy terrain
  // if pilgrims are killed more will be spawned because of the heartbeat
  if (self.tactician.getNumVisiblePilgrims() < self.atlas.getNumNearbyResources()) {
    if (self.haveResourcesToBuild(SPECS$1.PILGRIM)) {
      return self.buildOnRandomEmptyTile(SPECS$1.PILGRIM);
    }
  }

  if (self.me.turn % 25 === 0) {
    return self.buildOnRandomEmptyTile(SPECS$1.PILGRIM);
  }

  // build prophets for defense
  if (self.me.turn < 700 && self.haveResourcesToBuild(SPECS$1.PROPHET)) {
    return self.buildOnRandomEmptyTile(SPECS$1.PROPHET);
  }

  // or crusaders for health victory in the late game
  if (self.me.turn > 7 && self.haveResourcesToBuild(SPECS$1.CRUSADER)) {
    return self.buildOnRandomEmptyTile(SPECS$1.CRUSADER);
  }


  return null;
};

const pilgrim = {};

pilgrim.takeTurn = (self) => {
  // save important info on the first cycle of each trip
  if (self.infant) {
    self.infant = false;

    // this will be recalculated each round
    self.resourceTile = self.atlas.getClosestReadyResource(self.resourceTiles);
  }

  self.atlas.saveParentBase();
  self.atlas.updateResourceMap();

  // check if we should build a base
  if (self.atlas.tileIsKarbonite(self.me.x, self.me.y) || self.atlas.tileIsFuel(self.me.x, self.me.y)) {
    if (self.buildBaseLocation === null && self.atlas.getBaseWithinRange(6) === null) {
      self.buildBaseLocation = self.atlas.getOptimalBaseLocation(self.me.x, self.me.y);
    }
  }

  if (self.buildBaseLocation !== null) {
    if (!self.moving) {
      self.atlas.calculatePathAdjacentToTarget(self.buildBaseLocation.x, self.buildBaseLocation.y);
    }

    if (self.moving) {
      return self.atlas.continueMovement();
    }
    const dX = self.buildBaseLocation.x - self.me.x;
    const dY = self.buildBaseLocation.y - self.me.y;
    self.buildBaseLocation = null;
    return self.construct(SPECS.CHURCH, dX, dY);
  }

  // mine resource if carrying space and on a relevant tile
  if (self.atlas.tileIsKarbonite(self.me.x, self.me.y) && self.me.karbonite < PILGRIM_KARBONITE_CAPACITY) {
    // // self.log("Mine karb");
    return self.harvest();
  }
  if (self.atlas.tileIsFuel(self.me.x, self.me.y) && self.me.fuel < PILGRIM_FUEL_CAPACITY) {
    // // self.log("Mine fuel");
    return self.harvest();
  }

  // pick the nearest available resource
  // if it's the same one as our current one just keep moving to it
  // otherwise switch to the new one
  const newResourceTile = self.atlas.getClosestReadyResource();
  if (newResourceTile !== null) {
    if (newResourceTile.x === self.resourceTile.x && newResourceTile.y === self.resourceTile.y) {
      if (self.atlas.moving) {
        return self.atlas.continueMovement();
      }
    } else {
      self.resourceTile = newResourceTile;
    }
  }

  if (self.resourceTile !== null) {
    // move to karb if we have space
    if (self.resourceTile.type === KARBONITE && self.me.karbonite < PILGRIM_KARBONITE_CAPACITY) {
      // // self.log("Path to karb " + self.resourceTile.x + " " + self.resourceTile.y);
      self.atlas.calculatePathToTarget(self.resourceTile.x, self.resourceTile.y);
      return self.atlas.continueMovement();
    }

    // move to fuel if we have space
    if (self.resourceTile.type === FUEL && self.me.fuel < PILGRIM_FUEL_CAPACITY) {
      // self.log("Path to fuel " + self.resourceTile.x + " " + self.resourceTile.y);
      self.atlas.calculatePathToTarget(self.resourceTile.x, self.resourceTile.y);
      return self.atlas.continueMovement();
    }
  }


  // standing next to castle so wait to give it automatically
  if (self.atlas.adjacentToBase(self.me.x, self.me.y)) {
    const dX = self.atlas.base.x - self.me.x;
    const dY = self.atlas.base.y - self.me.y;
    // self.log("Depositing resources " + self.me.x + " " + self.me.y + "  " + self.atlas.base.x + " " + self.atlas.base.y + "  " + dX + " " + dY);

    self.infant = true;
    return self.give(dX, dY, self.me.karbonite, self.me.fuel);
  }

  // go back home
  // self.log("Going home");
  self.atlas.calculatePathAdjacentToTarget(self.atlas.base.x, self.atlas.base.y);
  return self.atlas.continueMovement();
};

const crusader = {};


crusader.takeTurn = (self) => {
  if (self.infant) {
    self.infant = false;
  }

  // find out if there's an enemy to shoot
  // if there is, either attack them or move closer to them
  const enemy = self.tactician.getNearbyEnemy();
  if (enemy !== null) {
    return self.tactician.attackEnemy(enemy);
  }

  if (self.atlas.moving) {
    return self.atlas.continueMovement();
  }

  self.atlas.moveToStashGrid();
  return self.atlas.continueMovement();
};

const church = {};

church.takeTurn = (self) => {
  self.step++;

  if (self.infant) {
    self.infant = false;

    if (self.atlas.mapIsHorizontallyMirrored()) {
      if ((self.me.x < self.map.length * 0.5 && self.me.x > self.map.length * 0.25) || (self.me.x > self.map.length * 0.5 && self.me.x < self.map.length * 0.75)) {
        self.frontier = true;
      }
    } else if ((self.me.y < self.map.length * 0.5 && self.me.y > self.map.length * 0.25) || (self.me.y > self.map.length * 0.5 && self.me.y < self.map.length * 0.75)) {
      self.frontier = true;
    }
  }
  /*
    // signal nearby crusaders to attack
    if (self.step % 50 === 0) {
      // select a target by mirroring our location over
      let target = null;
      if (self.atlas.mapIsHorizontallyMirrored()) {
        target = { x: self.map.length - self.me.x, y: self.me.y };
      } else {
        target = { x: self.me.x, y: self.map.length - self.me.y };
      }

      // calculate our signal
      const signal = target.x * 256 + target.y;

      if (self.fuel > 10 ** 2) {
        // signal to everything on the map to target that enemy
        self.log("BROADCAST " + signal + " " + target.x + " " + target.y);
        self.broadcasted = true;
        self.signal(signal, Math.ceil(10 ** 2));
      }
    }
  */

  if (self.me.turn === 1) {
    return self.buildOnRandomEmptyTile(SPECS$1.PROPHET);
  }

  // priority build pilgrims until there's enough for all resource tiles on the map
  // note that this is halved to account for resources in enemy terrain
  // if pilgrims are killed more will be spawned because of the heartbeat
  if (self.tactician.getNumVisiblePilgrims() < Math.floor(self.atlas.getNumNearbyResources())) {
    if (self.haveResourcesToBuild(SPECS$1.PILGRIM)) {
      return self.buildOnRandomEmptyTile(SPECS$1.PILGRIM);
    }
  }

  // build prophets for defense
  if (self.me.turn < 700 && self.haveResourcesToBuild(SPECS$1.PROPHET) && self.frontier) {
    return self.buildOnRandomEmptyTile(SPECS$1.PROPHET);
  }

  // or crusaders for health victory in the late game
  if (self.me.turn > 7 && self.haveResourcesToBuild(SPECS$1.CRUSADER) && self.frontier) {
    return self.buildOnRandomEmptyTile(SPECS$1.CRUSADER);
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
class Atlas {
  constructor(robot) {
    this.map = null;
    this.fuelMap = null;
    this.karbMap = null;
    this.resourceMap = null;
    this.resourceTiles = null;
    this.owner = robot;

    this.robots = null;
    this.robotMap = null;

    this.moving = false;
    this.destination = null;
    this.path = null;
    this.tempDestination = null;
    this.base = null;
    this.team = null;

    this.stationary = false;
    this.porcDestination = null;
    this.stashDestination = null;
    this.pos = null;

    this.nResources = -1;
  }

  initialize() {
    this.map = this.owner.map;
    this.fuelMap = this.owner.fuel_map;
    this.karbMap = this.owner.karbonite_map;
    this.team = this.owner.me.team;
    this.initializeResources();
  }

  // merge the resource maps and also create a list of the tiles
  initializeResources() {
    this.resourceMap = [];
    this.resourceTiles = [];
    for (let y = 0; y < this.karbMap.length; y++) {
      const row = [];
      for (let x = 0; x < this.karbMap[y].length; x++) {
        if (this.karbMap[y][x]) {
          row.push(KARBONITE);
          this.resourceTiles.push({
            x,
            y,
            state: RESOURCE_TILE_READY,
            type: KARBONITE,
          });
        } else if (this.fuelMap[y][x]) {
          row.push(FUEL);
          this.resourceTiles.push({
            x,
            y,
            state: RESOURCE_TILE_READY,
            type: FUEL,
          });
        } else {
          row.push(EMPTY);
        }
      }
      this.resourceMap.push(row);
    }
  }

  // must be called every round
  update(robots, robotMap) {
    this.robots = robots;
    this.robotMap = robotMap;
    this.pos = {
      x: this.owner.me.x,
      y: this.owner.me.y,
    };
  }

  // update our resource map
  // tiles in vision without robots get set to ready
  // tiles in vision with robots get set to busy
  updateResourceMap() {
    for (let y = 0; y < this.robotMap.length; y++) {
      for (let x = 0; x < this.robotMap[y].length; x++) {
        if (this.resourceMap[y][x].type !== EMPTY) {
          // find the relevant resource tile
          let index = -1;
          for (let j = 0; j < this.resourceTiles.length; j++) {
            if (this.resourceTiles[j].x === x && this.resourceTiles[j].y === y) {
              index = j;
            }
          }
          if (index >= 0) {
            if (this.robotMap[y][x] === 0 || this.robotMap[y][x] === this.owner.me.id) {
              this.resourceTiles[index].state = RESOURCE_TILE_READY;
            } else if (this.robotMap[y][x] > 0) {
              this.resourceTiles[index].state = RESOURCE_TILE_BUSY;
            }
          }
        }
      }
    }
  }

  getNumResources() {
    if (this.nResources === -1) {
      this.nResources = 0;
      for (let y = 0; y < this.map.length; y++) {
        for (let x = 0; x < this.map.length; x++) {
          if (this.karbMap[y][x] || this.fuelMap[y][x]) {
            this.nResources++;
          }
        }
      }
    }
    return this.nResources;
  }

  getNumNearbyResources() {
    let nResources = 0;
    const MAX_RANGE = 5;
    for (let y = this.pos.y - MAX_RANGE; y < this.pos.y + MAX_RANGE; y++) {
      for (let x = this.pos.x - MAX_RANGE; x < this.pos.x + MAX_RANGE; x++) {
        if (this._coordIsValid(x, y)) {
          if (this.karbMap[y][x] || this.fuelMap[y][x]) {
            nResources++;
          }
        }
      }
    }
    return nResources;
  }

  getBaseWithinRange(range) {
    for (let y = this.owner.me.y - range; y <= this.owner.me.y + range; y++) {
      for (let x = this.owner.me.x - range; x <= this.owner.me.x + range; x++) {
        if (this._coordIsValid(x, y)) {
          if (this.robotMap[y][x] > 0) {
            const bot = this.getRobot(this.robotMap[y][x]);
            if (bot !== null) {
              if (bot.unit === SPECS$1.CHURCH || bot.unit === SPECS$1.CASTLE) {
                return bot;
              }
            }
          }
        }
      }
    }
    return null;
  }

  getOptimalBaseLocation(cX, cY) {
    const MAX_RADIUS = 4;
    const cluster = [];

    // group nearby resource tiles into clusters
    for (let y = cY - MAX_RADIUS; y <= cY + MAX_RADIUS; y++) {
      for (let x = cX - MAX_RADIUS; x <= cX + MAX_RADIUS; x++) {
        if (this._coordIsValid(x, y) && this.resourceMap[y][x] !== EMPTY) {
          cluster.push({ x, y });
        }
      }
    }

    // find the best place to build a base for the cluster
    let base = null;

    // find rectangle that contains the cluster
    let x1 = 999;
    let x2 = 0;
    let y1 = 999;
    let y2 = 0;

    for (let i = 0; i < cluster.length; i++) {
      if (cluster[i].x < x1) {
        x1 = cluster[i].x;
      }
      if (cluster[i].x > x2) {
        x2 = cluster[i].x;
      }
      if (cluster[i].y < y1) {
        y1 = cluster[i].y;
      }
      if (cluster[i].y > y2) {
        y2 = cluster[i].y;
      }
    }


    // calculate avg dist from each potential place to all tiles in the cluster
    const potentialBases = [];
    for (let y = y1 - 1; y <= y2 + 1; y++) {
      for (let x = x1 - 1; x <= x2 + 1; x++) {
        if (this._coordIsValid(x, y) && this.resourceMap[y][x] === EMPTY) {
          let sum = 0;
          for (let j = 0; j < cluster.length; j++) {
            sum += ((y - cluster[j].y) ** 2 + (x - cluster[j].x) ** 2) ** 0.5;
          }
          potentialBases.push({ x, y, avgDist: (sum / cluster.length) });
        }
      }
    }

    // pick the place that has the smallest avg dist
    let best = 0;
    for (let j = 0; j < potentialBases.length; j++) {
      if (potentialBases[j].avgDist < potentialBases[best].avgDist) {
        best = j;
      }
    }
    if (potentialBases[best] !== undefined) {
      base = potentialBases[best];
    }

    return base;
  }

  // base means castle or church
  getVisibleBase() {
    const range = SPECS$1.UNITS[this.owner.me.unit].VISION_RADIUS;
    return this.getBaseWithinRange(range);
  }

  getRobot(id) {
    return this.owner.getRobot(id);
  }

  moveWrapper(dX, dY) {
    this.owner.network.transmit(STATUS_MOVING); // this really ought to be refactored
    return this.owner.move(dX, dY);
  }

  mapIsHorizontallyMirrored() {
    for (let y = 0; y < this.map.length; y++) {
      for (let x = 0; x < this.map.length; x++) {
        if (this.map[y][x] !== this.map[y][this.map.length - x - 1]) {
          return false;
        }
      }
    }

    return true;
  }

  saveParentBase() {
    for (let i = 0; i < this.robots.length; i++) {
      if (this.robots[i].unit === SPECS$1.CASTLE || this.robots[i].unit === SPECS$1.CHURCH) {
        if (this.robots[i].team === this.team) {
          this.base = this.robots[i];
        }
      }
    }
  }

  tileIsFuel(x, y) {
    if (this.resourceMap[y][x] === FUEL) {
      return true;
    }
    return false;
  }

  tileIsKarbonite(x, y) {
    if (this.resourceMap[y][x] === KARBONITE) {
      return true;
    }
    return false;
  }

  adjacentToBase(x, y) {
    const maxX = this.map[0].length - 1;
    const maxY = this.map.length - 1;
    const minX = 0;
    const minY = 0;

    for (let dY = -1; dY <= 1; dY++) {
      for (let dX = -1; dX <= 1; dX++) {
        if (x + dX >= minX && x + dX <= maxX && y + dY >= minY && y + dY <= maxY) {
          const bot = this.getRobot(this.robotMap[y + dY][x + dX]);

          if (bot !== null && (bot.unit === SPECS$1.CASTLE || bot.unit === SPECS$1.CHURCH)) {
            return true;
          }
        }
      }
    }

    return false;
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

  calculatePathAdjacentToTarget(tX, tY) {
    // check that we aren't already adjacent
    const dX = this.owner.me.x - tX;
    const dY = this.owner.me.y - tY;
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
        opts[i].dist = ((x - this.owner.me.x) ** 2 + (y - this.owner.me.y) ** 2) ** 0.5;
      }
    }

    let best = 0;
    for (let i = 0; i < opts.length; i++) {
      if (opts[i].dist < opts[best].dist) {
        best = i;
      }
    }


    const opt = opts[best]; // opts[Math.floor(Math.random() * opts.length)];
    return this.calculatePathToTarget(tX + opt.dX, tY + opt.dY);
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
    if (this.owner.me.x === tile.x && this.owner.me.y === tile.y) {
      return false;
    }

    // if impassable or someone is on it, it's blocked
    if (!this.map[tile.y][tile.x] || this.robotMap[tile.y][tile.x] > 0) {
      return true;
    }
    return false;
  }

  recalculatePathIfNecessary() {
    if (this.path === null) {
      this.path = this.search(this.map, [this.owner.me.x, this.owner.me.y], [this.destination.x, this.destination.y], false, this.manhattan);
      if (this.path.length === 0) {
        this.moving = false;
      }
    }
  }

  continueMovement() {
    // check if arrived at ultimate goal
    if (this.owner.me.x === this.destination.x && this.owner.me.y === this.destination.y) {
      //  this.log("Movement over");
      this.moving = false;
      return null;
    }

    // check if arrived at subgoal
    if (this.tempDestination !== null && this.owner.me.x === this.tempDestination.x && this.owner.me.y === this.tempDestination.y) {
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
      if (!this.map[this.tempDestination.y][this.tempDestination.x] || this.robotMap[this.tempDestination.y][this.tempDestination.x] > 0) {
        this.tempDestination = null;
        this.path = null;
        this.recalculatePathIfNecessary();
      } else {
        // move to the subgoal
        // this.log("Move to: [" + this.tempDestination.x + " " + this.tempDestination.y + "] from [" + this.owner.me.x + " " + this.owner.me.y + "] with deltas [" + (this.tempDestination.x - this.owner.me.x) + " " + (this.tempDestination.y - this.owner.me.y) + "]");
        // this.logPath();
        return this.moveWrapper(this.tempDestination.x - this.owner.me.x, this.tempDestination.y - this.owner.me.y);
      }
    }
    return null;
  }

  // move to the target x and y, but only one square at a time
  calculatePathToTarget(tX, tY) {
    //  this.log("Movement begun");
    this.moving = true;
    this.destination = { x: tX, y: tY };
    this.path = this.search(this.map, [this.owner.me.x, this.owner.me.y], [this.destination.x, this.destination.y], false, this.manhattan);
    if (this.path.length === 0) {
      this.moving = false;
    }
  }

  logPath() {
    if (this.path === null) {
      this.owner.log("null");
    } else {
      let str = "";
      for (let i = 0; i < this.path.length; i++) {
        str += "[" + this.path[i].x + " " + this.path[i].y + "]";
        if (i < this.path.length - 1) {
          str += "->";
        }
      }
      this.owner.log(str);
    }
  }

  getClosestReadyResource() {
    let closest = -1;
    let bestDist = 99999;
    for (let i = 0; i < this.resourceTiles.length; i++) {
      if (this.resourceTiles[i].state === RESOURCE_TILE_READY) {
        const dist = (this.resourceTiles[i].x - this.owner.me.x) ** 2 + (this.resourceTiles[i].y - this.owner.me.y) ** 2;
        if (dist < bestDist) {
          closest = i;
          bestDist = dist;
        }
      }
    }

    if (closest === -1) {
      return null;
    }
    return this.resourceTiles[closest];
  }

  // astar helper
  init(map) {
    const grid = [];
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

  // calculatePathToTarget helper, executes astar to find a path
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
    //  this.owner.log("failed attempt start: [" + start.x + " " + start.y + "] end: [" + end.x + " " + end.y + "]");
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


  getPorcDestination() {
    const cX = this.pos.x; // center x
    const cY = this.pos.y; // center y

    const GRID_SPACE = 1;

    // create a map of distances from our castle to available porc tiles
    const botMap = this.robotMap;
    const porcMap = [];
    for (let y = 0; y < botMap.length; y++) {
      const row = [];
      let offset = 0;
      if (y % 2 === 0) {
        offset = 1;
      }
      for (let x = 0; x < botMap[y].length; x++) {
        if ((x - offset) % (GRID_SPACE + 1) === 0) {
          if ((this.tileIsPorced(x, y)) || // can't build porc if there's already porc there
            (this.karbMap[y][x]) || // don't build on karb
            (this.fuelMap[y][x]) || // or fuel
            (!this.map[y][x]) // can't build on a wall
          ) {
            row.push(99999);
          } else if (this.mapIsHorizontallyMirrored()) {
            if (x < this.map.length * 0.25) {
              row.push(99999);
            } else if (x > this.map.length * 0.75) {
              row.push(99999);
            } else {
              row.push((x - cX) ** 2 + (y - cY) ** 2);
            }
          } else if (!this.mapIsHorizontallyMirrored()) {
            if (y < this.map.length * 0.25) {
              row.push(99999);
            } else if (y > this.map.length * 0.75) {
              row.push(99999);
            } else {
              row.push((x - cX) ** 2 + (y - cY) ** 2);
            }
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
  }

  getStashDestination() {
    const cX = this.pos.x; // center x
    const cY = this.pos.y; // center y

    const GRID_SPACE = 1;

    // create a map of distances from our castle to available porc tiles
    const botMap = this.robotMap;
    const porcMap = [];
    for (let y = 0; y < botMap.length; y++) {
      const row = [];
      let offset = 0;
      if (y % 2 === 0) {
        offset = 1;
      }
      for (let x = 0; x < botMap[y].length; x++) {
        if ((x - offset) % (GRID_SPACE + 1) === 0) {
          if ((this.tileIsPorced(x, y)) || // can't build porc if there's already porc there
            (this.karbMap[y][x]) || // don't build on karb
            (this.fuelMap[y][x]) || // or fuel
            (!this.map[y][x]) // can't build on a wall
          ) {
            row.push(99999);
          } else if (this.mapIsHorizontallyMirrored()) {
            if (x > this.map.length * 0.25 && x < this.map.length * 0.75) { // stash only on the far left or far right x axis
              row.push(99999);
            } else {
              row.push((x - cX) ** 2 + (y - cY) ** 2);
            }
          } else if (!this.mapIsHorizontallyMirrored()) {
            if (y > this.map.length * 0.25 && y < this.map.length * 0.75) { // stash only on the far top or far bottom y axis
              row.push(99999);
            } else {
              row.push((x - cX) ** 2 + (y - cY) ** 2);
            }
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
  }

  tileIsPorced(x, y) {
    // don't porc next to bases cuz they'll get walled in
    if (this.adjacentToBase(x, y)) {
      return true;
    }


    const botMap = this.robotMap;
    if (botMap[y][x] > 0) {
      const bot = this.getRobot(botMap[y][x]).unit;
      if (bot === SPECS$1.CRUSADER || bot === SPECS$1.PROPHET || bot === SPECS$1.CASTLE || bot === SPECS$1.CHURCH) {
        return true;
      }
    }

    return false;
  }


  moveToPorcGrid() {
    if (!this.stationary) {
      if (this.porcDestination === null) {
        this.porcDestination = this.getPorcDestination();
      }
      if (this.porcDestination[0] !== -1 && this.porcDestination[1] !== -1) {
        // if we're at our dest then stop moving
        // if someone got there first then pick a new dest
        if (this.robotMap[this.porcDestination[1]][this.porcDestination[0]] > 0) {
          if (this.pos.x === this.porcDestination[0] && this.pos.y === this.porcDestination[1]) {
            this.stationary = true;
          } else if (this.tileIsPorced(this.porcDestination[0], this.porcDestination[1])) {
            this.porcDestination = this.getPorcDestination();
            this.moving = false;
          }
        }

        if (this.moving) {
          return this.continueMovement();
        }
        if (this.porcDestination[0] !== -1 && this.porcDestination[1] !== -1) {
          this.calculatePathToTarget(this.porcDestination[0], this.porcDestination[1]);
          return this.continueMovement();
        }
      }
    }
    return null;
  }

  moveToStashGrid() {
    if (!this.stationary) {
      if (this.stashDestination === null) {
        this.stashDestination = this.getStashDestination();
      }
      if (this.stashDestination[0] !== -1 && this.stashDestination[1] !== -1) {
        // if we're at our dest then stop moving
        // if someone got there first then pick a new dest
        if (this.robotMap[this.stashDestination[1]][this.stashDestination[0]] > 0) {
          if (this.pos.x === this.stashDestination[0] && this.pos.y === this.stashDestination[1]) {
            this.stationary = true;
          } else if (this.tileIsPorced(this.stashDestination[0], this.stashDestination[1])) {
            this.stashDestination = this.getStashDestination();
            this.moving = false;
          }
        }

        if (this.moving) {
          return this.continueMovement();
        }
        if (this.stashDestination[0] !== -1 && this.stashDestination[1] !== -1) {
          this.calculatePathToTarget(this.stashDestination[0], this.stashDestination[1]);
          return this.continueMovement();
        }
      }
    }
    return null;
  }


}

// eslint-disable-next-line no-unused-lets
class Tactician {
  constructor(owner) {
    this.robots = null;
    this.robotMap = null;
    this.owner = owner;
    this.curPos = null;
    this.unit = null;
    this.team = null;
    this.fuel = null;
    this.atlas = null;


    this.target = null;
    this.stage = COMBAT_PHASE_IDLE;
  }

  update(robots, robotMap) {
    this.robots = robots;
    this.robotMap = robotMap;
    this.pos = {
      x: this.owner.me.x,
      y: this.owner.me.y,
    };
    this.fuel = this.owner.fuel;
    this.unit = this.owner.me.unit;
    this.team = this.owner.me.team;
    this.atlas = this.owner.atlas;
  }

  initialize() {
    this.update(this.owner.getVisibleRobots(), this.owner.getVisibleRobotMap());
  }

  activate(target) {
    this.stage = COMBAT_PHASE_SEARCH_AND_DESTROY;
    this.target = target;
  }

  getNumVisiblePilgrims() {
    return this.robots.filter((robot) => {
      if (this.team === robot.team && robot.unit === SPECS$1.PILGRIM && robot.x !== undefined) {
        return true;
      }
      return false;
    }).length;
  }

  getNumVisibleProphets() {
    return this.robots.filter((robot) => {
      if (this.team === robot.team && robot.unit === SPECS$1.PROPHET) {
        return true;
      }
      return false;
    }).length;
  }

  getNearbyEnemies() {
    // get all robots within range
    return this.robots.filter((robot) => {
      const dist = (this.pos.x - robot.x) ** 2 + (this.pos.y - robot.y) ** 2;
      const maxRange = SPECS$1.UNITS[this.unit].VISION_RADIUS;
      if (this.team !== robot.team && dist <= maxRange) {
        return true;
      }
      return false;
    });
  }

  getNearbyEnemy() {
    const enemies = this.getNearbyEnemies();
    // attack enemies in order of prophet > preacher > crusader > pilgrim
    if (enemies.length > 0 && this.fuel >= 10) {
      // break the list of attackable robots down by unit type
      const enemyRobots = {
        [SPECS$1.PROPHET]: [],
        [SPECS$1.PREACHER]: [],
        [SPECS$1.CRUSADER]: [],
        [SPECS$1.PILGRIM]: [],
        [SPECS$1.CASTLE]: [],
        [SPECS$1.CHURCH]: [],
      };

      // split the list up by unit to make it easy to prioritize targets
      for (let i = 0; i < enemies.length; i++) {
        enemyRobots[enemies[i].unit].push(enemies[i]);
      }

      // get the first enemy robot
      for (const key in enemyRobots) {
        if (enemyRobots[key].length > 0) {
          return enemyRobots[key][0];
        }
      }
    }
    return null;
  }

  enemyInRange(enemy) {
    const dist = ((enemy.x - this.pos.x) ** 2 + (enemy.y - this.pos.y) ** 2);

    if (dist >= SPECS$1.UNITS[this.unit].ATTACK_RADIUS[0] && dist <= SPECS$1.UNITS[this.unit].ATTACK_RADIUS[1]) {
      return true;
    }
    return false;
  }

  // only attack if not on the same team
  // if out of range, move closer
  attackEnemy(enemy) {
    const dX = enemy.x - this.pos.x;
    const dY = enemy.y - this.pos.y;
    const dist = (dX ** 2 + dY ** 2);

    if (this.team !== enemy.team) {
      if (dist >= SPECS$1.UNITS[this.unit].ATTACK_RADIUS[0] && dist <= SPECS$1.UNITS[this.unit].ATTACK_RADIUS[1]) {
        return this.owner.attack(dX, dY);
      }

      this.atlas.calculatePathAdjacentToTarget(enemy.x, enemy.y);
      return this.atlas.continueMovement();
    }
    return null;
  }
}

// eslint-disable-next-line no-unused-lets
class Network {
  constructor(owner) {
    this.robots = null;
    this.owner = owner;

    this.sentSync = false;
    this.units = [];
  }

  update() {
    this.transmit(STATUS_IDLE);
    this.robots = this.owner.getVisibleRobots();
    this.countRobots();
  }

  transmit(value) {
    this.owner.castleTalk(this.owner.me.unit * 32 + value);
  }

  syncCastles() {
    if (!this.sentSync) {
      this.transmit(this.owner.me.id % 32);
      this.sentSync = true;
    } else {
      let rank = 0;
      for (let i = 0; i < this.units[SPECS$1.CASTLE].length; i++) {
        const state = this.units[SPECS$1.CASTLE][i];

        if (this.owner.me.id % 32 > state) {
          rank++;
        }
      }
      return rank;
    }
    return null;
  }

  getCastles(step, castles) {
    const transmitX = Math.floor(this.owner.me.x / (this.owner.map.length / 4));
    const transmitY = Math.floor(this.owner.me.y / (this.owner.map.length / 4));
    this.transmit(transmitX * 4 + transmitY);

    let index = 0;
    for (let i = 0; i < this.units[SPECS$1.CASTLE].length; i++) {
      const data = this.units[SPECS$1.CASTLE][i];
      const x = Math.round(Math.floor(data / 4) * (this.owner.map.length / 4) + (this.owner.map.length / 8));
      const y = Math.round(data % 4 * (this.owner.map.length / 4) + (this.owner.map.length / 8));

      if (castles[index] === undefined) {
        castles.push({ x, y });
        index++;
      }
    }
  }

  countRobots() {
    this.units = [];
    for (let i = 0; i < 6; i++) {
      this.units.push([]);
    }

    for (let i = 0; i < this.robots.length; i++) {
      const data = this.robots[i].castle_talk;
      if (data !== undefined && data !== 0) { // if it's zero then the robot is an infant and hasn't transmitted anything
        const unit = Math.floor(data / 32);
        const state = data % 32;
        this.units[unit].push(state);
      }
    }
  }

  getNumCastles() {
    return this.units[SPECS$1.CASTLE].length;
  }

  getNumCrusaders() {
    return this.units[SPECS$1.CRUSADER].length;
  }

  getNumPilgrims() {
    return this.units[SPECS$1.PILGRIM].length;
  }

  getNumPreachers() {
    return this.units[SPECS$1.PREACHER].length;
  }

  getNumProphets() {
    return this.units[SPECS$1.PROPHET].length;
  }

  getNumChurches() {
    return this.units[SPECS$1.CHURCH].length;
  }


  initialize() {
    this.update(this.owner.getVisibleRobots());
  }


}

// eslint-disable-next-line no-unused-lets
class MyRobot extends BCAbstractRobot {
  constructor() {
    super();
    this.atlas = null;
    this.tactician = null;
    this.network = null;

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
    this.buildBaseLocation = null;

    // prophet
    this.porcDestination = [-1, -1];
    this.inTransit = true;

    // crusader
    this.stashDest = [-1, -1];
    this.phase = COMBAT_PHASE_IDLE;
    this.attackDest = [-1, -1];

    // castle
    this.step = 0;
    this.location = null;
    this.willBuild = false;
    this.nNearbyResources = 0;
    this.nResources = 0;
    this.turnsToSkip = 0;
    this.rank = null;
    this.enemyCastles = [];
    this.castles = [];
    this.nCastles = 0;

    this.robots = [];
    this.broadcasted = false;
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
    this.myType = undefined;
    this.pilgrimsBuilt = 0;
    this.speed = -1;
    this.frontier = false;
  }

  construct(unit, dX, dY) {
    if (dX < -1 || dX > 1 || dY < -1 || dY > 1) {
      return null;
    }

    if (unit === SPECS.CHURCH) {
      if (
        this.karbonite >= SPECS.UNITS[unit].CONSTRUCTION_KARBONITE &&
        this.fuel >= SPECS.UNITS[unit].CONSTRUCTION_FUEL
      ) {
        if (this.me.unit !== SPECS.CASTLE) {
          this.network.transmit(STATUS_BUILDING);
        }
        return this.buildUnit(unit, dX, dY);
      }
    } else if (
      this.karbonite >= SPECS.UNITS[unit].CONSTRUCTION_KARBONITE + 50 &&
      this.fuel >= SPECS.UNITS[unit].CONSTRUCTION_FUEL + 200
    ) {
      if (this.me.unit !== SPECS.CASTLE) {
        this.network.transmit(STATUS_BUILDING);
      }
      return this.buildUnit(unit, dX, dY);
    }
    return null;
  }

  harvest() {
    if (this.me.unit !== SPECS.CASTLE) {
      this.network.transmit(STATUS_MINING);
    }
    return this.mine();
  }

  shoot(dX, dY) {
    if (this.me.unit !== SPECS.CASTLE) {
      this.network.transmit(STATUS_ATTACKING);
    }
    return this.attack(dX, dY);
  }

  turn() {
    if (this.atlas === null) {
      this.atlas = new Atlas(this);
      this.atlas.initialize();
    }
    if (this.tactician === null) {
      this.tactician = new Tactician(this);
      this.tactician.initialize();
    }
    if (this.network === null) {
      this.network = new Network(this);
      this.network.initialize();
    }

    this.sanityCheck(); // this doesn't work for some reason. maybe it's just a replay bug?
    this.atlas.update(this.getVisibleRobots(), this.getVisibleRobotMap());
    this.tactician.update(this.getVisibleRobots(), this.getVisibleRobotMap());
    this.network.update();





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
        case SPECS.CHURCH:
          this.myType = church;
          break;
        default:
          this.log("Unknown unit type " + this.me.unit);
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
    if (
      this.me.x < 0 ||
      this.me.y < 0 ||
      this.me.y >= this.map.length ||
      this.me.x >= this.map[0].length
    ) {
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
      this.log(
        "########################################################################"
      );
      this.log(
        "#################                                      #################"
      );
      this.log(
        "#######                                                          #######"
      );
      this.log(
        "####                      !! BUG DETECTED !!                        ####"
      );
      this.log(
        "#######                                                          #######"
      );
      this.log(
        "#################                                      #################"
      );
      this.log(
        "########################################################################"
      );
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
    if (
      this.karbonite >= SPECS.UNITS[unit].CONSTRUCTION_KARBONITE + 50 &&
      this.fuel >= SPECS.UNITS[unit].CONSTRUCTION_FUEL + 200
    ) {
      return true;
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
        if (this.atlas._coordIsValid(x, y)) {
          if (
            this.map[y][x] &&
            botMap[y][x] === 0 &&
            !this.fuel_map[y][x] &&
            !this.karbonite_map[y][x]
          ) {
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
}
var robot = new MyRobot();
