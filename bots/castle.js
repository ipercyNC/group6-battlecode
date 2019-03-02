import SPECS from "./specs.js";
import * as Constants from "./constants.js";

const castle = {};

castle.takeTurn = (self) => {
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


  // signal nearby crusaders to attack
  /*
  if (self.me.turn % 50 === 0) {
    // select a target by mirroring our location over
    const target = { x: self.enemyCastles[0].x, y: self.enemyCastles[0].y };

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

  // can only transmit 1 coord at a time so self takes a few turns
  if (self.me.turn <= 2) {
    self.network.getCastles(self.me.turn, self.castles);
    return null;
  }

  // gotten a full set of castle coordinates
  if (self.me.turn === 3) {
    // calculate which turn we take
    self.rank = 0;
    for (let i = 0; i < self.castles.length; i++) {
      if (self.atlas.mapIsHorizontallyMirrored() && self.castles[i].x > self.me.x) {
        self.rank++;
      } else if (!self.atlas.mapIsHorizontallyMirrored() && self.castles[i].y > self.me.y) {
        self.rank++;
      }
    }
    self.nCastles = self.castles.length;
    if (self.nCastles === 0) {
      self.nCastles = 1;
    }

    // calculate enemy castle locations by mirroring our castle locations
    for (let i = 0; i < self.castles.length; i++) {
      if (self.atlas.mapIsHorizontallyMirrored()) {
        self.enemyCastles.push({ x: self.map.length - self.castles[i].x, y: self.castles[i].y });
      } else {
        self.enemyCastles.push({ x: self.castles[i].x, y: self.map.length - self.castles[i].y });
      }
    }
  }

  // take turns with fellow castles so nobody monopolizes resources
  if (self.me.turn % (self.nCastles + self.network.getNumChurches()) !== self.rank && self.nCastles > 1) {
    return null;
  }


  const enemy = self.tactician.getNearbyEnemy();
  if (enemy !== null) {
    if (self.tactician.enemyInRange(enemy)) {
      return self.tactician.attackEnemy(enemy);
    }
    return self.buildOnRandomEmptyTile(SPECS.CRUSADER);
  }

  // priority build pilgrims until there's enough for all resource tiles on the map
  // note that self is halved to account for resources in enemy terrain
  // if pilgrims are killed more will be spawned because of the heartbeat
  if (self.tactician.getNumVisiblePilgrims() < self.atlas.getNumNearbyResources()) {
    if (self.haveResourcesToBuild(SPECS.PILGRIM)) {
      return self.buildOnRandomEmptyTile(SPECS.PILGRIM);
    }
  }

  if (self.me.turn % 25 === 0) {
    return self.buildOnRandomEmptyTile(SPECS.PILGRIM);
  }

  // build prophets for defense
  if (self.me.turn < 700 && self.haveResourcesToBuild(SPECS.PROPHET)) {
    return self.buildOnRandomEmptyTile(SPECS.PROPHET);
  }

  // or crusaders for health victory in the late game
  if (self.me.turn > 7 && self.haveResourcesToBuild(SPECS.CRUSADER)) {
    return self.buildOnRandomEmptyTile(SPECS.CRUSADER);
  }


  return null;
};


export default castle;