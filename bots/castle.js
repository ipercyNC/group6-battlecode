import { SPECS } from "battlecode";

const castle = {};

castle.takeTurn = (self) => {
  self.step++;

  if (self.infant) {
    self.infant = false;

    for (let dY = -4; dY <= 4; dY++) {
      for (let dX = -4; dX <= 4; dX++) {
        if (self._coordIsValid(self.me.x + dX, self.me.y + dY)) {
          if (self.karbonite_map[self.me.y + dY][self.me.x + dX] || self.fuel_map[self.me.y + dY][self.me.x + dX]) {
            self.nNearbyResources++;
          }
        }
      }
    }
  }


  // get all robots within range
  const enemiesInRange = self.getVisibleRobots().filter((robot) => {
    const dist = (self.me.x - robot.x) ** 2 + (self.me.y - robot.y) ** 2;
    const minRange = SPECS.UNITS[self.me.unit].ATTACK_RADIUS[0];
    const maxRange = SPECS.UNITS[self.me.unit].ATTACK_RADIUS[1];
    if (self.me.team !== robot.team && dist >= minRange && dist <= maxRange) {
      return true;
    }
    return false;
  });

  // attack enemies in order of prophet > preacher > crusader > pilgrim
  if (enemiesInRange.length > 0 && self.fuel >= 10) {
    // break the list of attackable robots down by unit type
    const enemyRobots = {
      [SPECS.PROPHET]: [],
      [SPECS.PREACHER]: [],
      [SPECS.CRUSADER]: [],
      [SPECS.PILGRIM]: [],
    };

    // split the list up by unit to make it easy to prioritize targets
    for (let i = 0; i < enemiesInRange.length; i++) {
      enemyRobots[enemiesInRange[i].unit].push(enemiesInRange[i]);
    }

    // get the first enemy robot and attack it
    for (const key in enemyRobots) {
      if (enemyRobots[key].length > 0) {
        const dX = enemyRobots[key][0].x - self.me.x;
        const dY = enemyRobots[key][0].y - self.me.y;
        return self.attack(dX, dY);
      }
    }
  }

  // priority build a pilgrim for all of the resources within four tiles of the castle
  if (self.step <= self.nNearbyResources) {
    // return buildOnRandomEmptyTile(SPECS.PROPHET, self);
    return self.buildOnRandomEmptyTile(SPECS.PILGRIM);
  }

  const unit = self.buildCycle[self.buildIndex];
  if (self.haveResourcesToBuild(unit) && Math.random() < 0.33) { // random chance is so one castle doesn't hog all the resources
    self.buildIndex++;
    if (self.buildIndex >= self.buildCycle.length) {
      self.buildIndex = 0;
    }
    return self.buildOnRandomEmptyTile(unit);
  }
};


export default castle;
