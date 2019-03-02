import SPECS from "./specs.js";
import * as Constants from "./constants.js";

const church = {};

church.takeTurn = (self) => {
  self.step++;

  if (self.infant) {
    self.infant = false;

    if (self.atlas.mapIsHorizontallyMirrored()) {
      if ((self.me.x < self.map.length * 0.5 && self.me.x > self.map.length * 0.25) || (self.me.x > self.map.length * 0.5 && self.me.x < self.map.length * 0.75)) {
        self.frontier = true;
      }
    } else if ((self.me.y < self.map.length * 0.5 && self.me.y > self.map.length * 0.25) || (self.me.y > self.map.length * 0.5 && self.me.y < self.map.length * 0.75)) {
      self.frontier = true;
    }
  }
  /*
    // signal nearby crusaders to attack
    if (self.step % 50 === 0) {
      // select a target by mirroring our location over
      let target = null;
      if (self.atlas.mapIsHorizontallyMirrored()) {
        target = { x: self.map.length - self.me.x, y: self.me.y };
      } else {
        target = { x: self.me.x, y: self.map.length - self.me.y };
      }

      // calculate our signal
      const signal = target.x * 256 + target.y;

      if (self.fuel > 10 ** 2) {
        // signal to everything on the map to target that enemy
        self.log("BROADCAST " + signal + " " + target.x + " " + target.y);
        self.broadcasted = true;
        self.signal(signal, Math.ceil(10 ** 2));
      }
    }
  */

  if (self.me.turn === 1) {
    return self.buildOnRandomEmptyTile(SPECS.PROPHET);
  }

  // priority build pilgrims until there's enough for all resource tiles on the map
  // note that this is halved to account for resources in enemy terrain
  // if pilgrims are killed more will be spawned because of the heartbeat
  if (self.tactician.getNumVisiblePilgrims() < Math.floor(self.atlas.getNumNearbyResources())) {
    if (self.haveResourcesToBuild(SPECS.PILGRIM)) {
      return self.buildOnRandomEmptyTile(SPECS.PILGRIM);
    }
  }

  // build prophets for defense
  if (self.me.turn < 700 && self.haveResourcesToBuild(SPECS.PROPHET) && self.frontier) {
    return self.buildOnRandomEmptyTile(SPECS.PROPHET);
  }

  // or crusaders for health victory in the late game
  if (self.me.turn > 7 && self.haveResourcesToBuild(SPECS.CRUSADER) && self.frontier) {
    return self.buildOnRandomEmptyTile(SPECS.CRUSADER);
  }

  return null;

};

export default church;