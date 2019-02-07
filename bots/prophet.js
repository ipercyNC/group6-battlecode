import { BCAbstractRobot, SPECS } from "battlecode";
import * as Constants from "./constants.js";

const prophet = {};

const tileIsPorced = (x, y, self) => {
  const botMap = self.getVisibleRobotMap();
  if (botMap[y][x] > 0) {
    const bot = self.getRobot(botMap[y][x]).unit;
    if (bot === SPECS.PROPHET || bot === SPECS.CASTLE || bot === SPECS.CHURCH) {
      return true;
    }
  }

  return false;
};

const getPorcDestination = (self) => {
  const cX = self.me.x; // center x
  const cY = self.me.y; // center y

  const GRID_SPACE = 1;

  // create a map of distances from our castle to available porc tiles
  const botMap = self.getVisibleRobotMap();
  const porcMap = [];
  for (let y = 0; y < botMap.length; y++) {
    const row = [];
    for (let x = 0; x < botMap[y].length; x++) {
      if (x % (GRID_SPACE + 1) === 0 && y % (GRID_SPACE + 1) === 0) {
        if ((tileIsPorced(x, y, self)) || // can't build porc if there's already porc there
          (self.karbonite_map[y][x]) || // don't build on karb
          (self.fuel_map[y][x]) || // or fuel
          (!self.map[y][x]) // can't build on a wall
        ) {
          row.push(99999);
        } else {
          row.push((x - cX) ** 2 + (y - cY) ** 2);
        }
      } else {
        row.push(99999);
      }
    }
    porcMap.push(row);
  }

  // pick the closest open tile
  let bX = 0;
  let bY = 0;
  for (let y = 0; y < porcMap.length; y++) {
    for (let x = 0; x < porcMap[y].length; x++) {
      if (porcMap[y][x] < porcMap[bY][bX]) {
        bX = x;
        bY = y;
      }
    }
  }

  return [bX, bY];
};

prophet.takeTurn = (self) => {
  const bots = self.getVisibleRobots();

  if (self.infant) {
    self.infant = false;

    // save the first castle we see as our porc center to align the grid
    for (let i = 0; i < bots.length; i++) {
      if (bots[i].unit === SPECS.CASTLE) {
        self.castle = [bots[i].x, bots[i].y];
      }
    }

    self.porcDestination = getPorcDestination(self);
  }

  for (let i = 0; i < bots.length; i++) {
    if (bots[i].team !== self.me.team) {
      if (((self.me.x - bots[i].x) ** 2 + (self.me.y - bots[i].y) ** 2) <= SPECS.UNITS[SPECS.PROPHET].ATTACK_RADIUS) {
        return self.attack(bots[i].x - self.me.x, bots[i].y - self.me.y);
      }
    }
  }

  if (self.inTransit) {
    if (self.porcDestination[0] !== -1 && self.porcDestination[1] !== -1) {
      // if we're at our dest then stop moving
      // if someone got there first then pick a new dest
      const botMap = self.getVisibleRobotMap();
      if (botMap[self.porcDestination[1]][self.porcDestination[0]] > 0) {
        if (self.me.x === self.porcDestination[0] && self.me.y === self.porcDestination[1]) {
          self.inTransit = false;
        } else if (tileIsPorced(self.porcDestination[0], self.porcDestination[1], self)) {
          self.porcDestination = getPorcDestination(self);
        }
      }

      if (self.porcDestination[0] !== -1 && self.porcDestination[1] !== -1) {
        return self.sanitizeRet(self.moveToTarget(self.porcDestination[0], self.porcDestination[1]));
      }
    }
  }

  return null;
};
export default prophet;