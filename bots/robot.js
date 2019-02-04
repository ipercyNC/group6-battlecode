import { BCAbstractRobot, SPECS } from "battlecode";
import prophet from "./prophet.js";
import castle from "./castle.js";
import pilgrim from "./pilgrim.js";
import crusader from "./crusader.js";
import * as Constants from "./constants.js";

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
      return Constants.AT_TARGET;
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
      return Constants.TRAPPED;
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
      if (tiles[i].state === Constants.RESOURCE_TILE_READY) {
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
