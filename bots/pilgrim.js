import { BCAbstractRobot, SPECS } from "battlecode";
import * as Constants from "./constants.js";

const pilgrim = {};

// gather all of the actual valid resource cells into an array and turn them into objects
// each object has coords and state that change depending on if a robot is using the tile
const resourceMapToArray = (map) => {
  const resourceTiles = [];
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      if (map[y][x]) { // has resource
        resourceTiles.push({ x, y, state: Constants.RESOURCE_TILE_READY });
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
    if (self.fuel >= self.karbonite * Constants.IDEAL_FUEL_TO_KARB_RATIO) {
      self.resource = Constants.KARBONITE;
      self.resourceMap = self.karbonite_map;
    } else {
      self.resource = Constants.FUEL;
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
            self.resourceTiles[index].state = Constants.RESOURCE_TILE_READY;
          } else if (visibleRobotMap[y][x] > 0) {
            self.resourceTiles[index].state = Constants.RESOURCE_TILE_BUSY;
          }
        }
      }
    }
  }

  // if we see a castle, its probably closer to our destination resource tile so save its location
  for (let i = 0; i < bots.length; i++) {
    if (bots[i].unit === Constants.CASTLE) {
      self.castle = [bots[i].x, bots[i].y];
    }
  }

  // mine resource if carrying space and on its tile
  if (self.resourceTile !== -1) {
    if ((self.me.x === self.resourceTiles[self.resourceTile].x) && (self.me.y === self.resourceTiles[self.resourceTile].y)) {
      if (self.resource === Constants.KARBONITE && self.me.karbonite < Constants.PILGRIM_KARBONITE_CAPACITY) {
        //  self.log("Mine karb");
        return self.mine();
      }
      if (self.resource === Constants.FUEL && self.me.fuel < Constants.PILGRIM_FUEL_CAPACITY) {
        //  self.log("Mine fuel");
        return self.mine();
      }
    }
  }

  // pick the nearest available resource
  self.resourceTile = self.getClosestReadyResource(self.resourceTiles);

  if (self.resourceTile !== -1) {
    // move to karb
    if (self.resource === Constants.KARBONITE && self.me.karbonite < Constants.PILGRIM_KARBONITE_CAPACITY) {
      //  self.log("Move to karb " + self.resourceTiles[self.resourceTile].x + " " + self.resourceTiles[self.resourceTile].y);
      return self.sanitizeRet(self.moveToTarget(self.resourceTiles[self.resourceTile].x, self.resourceTiles[self.resourceTile].y));
    }

    // move to fuel
    if (self.resource === Constants.FUEL && self.me.fuel < Constants.PILGRIM_FUEL_CAPACITY) {
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

export default pilgrim;
