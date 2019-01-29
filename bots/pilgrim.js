import { BCAbstractRobot, SPECS } from "battlecode";
import getClosestKarbonite from "./getClosestKarbonite.js";
import nextMoveToDestination from "./nextMoveToDestination.js";

const pilgrim = {};

pilgrim.takeTurn = (self) => {
  self.karboniteTile = getClosestKarbonite(self.me.x, self.me.y, self.karbonite_map);

  //
  if (self.me.x === self.karboniteTile[0] && self.me.y === self.karboniteTile[1]) {
    return self.mine();
  }

  // not at resource tile so move to it
  const target = nextMoveToDestination(self.me.x, self.me.y, self.karboniteTile[0], self.karboniteTile[1], 4, self.map);
  return self.move(target[0] - self.me.x, target[1] - self.me.y);
};

export default pilgrim;