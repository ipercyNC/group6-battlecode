import { BCAbstractRobot, SPECS } from "battlecode";

const castle = {};

castle.takeTurn = (self) => {
  if (self.pilgrimsBuilt < 10 && Math.random() < 0.5) { //} && self.karbonite >= 100) {
    self.log("Building a pilgrim at " + (self.me.x + 1) + "," + (self.me.y + 1));
    self.pilgrimsBuilt++;
    return self.buildUnit(SPECS.PILGRIM, 1, 0);
  }

  //if (self.karbonite > 200) {
  //  return self.buildUnit(SPECS.CRUSADER, 1, 0);
  //}

  return null;
};


export default castle;
