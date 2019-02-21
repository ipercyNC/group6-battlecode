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


  // mine resource if carrying space and on its tile
  if (self.resourceTile !== -1) {
    if ((self.me.x === self.resourceTiles[self.resourceTile].x) && (self.me.y === self.resourceTiles[self.resourceTile].y)) {
      if (self.resourceTiles[self.resourceTile].type === Constants.KARBONITE && self.me.karbonite < Constants.PILGRIM_KARBONITE_CAPACITY) {
        //  self.log("Mine karb");
        return self.harvest();
      }
      if (self.resourceTiles[self.resourceTile].type === Constants.FUEL && self.me.fuel < Constants.PILGRIM_FUEL_CAPACITY) {
        //  self.log("Mine fuel");
        return self.harvest();
      }
    }
  }

  // pick the nearest available resource
  // if it's the same one as our current one just keep moving to it
  // otherwise switch to the new one
  const newResourceTile = self.atlas.getClosestReadyResource(self.resourceTiles);
  if (newResourceTile !== -1) {
    if (self.resourceTiles[newResourceTile].x === self.resourceTiles[self.resourceTile].x && self.resourceTiles[newResourceTile].y === self.resourceTiles[self.resourceTile].y) {
      if (self.moving) {
        return self.atlas.continueMovement();
      }
    } else {
      self.resourceTile = newResourceTile;
    }
  }

  if (self.resourceTile !== -1) {
    // move to karb
    if (self.resourceTiles[self.resourceTile].type === Constants.KARBONITE && self.me.karbonite < Constants.PILGRIM_KARBONITE_CAPACITY) {
      //  self.log("Move to karb " + self.resourceTiles[self.resourceTile].x + " " + self.resourceTiles[self.resourceTile].y);
      return self.atlas.moveToTarget(self.resourceTiles[self.resourceTile].x, self.resourceTiles[self.resourceTile].y);
    }

    // move to fuel
    if (self.resourceTiles[self.resourceTile].type === Constants.FUEL && self.me.fuel < Constants.PILGRIM_FUEL_CAPACITY) {
      //  self.log("Move to fuel " + self.resourceTiles[self.resourceTile].x + " " + self.resourceTiles[self.resourceTile].y);
      return self.atlas.moveToTarget(self.resourceTiles[self.resourceTile].x, self.resourceTiles[self.resourceTile].y);
    }
  }


  // standing next to castle so wait to give it automatically
  if ((self.me.x >= self.castle[0] - 1) && (self.me.x <= self.castle[0] + 1) && (self.me.y >= self.castle[1] - 1) && (self.me.y <= self.castle[1] + 1)) {
    const dX = self.castle[0] - self.me.x;
    const dY = self.castle[1] - self.me.y;
    // self.log("Depositing resources " + self.me.x + " " + self.me.y + "  " + self.castle[0] + " " + self.castle[1] + "  " + dX + " " + dY);

    self.infant = true;
    return self.give(dX, dY, self.me.karbonite, self.me.fuel);
  }

  // go back home
  // self.log("Going home");
  self.atlas.moveAdjacentToTarget(self.castle[0], self.castle[1]);

  return null;
};

export default pilgrim;