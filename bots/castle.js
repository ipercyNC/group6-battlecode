import { BCAbstractRobot, SPECS } from "battlecode";

const castle = {};

castle.takeTurn = (self) => {
  // get visible robots
  const visible = self.getVisibleRobots();

  // get attackable robots
  const attackable = visible.filter((r) => {
    if (!self.isVisible()) { return false; }
    const dist = (self.me.x - r.x) * (self.me.x - r.x) + (self.me.y - r.y) * (self.me.y - r.y);
    if (self.me.team !== r.team &&
    SPECS.UNITS[self.me.unit].ATTACK_RADIUS[0] <= dist
  && dist <= SPECS.UNITS[self.me.unit].ATTACK_RADIUS[1]) { return true; }
    return false;
  });


  // self.log("castle taking turn");
  if (self.step % 100) {
    // self.log('KNOWN ENEMY CASTLES: ');
    for (let i = 0; i < self.enemyCastles.length; i++) {
      const { x, y } = self.enemyCastles[i];
      self.log(x + "," + y);
    }
  }

  // Attack the first robot if it is Prophet
  if (attackable.length > 0) {
    for (let i = 0; i < attackable.length; i++) {
      const x = attackable[i];
      if (x.unit === SPECS.PROPHET && self.fuel >= 10) {
        return self.attack(x.x - self.me.x, x.y - self.me.y);
      }
    }
    // get the first robot
    const r = attackable[0];
    // attack the first robot if the fuel is higher than 10 and less than 50
    if (self.fuel >= 10 && self.fuel < 50) {
      return self.attack(r.x - self.me.x, r.y - self.me.y);
    }

    if (self.fuel >= 50) {
      return self.buildUnit(SPECS.PROPHET, 1, 0);
    }
  }

  if (self.pilgrimsBuilt < 2 && self.karbonite >= 100) {
    self.log("Building a pilgrim at " + (self.me.x + 1) + "," + (self.me.y + 1));
    self.pilgrimsBuilt++;
    return self.buildUnit(SPECS.PILGRIM, 1, 0);
  }

  if (self.karbonite > 200) {
    return self.buildUnit(SPECS.CRUSADER, 1, 0);
  }

  return null;
};


export default castle;
