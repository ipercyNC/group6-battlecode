import { SPECS } from "battlecode";

const haveResourcesToBuild = (unit, self) => {
  if (self.karbonite >= SPECS.UNITS[unit].CONSTRUCTION_KARBONITE && self.fuel >= SPECS.UNITS[unit].CONSTRUCTION_FUEL) {
    return true;
  }
  return false;
};

const buildOnRandomEmptyTile = (unit, self) => {
  if (haveResourcesToBuild(unit, self)) {
    const validTiles = [];
    const botMap = self.getVisibleRobotMap();
    for (let dY = -1; dY <= 1; dY++) {
      for (let dX = -1; dX <= 1; dX++) {
        const x = self.me.x + dX;
        const y = self.me.y + dY;
        if (self._coordIsValid(x, y)) {
          if (self.map[y][x] && botMap[y][x] === 0) {
            validTiles.push({ dX, dY });
          }
        }
      }
    }

    const tile = validTiles[Math.floor(Math.random() * validTiles.length)];
    if (tile !== undefined) {
      return self.buildUnit(unit, tile.dX, tile.dY);
    }
  }
  return null;
};


const castle = {};

castle.takeTurn = (self) => {
  self.step++;

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

  // build a pilgrim for the first two turns
  if (self.step <= 2) {
    return buildOnRandomEmptyTile(SPECS.PILGRIM, self);
  }

  const unit = self.buildCycle[self.buildIndex];
  if (haveResourcesToBuild(unit, self) && Math.random() < 0.33) { // random chance is so one castle doesn't hog all the resources
    self.buildIndex++;
    if (self.buildIndex >= self.buildCycle.length) {
      self.buildIndex = 0;
    }
    return buildOnRandomEmptyTile(unit, self);
  }
};


export default castle;
