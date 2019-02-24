import { BCAbstractRobot, SPECS } from "battlecode";
import * as Constants from "./constants.js";

const crusader = {};


crusader.takeTurn = (self) => {
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

  if (self.phase === Constants.COMBAT_PHASE_SEARCH_AND_DESTROY) {
    if (self.atlas.moving) {
      return self.atlas.continueMovement();
    }

    const tX = Math.round(Math.random() * (self.map.length));
    const tY = Math.round(Math.random() * (self.map.length));
    self.atlas.calculatePathAdjacentToTarget(tX, tY);
  } else {
    // check if we've been signalled to switch to s&d mode
    for (let i = 0; i < bots.length; i++) {
      if (bots[i].team === self.me.team) {
        if (bots[i].signal > 0) {
          self.phase = Constants.COMBAT_PHASE_SEARCH_AND_DESTROY;
          self.atlas.calculatePathAdjacentToTarget(Math.ceil(bots[i].signal / 256), bots[i].signal % 256);
        }
      }
    }
  }

  if (self.atlas.moving) {
    return self.atlas.continueMovement();
  }

  return self.atlas.moveToPorcGrid();
};
export default crusader;