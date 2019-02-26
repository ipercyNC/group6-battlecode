import {SPECS } from "battlecode";

const navigation = {};

navigation.dirMove = (self, destination) => {
  // self.log("destx " + destination[0] + "dy " + destination[1]);
  // self.log("selfx " + self.me.x + "selfy " + self.me.y);
  let dx = destination[0] - self.me.x;
  let dy = destination[1] - self.me.y;
  if (dx < 0) {
    dx = -1;
  } else {
    dx = 1;
  }
  if (dy < 0) {
    dy = -1;
  } else {
    dy = 1;
  }
  // self.log("dx " + dx + "dy " + dy);
  return [dx, dy];
};

navigation.basicMove = (self, destination) => {
  // self.log("destx " + destination[0] + "dy " + destination[1]);
  return [destination[0], destination[1]]; // check if enemy robot is in attackable range of our robot
};
// check if enemy robot is in attackable range of our robot
navigation.attackable = (ourRobot, enemyRobot) => {
  const dist = (ourRobot.x - enemyRobot.x) * (ourRobot.x - enemyRobot.x) + (ourRobot.y - enemyRobot.y) * (ourRobot.y - enemyRobot.y);
  const minRange = SPECS.UNITS[ourRobot.unit].ATTACK_RADIUS[0];
  const maxRange = SPECS.UNITS[ourRobot.unit].ATTACK_RADIUS[1];
  if (minRange <= dist && dist <= maxRange) {
    return true;
  }
  return false;
};
//  buildable location
navigation.buildable = [
  { x: 0, y: -1 },
  { x: 1, y: -1 },
  { x: -1, y: -1 },
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 1, y: 1 },
  { x: -1, y: 1 }
];
navigation.goUp = [
  { x: 0, y: 1 },
  { x: 1, y: 1 },
  { x: -1, y: 1 },
  { x: -1, y: 0 },
    { x: 1, y: 0 },
  { x: 0, y: -1 },
  { x: 1, y: -1 },
  { x: -1, y: -1 },

];
navigation.goDown = [
  { x: 0, y: -1 },
  { x: 1, y: -1 },
  { x: -1, y: -1 },
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 1, y: 1 },
  { x: -1, y: 1 },

];
// get new dir
navigation.applyDir = (loc, dir) => {
  return { x: loc.x + dir.x, y: loc.y + dir.y };
};
// check if the robot appoaches borders.
navigation.getToBorder = (robot) => {
  const attackRadius = SPECS.UNITS[robot.unit].ATTACK_RADIUS[1];
  if ((robot.y - attackRadius) < 0) {
    robot.direction = "Down";
    return true;
  }
  if ((robot.y + attackRadius) > 64) {
    robot.direction = "Up";
    return true;
  }
  return false;
}

// move our robot closer to target with in steps, return x_step and y_step
navigation.moveToTarget = (ourRobot, target, fullMap, robotMap) => {
  const ourRobot_loc = { x: ourRobot.x, y: ourRobot.y };
  const target_loc = { x: target.x, y: target.y };

  // get all options can move to target
  let options = navigation.buildable.filter((d) => {
    return navigation.isPassable(navigation.applyDir(ourRobot, d), fullMap, robotMap);
  });
  if (options.length > 0) {
    let dist = 100000;
    let dir = options[0];
    // get the closest loction between target and ourRobot
    for (let i = 0; i < options.length; i++) {
      const newDist = navigation.Distance(navigation.applyDir(ourRobot, options[i]), target);
      if (newDist < dist) {
        dist = newDist;
        dir = options[i];
      }
    }
    return dir;
  }
  return { x: 0, y: 0 };
}
// check if a location is passable
navigation.isPassable = (loc, fullMap, robotMap) => {
  const { x, y } = loc;
  const mapLen = fullMap.length;
  if (x >= mapLen || x < 0) {
    return false;
  }
  if (y >= mapLen || y < 0) {
    return false;
  }
  if (robotMap[y][x] > 0 || !fullMap[y][x]) {
    return false;
  }
  return true;
};
navigation.basicMove = (self, destination) => {
  // self.log("destx " + destination[0] + "dy " + destination[1]);
  return [destination[0], destination[1]];
};
navigation.Distance = (x, y) => {
  return (x.x - y.x) * (x.x - y.x) + (x.y - y.y) * (x.y - y.y);
}

navigation.getClosestResource = (location, resourceMap) => {
  const mapLength = resourceMap.length;
  let closestLoc = null;
  let closestDistance = 999999;
  for (let i = 0; i < mapLength; i++) {
    for (let j = 0; j < mapLength; j++) {
      const tmpDistance = navigation.Distance(location, resourceMap[i][j]);
      if (resourceMap[i][j] && (tmpDistance < closestDistance)) {
        closestDistance = tmpDistance;
        closestLoc = { i, j };
      }
    }
  }
  return closestLoc;
}
export default navigation;
