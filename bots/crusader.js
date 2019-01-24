import {BCAbstractRobot, SPECS} from 'battlecode';
import navigation from './navigation.js';
const crusader = {};
crusader.takeTurn = (self) => {

  // make directional choice - either given by castle? or enemy?
  var visible = self.getVisibleRobots();

  // get attackable robots
  var attackable = visible.filter((r) => {
      if (! self.isVisible(r)){
          return false;
      }
      const dist = Math.pow((r.x-self.me.x),2) + Math.pow((r.y-self.me.y),2);
      if (r.team !== self.me.team
          && SPECS.UNITS[self.me.unit].ATTACK_RADIUS[0] <= dist
          && dist <= SPECS.UNITS[self.me.unit].ATTACK_RADIUS[1] ){
          return true;
      }
      return false;
  });
  if (attackable.length>0){
    // attack first robot
    var r = attackable[0];
    self.log('' +r);
    self.log('attacking! ' + r + ' at loc ' + (r.x - self.me.x, r.y - self.me.y));
    return self.attack(r.x - self.me.x, r.y - self.me.y);
}

  // make random move to start
  const choices = [[0,-1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
  const choice = choices[Math.floor(Math.random()*choices.length)];
  const target = navigation.basicMove(self,choice);
  self.log("trying to move to " + target);
  return self.move(target[0],target[1]);
}
export default crusader;
