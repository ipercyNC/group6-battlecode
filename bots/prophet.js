import { BCAbstractRobot, SPECS } from "battlecode";
import * as Constants from "./constants.js";

const prophet = {};

prophet.takeTurn = (self) => {
  const bots = self.getVisibleRobots();

  if (self.infant) {
    self.infant = false;
  }

  // find out if there's an enemy to shoot
  // if there is, either attack them or move closer to them
  const enemy = self.tactician.getNearbyEnemy();
  if (enemy !== null) {
    return self.tactician.attackEnemy(enemy);
  }

  if (self.atlas.moving) {
    return self.atlas.continueMovement();
  }

  self.atlas.moveToPorcGrid();
  return self.atlas.continueMovement();
};
export default prophet;