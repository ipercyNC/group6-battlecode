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
