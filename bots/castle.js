import { SPECS } from "battlecode";

const castle = {};

castle.takeTurn = (self) => {
  self.step++;

  if (self.haveResourcesToBuild(SPECS.PILGRIM) && Math.random() < 0.33) {
    return self.buildOnRandomEmptyTile(SPECS.PILGRIM);
  }


  if (self.infant) {
    self.infant = false;
    for (let dY = -4; dY <= 4; dY++) {
      for (let dX = -4; dX <= 4; dX++) {
        if (self.atlas._coordIsValid(self.me.x + dX, self.me.y + dY)) {
          if (self.karbonite_map[self.me.y + dY][self.me.x + dX] || self.fuel_map[self.me.y + dY][self.me.x + dX]) {
            self.nNearbyResources++;
          }
        }
      }
    }

    for (let y = 0; y < self.map.length; y++) {
      for (let x = 0; x < self.map.length; x++) {
        if (self.karbonite_map[y][x] || self.fuel_map[y][x]) {
          self.nResources++;
        }
      }
    }
  }

  // update our robots list
  self.robots = self.getVisibleRobots();

  let nCrusaders = 0;
  let nPilgrims = 0;
  for (let i = 0; i < self.robots.length; i++) {
    const data = self.robots[i].castle_talk;
    const unit = Math.floor(data / 8);
    //const state = data % 8;
    if (self.robots[i].unit === SPECS.CRUSADER) {
      nCrusaders++;
    } else if (self.robots[i].unit === SPECS.PILGRIM || unit === SPECS.PILGRIM) {
      nPilgrims++;
    }
  }

  if (!self.broadcasted && nCrusaders >= 5) {
    // pick the radius that is guaranteed to cover the whole map
    const radiuses = [
      ((self.me.x - 0) ** 2 + (self.me.y - 0) ** 2) ** 0.5,
      ((self.me.x - self.map[0].length) ** 2 + (self.me.y - self.map.length) ** 2) ** 0.5,
      ((self.me.x - self.map[0].length) ** 2 + (self.me.y) ** 2) ** 0.5,
      ((self.me.x) ** 2 + (self.me.y - self.map.length) ** 2) ** 0.5,
    ];

    let radius = 0;
    for (let i = 0; i < radiuses.length; i++) {
      if (radiuses[i] > radius) {
        radius = radiuses[i];
      }
    }

    const mirroredHorizontally = self.atlas.mapIsHorizontallyMirrored();

    // select a target by mirroring our location over
    const target = { x: self.me.x, y: self.me.y };

    if (mirroredHorizontally) {
      self.log("Modified x broadcast");
      if (self.me.x > self.map.length / 2) {
        target.x = Math.round(self.me.x - self.map.length / 2);
      } else {
        target.x = Math.round(self.map.length - self.me.x);
      }
    } else if (!mirroredHorizontally) {
      self.log("Modified y broadcast");
      if (self.me.y > self.map.length / 2) {
        target.y = Math.round(self.me.y - self.map.length / 2);
      } else {
        target.y = Math.round(self.map.length - self.me.y);
      }
    }

    // calculate our signal
    const signal = target.x * 256 + target.y;

    if (self.fuel > radius ** 2) {
      // signal to everything on the map to target that enemy
      self.log("BROADCAST " + signal + " " + target.x + " " + target.y);
      self.broadcasted = true;
      self.signal(signal, Math.ceil(radius ** 2));
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

  // priority build pilgrims until there's enough for all resource tiles on the map
  // note that this is halved to account for resources in enemy terrain
  if (nPilgrims < Math.floor(self.nResources / 2)) {
    if (self.haveResourcesToBuild(SPECS.PILGRIM) && Math.random() < 0.33) {
      return self.buildOnRandomEmptyTile(SPECS.PILGRIM);
    }
  }


  // build crusaders if we can
  if (self.haveResourcesToBuild(SPECS.CRUSADER) && Math.random() < 0.33) { // random chance is so one castle doesn't hog all the resources
    return self.buildOnRandomEmptyTile(SPECS.CRUSADER);
  }
};


export default castle;
