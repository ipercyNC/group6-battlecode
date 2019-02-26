import {BCAbstractRobot, SPECS } from "battlecode";
import navigation from './navigation.js';
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
  const visible = self.getVisibleRobots();
  //get all robots that sent message
  const messagingRobots = visible.filter(robot => {
    return robot.castle_talk;
  });

  // get enemy castle location
  for (let i = 0; i < messagingRobots.length; i++) {
    const robot = messagingRobots[i];
    if (!self.pendingRecievedMessages[robot.id]) {
      self.pendingRecievedMessages[robot.id] = robot.castle_talk;
    } else {
      if (!self.enemyCastles.includes({
        x: self.pendingRecievedMessages[robot.id],
        y: robot.castle_talk,
      })) {
        self.enemyCastles.push({
          x: self.pendingRecievedMessages[robot.id],
          y: robot.castle_talk,
        });
      }
      self.pendingRecievedMessages[robot.id] = null;
    }
  }

  // get all robots within range
  var getBuildDir = function(center) {
    var options = navigation.buildable.filter((d) => {
      return navigation.isPassable(navigation.applyDir(self.me, d), self.getPassableMap(), self.getVisibleRobotMap())
    })
    return options[0];
  }

  if (self.pilgrimsBuilt < 3 && self.karbonite >= 10) {
    var d = getBuildDir(self.me);
    if (!(d === undefined)){
      self.pilgrimsBuilt++;
      return self.buildUnit(SPECS.PILGRIM, d.x, d.y);
    }
  }


  var attackable = visible.filter((r) => {
    if (! self.isVisible(r)){
      return false;
    }
    const dist = (r.x-self.me.x)**2 + (r.y-self.me.y)**2;
    if (r.team !== self.me.team
      && SPECS.UNITS[self.me.unit].ATTACK_RADIUS[0] <= dist
      && dist <= SPECS.UNITS[self.me.unit].ATTACK_RADIUS[1] ){
        return true;
      }
      return false;
    });


    if (self.step % 50 || self.step % 51) {
      let enemyCastle = null;
      for (let i = 0; i < self.enemyCastles.length; i++) {
        const x = self.enemyCastles[i].x;
        const y = self.enemyCastles[i].y;
        if (x >= 0 && y >=0) {
          enemyCastle = self.enemyCastles[i];
          break;
        } else {
          // remove invalid castle
          self.enemyCastles.splice(i, 1);
        }
      }

      if (enemyCastle) {
        self.log('KNOWN ENEMY CASTLES');
        if (!self.pendingMessage) {
          self.log("Broadcasting enemy castle location");
          self.pendingMessage = enemyCastle.y;
          self.signal(enemyCastle.x, self.signal_radius);
        } else {
          self.signal(enemyCastle.y, self.signal_radius);
          self.pendingMessage = null;
        }
      }
    }


    if (attackable.length>0){
      // attack first robot
      var r = attackable[0];
      self.log('' +r);
      self.log('attacking! ' + r + ' at loc ' + (r.x - self.me.x, r.y - self.me.y));
      return self.attack(r.x - self.me.x, r.y - self.me.y);
    }

    if (self.karbonite > 30 && self.fuel > 150) {
      let unit = SPECS.PROPHET;
      var d = getBuildDir(self.me);
      if (!(d === undefined)){
        return self.buildUnit(unit, d.x, d.y);
      }
    }
  };


  export default castle;
