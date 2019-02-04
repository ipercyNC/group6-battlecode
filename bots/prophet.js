import { BCAbstractRobot, SPECS } from "battlecode";
import * as Constants from "./constants.js";

const prophet = {};

const getPorcDestination = (self) => {
  let x = self.castle[0];
  let y = self.castle[1];

  const maxWidth = self.map[0].length;

  // this isn't quite a spiral but it's close enough
  for (let i = 1; i < maxWidth; i += 3) { // i is the radius of the spiral
    for (let dY = -i; dY <= i; dY += 3) {
      for (let dX = -i; dX <= i; dX += 3) {
        if ((dX === -i || dX === i) || (dY === -i || dY === i)) {
          x = self.castle[0] + dX;
          y = self.castle[1] + dY;
          if (self._coordIsValid(x, y)) {
            if (self.map[y][x]) { // check that the tile isn't impassable
              if (!self.karbonite_map[y][x] && !self.fuel_map[y][x]) { // don't stand on resource tiles
                let occupied = false;
                const bots = self.getVisibleRobots();
                for (let j = 0; j < bots.length; j++) {
                  if (bots[j].x === x && bots[j].y === y) {
                    occupied = true;
                  }
                }
                if (!occupied) {
                  self.log("Porc Dest: " + x + " " + y);
                  return [x, y];
                }
              }
            }
          }
        }
      }
    }
  }

  return [-1, -1];
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

  if (self.inTransit) {
    if (self.porcDestination[0] !== -1 && self.porcDestination[1] !== -1) {
      const botMap = self.getVisibleRobotMap();
      if (botMap[self.porcDestination[1]][self.porcDestination[0]] > 0) {
        if (botMap[self.porcDestination[1]][self.porcDestination[0]] !== self.me.id) {
          self.porcDestination = getPorcDestination(self);
        } else {
          self.inTransit = false;
        }
      }

      if (self.porcDestination[0] !== -1 && self.porcDestination[1] !== -1) {
        return self.sanitizeRet(self.moveToTarget(self.porcDestination[0], self.porcDestination[1]));
      }
    } else {
      self.porcDestination = getPorcDestination(self);
    }
  }

  return null;
};
export default prophet;
