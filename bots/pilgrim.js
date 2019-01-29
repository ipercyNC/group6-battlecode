import { BCAbstractRobot, SPECS } from "battlecode";
import getClosestKarbonite from "./getClosestKarbonite.js";
import nextMoveToDestination from "./nextMoveToDestination.js";
import * as Constants from "./constants.js";

const pilgrim = {};

pilgrim.takeTurn = (self) => {
  let target = [-1, -1]; // if we move this will hold the dest tile

  self.log(self.me.karbonite);
  if (self.karboniteTile[0] === -1 && self.karboniteTile[1] === -1) {
    self.karboniteTile = getClosestKarbonite(self.me.x, self.me.y, self.karbonite_map);
    const visibleUnits = self.getVisibleRobots();
    for (let i = 0; i < visibleUnits.length; i++) {
      if (visibleUnits[i].unit === Constants.PILGRIM) {
        self.parentCastle = [visibleUnits[i].x, visibleUnits[i].y];
      }
    }
  }

  // full load so go back home;
  if (self.me.karbonite >= Constants.PILGRIM_KARBONITE_CAPACITY) {
    target = nextMoveToDestination(self.me.x, self.me.y, self.parentCastle[0], self.parentCastle[1], Constants.PILGRIM_MOVE_SPEED, self.map);
  } else {
    // standing on karb tile so mine it
    if (self.me.x === self.karboniteTile[0] && self.me.y === self.karboniteTile[1]) {
      return self.mine();
    }

    target = nextMoveToDestination(self.me.x, self.me.y, self.karboniteTile[0], self.karboniteTile[1], Constants.PILGRIM_MOVE_SPEED, self.map);
  }


  // not at resource tile so move to it
  if (target[0] !== -1 && target[1] !== -1) {
    return self.move(target[0] - self.me.x, target[1] - self.me.y);
  }

  return null;
};

export default pilgrim;