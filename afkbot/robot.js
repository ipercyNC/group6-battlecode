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

    // castle
    this.step = 0;
    this.nNearbyResources = 0;
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

  turn() {
    if (this.moving) {
      return this.continueMovement();
    }

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
      [-1, -1],
      [-1, 0],
      [-1, 1],
      [0, -1],
      [0, 0],
      [0, 1],
      [1, -1],
      [1, 0],
      [1, 1],
    ];
    const opt = opts[Math.floor(Math.random() * opts.length)];
    return this.moveToTarget(tX + opt[0], tY + opt[1]);
  }

  sanitizeRet(ret) {
    if (typeof ret === "string") {
      return null;
    }
    return ret;
  }

  continueMovement() {
    // check if arrived at ultimate goal
    if ((this.me.x === this.destination.x && this.me.y === this.destination.y)) {
      this.moving = false;
      return null;
    }

    // check if arrived at subgoal
    if (this.tempDestination !== null && this.me.x === this.tempDestination.x && this.me.y === this.tempDestination.y) {
      this.tempDestination = null;
    }

    if (this.path === null) {
      this.path = this.astar({ x: this.me.x, y: this.me.y }, this.destination);
    }

    // pick a new subgoal if necessary
    this.log("" + this.path);
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

    // move to the subgoal, if one exists
    if (this.tempDestination !== null) {
      this.log("Move to: " + this.tempDestination.x + ", " + this.tempDestination.y + " : " + this.me.x + ", " + this.me.y + " path:" + JSON.stringify(this.path));
      return this.move(this.tempDestination.x - this.me.x, this.tempDestination.y - this.me.y);
    }
    return null;
  }

  // move to the target x and y, but only one square at a time
  moveToTarget(tX, tY) {
    this.moving = true;
    this.destination = { x: tX, y: tY };
    this.path = this.astar({ x: this.me.x, y: this.me.y }, this.destination);
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


  reconstructPath(cameFrom, current) {
    const totalPath = [current];
    let last = null;
    while (last !== current) {
      current = cameFrom[current.y][current.x];
      totalPath.unshift(current);
      last = current;
    }
    this.log("" + JSON.stringify(totalPath));
    return totalPath;
  }

  heuristicCostEstimate(start, goal) {
    return ((start.x - goal.x) ** 2 + (start.y - goal.y) ** 2) ** 0.5;
  }


  distBetween(start, goal) {
    return ((start.x - goal.x) ** 2 + (start.y - goal.y) ** 2) ** 0.5;
  }

  astar(start, goal) {
    // The set of nodes already evaluated
    const closedSet = [];

    // The set of currently discovered nodes that are not evaluated yet.
    // Initially, only the start node is known.
    const openSet = [start];

    // For each node, which node it can most efficiently be reached from.
    // If a node can be reached from many nodes, cameFrom will eventually contain the
    // most efficient previous step.
    const cameFrom = [];
    for (let y = 0; y < this.map.length; y++) {
      const row = [];
      for (let x = 0; x < this.map[y].length; x++) {
        row.push({ x, y });
        cameFrom.push(row);
      }
    }

    // For each node, the cost of getting from the start node to that node.
    const gScore = [];
    for (let y = 0; y < this.map.length; y++) {
      const row = [];
      for (let x = 0; x < this.map[y].length; x++) {
        row.push(99999);
        gScore.push(row);
      }
    }

    // The cost of going from start to start is zero.
    gScore[start.y][start.x] = 0;

    // For each node, the total cost of getting from the start node to the goal
    // by passing by that node. That value is partly known, partly heuristic.
    const fScore = [];
    for (let y = 0; y < this.map.length; y++) {
      const row = [];
      for (let x = 0; x < this.map[y].length; x++) {
        row.push(99999);
        fScore.push(row);
      }
    }

    // For the first node, that value is completely heuristic.
    fScore[start.y][start.x] = this.heuristicCostEstimate(start, goal);

    while (openSet.length > 0) {
      let current = openSet[0];
      for (let i = 0; i < openSet.length; i++) {
        if (fScore[openSet[i].y][openSet[i].x] < fScore[current.y][current.x]) {
          current = openSet[i];
        }
      }

      if (current.x === goal.x && current.y === goal.y) {
        return this.reconstructPath(cameFrom, current);
      }

      openSet.splice(openSet.findIndex((element) => { return element.x === current.x && element.y === current.y; }), 1);
      closedSet.push(current);
      for (let dY = -1; dY <= 1; dY++) {
        for (let dX = -1; dX <= 1; dX++) {
          const neighbor = { x: (current.x + dX), y: (current.y + dY) };
          if (neighbor.x < 0 || neighbor.x > this.map[0].length - 1 || neighbor.y < 0 || neighbor.y > this.map.length - 1) {
            continue;
          }
          if (this.map[neighbor.y][neighbor.x] === false) { // impassable terrain
            continue;
          }
          if (this.getVisibleRobotMap()[neighbor.y][neighbor.x] > 0) { // impassable terrain
            continue;
          }

          if (closedSet.includes(neighbor)) {
            continue; // Ignore the neighbor which is already evaluated.
          }
          // The distance from start to a neighbor
          const tentativeGScore = gScore[current.y][current.x] + this.distBetween(current, neighbor)

          if (!openSet.includes(neighbor)) { // Discover a new node
            openSet.push(neighbor);
          } else if (tentativeGScore >= gScore[neighbor.y][neighbor.x]) {
            continue;
          }

          // This path is the best until now. Record it!
          cameFrom[neighbor.y][neighbor.x] = current;
          gScore[neighbor.y][neighbor.x] = tentativeGScore;
          fScore[neighbor.y][neighbor.x] = gScore[neighbor.y][neighbor.x] + this.heuristicCostEstimate(neighbor, goal);
        }
      }
    }
  }
}
