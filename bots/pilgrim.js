import { BCAbstractRobot, SPECS } from "battlecode";
import * as Constants from "./constants.js";

const pilgrim = {};

pilgrim.takeTurn = (self) => {
  const bots = self.getVisibleRobots();

  // save important info on the first cycle
  if (self.infant) {
    self.infant = false;
    self.origin = [self.me.x, self.me.y];

    // pick a resource type based on stashes
    if (self.fuel > self.karbonite * 2) {
      self.resource = Constants.KARBONITE;
    } else {
      self.resource = Constants.FUEL;
    }

    // find parent castle
    const visibleUnits = bots;
    for (let i = 0; i < visibleUnits.length; i++) {
      if (visibleUnits[i].unit === Constants.CASTLE) {
        self.parentCastle = [visibleUnits[i].x, visibleUnits[i].y];
      }
    }
  }

  // check to see if there's a bot that isn't us already on our resource tile
  // if so, we need to pick a new resource tile
  for (let i = 0; i < bots.length; i++) {
    if (bots[i].id !== self.me.id) {
      if (bots[i].x === self.resourceTile[0] && bots[i].y === self.resourceTile[1]) {
        self.forbiddenResourceTiles.push(self.resourceTile);
        self.resourceTile = [-1, -1];
      }
    }
  }

  self.log(self.resourceTile + " forb: " + self.forbiddenResourceTiles);

  // save resource tiles if necessary
  if (self.resourceTile[0] === -1 && self.resourceTile[1] === -1) {
    if (self.resource === Constants.KARBONITE) {
      self.resourceTile = self.getClosestResource(self.karbonite_map);
    } else {
      self.resourceTile = self.getClosestResource(self.fuel_map);
    }
  }

  // mine karb if space and on its tile
  if ((self.me.x === self.resourceTile[0]) && (self.me.y === self.resourceTile[1])) {
    if (self.resource === Constants.KARBONITE && self.me.karbonite < Constants.PILGRIM_KARBONITE_CAPACITY) {
      self.log("Mine karb");
      return self.mine();
    }
    if (self.resource === Constants.FUEL && self.me.fuel < Constants.PILGRIM_FUEL_CAPACITY) {
      self.log("Mine fuel");
      return self.mine();
    }
  }

  // move to karb
  if (self.resource === Constants.KARBONITE && self.me.karbonite < Constants.PILGRIM_KARBONITE_CAPACITY) {
    self.log("Move to karb " + self.resourceTile[0] + " " + self.resourceTile[1]);
    return self.moveToTarget(self.resourceTile[0], self.resourceTile[1]);
  }

  // move to fuel
  if (self.resource === Constants.FUEL && self.me.fuel < Constants.PILGRIM_FUEL_CAPACITY) { // move to fuel
    self.log("Move to fuel " + self.resourceTile[0] + " " + self.resourceTile[1]);
    return self.moveToTarget(self.resourceTile[0], self.resourceTile[1]);
  }

  // standing next to castle so wait to give it automatically
  if ((self.me.x >= self.parentCastle[0] - 1) && (self.me.x <= self.parentCastle[0] + 1) && (self.me.y >= self.parentCastle[1] - 1) && (self.me.y <= self.parentCastle[1] + 1)) {
    const dX = self.parentCastle[0] - self.me.x;
    const dY = self.parentCastle[1] - self.me.y;
    self.log("Depositing resources " + self.me.x + " " + self.me.y + "  " + self.parentCastle[0] + " " + self.parentCastle[1] + "  " + dX + " " + dY);

    return self.give(dX, dY, self.me.karbonite, self.me.fuel);
  }

  // go back home
  self.log("Going home");
  return self.moveToTarget(self.origin[0], self.origin[1]);
};

export default pilgrim;