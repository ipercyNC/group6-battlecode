import {BCAbstractRobot, SPECS} from 'battlecode';
import navigation from './navigation.js';
const prophet = {};

prophet.takeTurn = (self) => {

  const choices = [[0,-1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
  const choice = choices[Math.floor(Math.random()*choices.length)];
  const target = navigation.startMove(self,choice);
  self.log("trying to move to " + target);
  return self.move(target.x,target.y);
}
export default prophet;
