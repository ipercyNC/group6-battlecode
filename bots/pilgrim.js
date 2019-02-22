import { BCAbstractRobot, SPECS } from "battlecode";
import * as Constants from "./constants.js";

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

  const base = self.atlas.getVisibleBase();


  // check to see if we should build a church
  // only build a church if there's none nearby and there's a nearby resource patch
  if (base !== null) {
    self.castle = base;
  } else {
    let nearbyPatches = 0;
    for (let i = 0; i < self.resourceTiles.length; i++) {
      const dist = ((self.resourceTiles[i].x - self.me.x) ** 2 + (self.resourceTiles[i].y - self.me.y) ** 2) ** 0.5;
      if (dist < 3) {
        nearbyPatches++;
      }
    }
    if (nearbyPatches >= 2) {
      return self.buildOnRandomEmptyTile(SPECS.CHURCH);
    }
  }

  // mine resource if carrying space and on a relevant tile
  if (self.atlas.tileIsKarbonite(self.me.x, self.me.y) && self.me.karbonite < Constants.PILGRIM_KARBONITE_CAPACITY) {
    self.log("Mine karb");
    return self.harvest();
  }
  if (self.atlas.tileIsFuel(self.me.x, self.me.y) && self.me.fuel < Constants.PILGRIM_FUEL_CAPACITY) {
    self.log("Mine fuel");
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
    if (self.resourceTile.type === Constants.KARBONITE && self.me.karbonite < Constants.PILGRIM_KARBONITE_CAPACITY) {
      self.log("Path to karb " + self.resourceTile.x + " " + self.resourceTile.y);
      self.atlas.calculatePathToTarget(self.resourceTile.x, self.resourceTile.y);
      return self.atlas.continueMovement();
    }

    // move to fuel if we have space
    if (self.resourceTile.type === Constants.FUEL && self.me.fuel < Constants.PILGRIM_FUEL_CAPACITY) {
      self.log("Path to fuel " + self.resourceTile.x + " " + self.resourceTile.y);
      self.atlas.calculatePathToTarget(self.resourceTile.x, self.resourceTile.y);
      return self.atlas.continueMovement();
    }
  }


  // standing next to castle so wait to give it automatically
  if (self.atlas.adjacentToBase(self.me.x, self.me.y)) {
    const dX = self.atlas.base.x - self.me.x;
    const dY = self.atlas.base.y - self.me.y;
    self.log("Depositing resources " + self.me.x + " " + self.me.y + "  " + self.atlas.base.x + " " + self.atlas.base.y + "  " + dX + " " + dY);

    self.infant = true;
    return self.give(dX, dY, self.me.karbonite, self.me.fuel);
  }


  // go back home
  self.log("Going home");
  self.atlas.calculatePathAdjacentToTarget(self.atlas.base.x, self.atlas.base.y);
  return self.atlas.continueMovement();
};

export default pilgrim;
