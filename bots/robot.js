import { BCAbstractRobot, SPECS } from "battlecode";
import prophet from "./prophet.js";
import castle from "./castle.js";
import pilgrim from "./pilgrim.js";
import crusader from "./crusader.js";
import * as Constants from "./constants.js";
import BinaryHeap from "./binaryHeap.js";
import Atlas from "./atlas.js";


// eslint-disable-next-line no-unused-lets
class MyRobot extends BCAbstractRobot {
  constructor() {
    super();
    this.atlas = null;

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
    this.nResources = 0;

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
    this.enemyCastles = [];
    this.myType = undefined;
    this.pilgrimsBuilt = 0;
    this.speed = -1;
  }

  construct(unit, dX, dY) {
    this.castleTalk(this.me.unit * 8 + Constants.STATUS_BUILDING);
    return this.buildUnit(unit, dX, dY);
  }

  harvest() {
    this.castleTalk(this.me.unit * 8 + Constants.STATUS_MINING);
    return this.mine();
  }

  shoot(dX, dY) {
    this.castleTalk(this.me.unit * 8 + Constants.STATUS_ATTACKING);
    return this.attack(dX, dY);
  }

  turn() {
    if (this.atlas === null) {
      this.atlas = new Atlas(this);
      this.atlas.initialize();
    }

    this.castleTalk(Constants.STATUS_IDLE); // will be overridden later, if necessary
    this.sanityCheck(); // this doesn't work for some reason. maybe it's just a replay bug?
    this.atlas.update(this.getVisibleRobots(), this.getVisibleRobotMap());

    if (this.myType === undefined) {
      switch (this.me.unit) {
        case SPECS.PROPHET:
          this.myType = prophet;
          this.speed = Constants.PROPHET_MOVE_SPEED;
          break;
        case SPECS.CASTLE:
          this.myType = castle;
          this.speed = 0;
          break;
        case SPECS.PILGRIM:
          this.myType = pilgrim;
          this.speed = Constants.PILGRIM_MOVE_SPEED;
          break;
        case SPECS.CRUSADER:
          this.myType = crusader;
          this.speed = Constants.CRUSADER_MOVE_SPEED;
          break;
        case SPECS.CHURCH:
          return null;
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
      this.log("########################################################################");
      this.log("#################                                      #################");
      this.log("#######                                                          #######");
      this.log("####                      !! BUG DETECTED !!                        ####");
      this.log("#######                                                          #######");
      this.log("#################                                      #################");
      this.log("########################################################################");
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

  buildOnRandomEmptyTile(unit) {
    const validTiles = [];
    const botMap = this.getVisibleRobotMap();
    for (let dY = -1; dY <= 1; dY++) {
      for (let dX = -1; dX <= 1; dX++) {
        const x = this.me.x + dX;
        const y = this.me.y + dY;
        if (this.atlas._coordIsValid(x, y)) {
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


}
