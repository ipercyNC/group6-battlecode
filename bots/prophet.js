import { BCAbstractRobot, SPECS } from "battlecode";
import navigation from "./navigation.js";

const prophet = {};

prophet.takeTurn = (self) => {
  self.step++;
  const bots = self.getVisibleRobots();
  // get enemy castles
  const e_castles = bots.filter((r) => {
    if (r.unit === SPECS.CASTLE
        && r.team !== self.me.team) {
      return true;
    }
    return false;
  });


  if (e_castles.length > 0 ) {
    var e_castle = e_castles[0];
    var dist = 999999;
    for (let i = 0; i < e_castles.length; i++) {
      // if visible enemy castles in attackable range, then attack it
      if (navigation.attackable(self.me, e_castles[i])) {
        self.log("Attacking Castle");
        return self.attack(e_castles[i].x - self.me.x, e_castles[i].y - self.me.y);
      }
      // otherwise, look for the closest one
      const newDist = navigation.Distance(self.me, e_castle);
      if (newDist < dist) {
        dist = newDist;
        e_castle = e_castles[i];
      }
    }
    // moving to the closest one
    self.log("Moving closer to castle");
    return self.move(navigation.moveToTarget(self.me, e_castle, self.getPassableMap(), self.getVisibleRobotMap()));
  }


  // get our castles
  const o_castles = bots.filter((r) => {
    if (r.unit === SPECS.CASTLE && r.team === self.me.team) {
      return true;
    }
    return false;
  });

  // get enemy robots
  const e_bots = bots.filter((r) => {
    if (r.unit !== SPECS.CASTLE
    && r.team !== self.me.team) {
      return true;
    }
    return false;
  });

  if (e_bots.length > 0 ) {
    var e_bot = e_bots[0];
    var dist = 999999;
    for (let i = 0; i < e_bots.length; i++) {
      // if visible enemy robots in attackable range, then attack it
      if (navigation.attackable(self.me, e_bots[i])) {
        self.log('Attacking enemy');
        return self.attack(e_bots[i].x - self.me.x, e_bots[i].y - self.me.y);
      }
      //otherwise, look for the closest one between our robot and castle
      const newDist = navigation.Distance(self.me, e_bot);
      let dist_Castle = 99999;
      if (o_castles.length > 0) {
        for (let j = 0; j < o_castles.length; j++) {
          const newDist_Castle = navigation.Distance(self.me, o_castles[j]);
          if (newDist + newDist_Castle < dist) {
            dist = newDist;
            dist_Castle = newDist_Castle;
            e_bot = e_bots[i];
          }
        }
      } else if (newDist < dist) {
        dist = newDist;
        e_bot = e_bots[i];
      }
    }
    // moving to the closest one
    self.log("Moving closer to enemy");
    return self.move(navigation.moveToTarget(self.me, e_bot, self.getPassableMap(), self.getVisibleRobotMap()));
  }
  let options = navigation.goDown.filter((d) => {
    return navigation.isPassable(navigation.applyDir(self.me, d), self.getPassableMap(), self.getVisibleRobotMap());
  });
  // otherwise, move far away from the castles
  if (self.direction == "Up") {
    options = navigation.goUp.filter((d) => {
      return navigation.isPassable(navigation.applyDir(self.me, d), self.getPassableMap(), self.getVisibleRobotMap());
    });
  }

  self.log("Moving");
  // check if the robot is at border, change its direction
  if (navigation.getToBorder(self.me)) {
    if (self.direction == "Up") {
      self.direction = "Down";
      options = navigation.goDown.filter((d) => {
          return navigation.isPassable(navigation.applyDir(self.me, d), self.getPassableMap(), self.getVisibleRobotMap());
      });
    } else {
      self.direction = "Up";
      options = navigation.goUp.filter((d) => {
          return navigation.isPassable(navigation.applyDir(self.me, d), self.getPassableMap(), self.getVisibleRobotMap());
      });
    };
  };
  // get random choice number
  const choice = Math.floor(Math.random() * options.length);
  return self.move(options[choice].x, options[choice].y);
};
export default prophet;
