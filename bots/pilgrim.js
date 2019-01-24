import { BCAbstractRobot, SPECS } from "battlecode";
import moveTo from "./moveTo.js";

const pilgrim = {};
const SPEED = 4;

pilgrim.takeTurn = (self) => {
  let nearestKarbonite = [1000, 1000];
  for (let i = 0; i < self.karbonite_map.length; i++) {
    for (let j = 0; j < self.karbonite_map[i].length; j++) {
      if (self.karbonite_map[i][j]) {
        if ((i ** 2 + j ** 2) < (nearestKarbonite[0] ** 2 + nearestKarbonite[1] ** 2)) {
          nearestKarbonite = [i, j];
        }
      }
    }
  }
  const step = moveTo(self.me.x, self.me.y, nearestKarbonite[0], nearestKarbonite[1], self.map, 4, self);

  self.log("cur: " + self.me.x + " " + self.me.y);
  self.log("step: " + step);
  self.log("nk: " + nearestKarbonite);
};

export default pilgrim;