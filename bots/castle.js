import SPECS from "./specs.js";
import * as Constants from "./constants.js";

const castle = {};

castle.takeTurn = (self) => {
  self.step++;


  if (self.step % 50 === 0) {
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

    if (self.fuel > 10 ** 2) {
      // signal to everything on the map to target that enemy
      self.log("BROADCAST " + signal + " " + target.x + " " + target.y);
      self.broadcasted = true;
      self.signal(signal, Math.ceil(10 ** 2));
    }
  }

  // take turns with fellow castles so nobody monopolizes resources
  if (self.rank === null) {
    self.rank = self.network.syncCastles();
    return null;
  }

  if (self.step % self.network.getNumCastles() !== self.rank) {
    return null;
  }

  const enemy = self.tactician.getNearbyEnemy();
  if (enemy !== null && self.tactician.enemyInRange(enemy)) {
    return self.tactician.attackEnemy(enemy);
  }

  // priority build pilgrims until there's enough for all resource tiles on the map
  // note that this is halved to account for resources in enemy terrain
  // if pilgrims are killed more will be spawned because of the heartbeat
  if (self.network.getNumPilgrims() < Math.floor(self.atlas.getNumResources() / 2)) {
    if (self.haveResourcesToBuild(SPECS.PILGRIM)) {
      return self.buildOnRandomEmptyTile(SPECS.PILGRIM);
    }
  }


  // build crusaders if we can
  if (self.haveResourcesToBuild(SPECS.CRUSADER)) { // random chance is so one castle doesn't hog all the resources
    return self.buildOnRandomEmptyTile(SPECS.CRUSADER);
  }
};


export default castle;