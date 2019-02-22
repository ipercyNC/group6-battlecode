import BinaryHeap from "./binaryHeap.js";
import SPECS from "./specs.js";
import * as Constants from "./constants.js";

// eslint-disable-next-line no-unused-lets
export default class Atlas {
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
  }

  initialize() {
    this.map = this.owner.map;
    this.fuelMap = this.owner.fuel_map;
    this.karbMap = this.owner.karbonite_map;
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
          row.push(Constants.KARBONITE);
          this.resourceTiles.push({
            x,
            y,
            state: Constants.RESOURCE_TILE_READY,
            type: Constants.KARBONITE,
          });
        } else if (this.fuelMap[y][x]) {
          row.push(Constants.FUEL);
          this.resourceTiles.push({
            x,
            y,
            state: Constants.RESOURCE_TILE_READY,
            type: Constants.FUEL,
          });
        } else {
          row.push(Constants.EMPTY);
        }
      }
      this.resourceMap.push(row);
    }
  }

  // must be called every round
  update(robots, robotMap) {
    this.robots = robots;
    this.robotMap = robotMap;
  }

  // update our resource map
  // tiles in vision without robots get set to ready
  // tiles in vision with robots get set to busy
  updateResourceMap() {
    for (let y = 0; y < this.robotMap.length; y++) {
      for (let x = 0; x < this.robotMap[y].length; x++) {
        if (this.resourceMap[y][x].type !== Constants.EMPTY) {
          // find the relevant resource tile
          let index = -1;
          for (let j = 0; j < this.resourceTiles.length; j++) {
            if (this.resourceTiles[j].x === x && this.resourceTiles[j].y === y) {
              index = j;
            }
          }
          if (index >= 0) {
            if (this.robotMap[y][x] === 0 || this.robotMap[y][x] === this.owner.me.id) {
              this.resourceTiles[index].state = Constants.RESOURCE_TILE_READY;
            } else if (this.robotMap[y][x] > 0) {
              this.resourceTiles[index].state = Constants.RESOURCE_TILE_BUSY;
            }
          }
        }
      }
    }
  }

  getBaseWithinRange(range) {
    for (let y = this.owner.me.y - range; y <= this.owner.me.y + range; y++) {
      for (let x = this.owner.me.x - range; x <= this.owner.me.x + range; x++) {
        if (this._coordIsValid(x, y)) {
          if (this.robotMap[y][x] > 0) {
            const bot = this.getRobot(this.robotMap[y][x]);
            if (bot !== null) {
              if (bot.unit === SPECS.CHURCH || bot.unit === SPECS.CASTLE) {
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
        if (this._coordIsValid(x, y) && this.resourceMap[y][x] !== Constants.EMPTY) {
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
        if (this._coordIsValid(x, y) && this.resourceMap[y][x] === Constants.EMPTY) {
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
    const range = SPECS.UNITS[this.owner.me.unit].VISION_RADIUS;
    return this.getBaseWithinRange(range);
  }

  getRobot(id) {
    return this.owner.getRobot(id);
  }

  moveWrapper(dX, dY) {
    this.owner.castleTalk(this.owner.me.unit * 8 + Constants.STATUS_MOVING);
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
      if (this.robots[i].unit === SPECS.CASTLE || this.robots[i].unit === SPECS.CHURCH) {
        this.base = this.robots[i];
      }
    }
  }

  tileIsFuel(x, y) {
    if (this.resourceMap[y][x] === Constants.FUEL) {
      return true;
    }
    return false;
  }

  tileIsKarbonite(x, y) {
    if (this.resourceMap[y][x] === Constants.KARBONITE) {
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

          if (bot !== null && (bot.unit === SPECS.CASTLE || bot.unit === SPECS.CHURCH)) {
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
      if (this.resourceTiles[i].state === Constants.RESOURCE_TILE_READY) {
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
}
