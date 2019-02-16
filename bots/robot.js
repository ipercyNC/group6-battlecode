import { BCAbstractRobot, SPECS } from "battlecode";
import prophet from "./prophet.js";
import castle from "./castle.js";
import pilgrim from "./pilgrim.js";
import crusader from "./crusader.js";
import * as Constants from "./constants.js";
import BinaryHeap from "./binaryHeap.js";

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

    // castle
    this.step = 0;
    this.location = null;
    this.willBuild = false;
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
    this.sanityCheck();
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
      return this.buildUnit(unit, tile.dX, tile.dY);
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
        return this.move(this.tempDestination.x - this.me.x, this.tempDestination.y - this.me.y);
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
