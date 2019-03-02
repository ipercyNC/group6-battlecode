import SPECS from "./specs.js";
import * as Constants from "./constants.js";

// eslint-disable-next-line no-unused-lets
export default class Tactician {
  constructor(owner) {
    this.robots = null;
    this.robotMap = null;
    this.owner = owner;
    this.curPos = null;
    this.unit = null;
    this.team = null;
    this.fuel = null;
    this.atlas = null;


    this.target = null;
    this.stage = Constants.COMBAT_PHASE_IDLE;
  }

  update(robots, robotMap) {
    this.robots = robots;
    this.robotMap = robotMap;
    this.pos = {
      x: this.owner.me.x,
      y: this.owner.me.y,
    };
    this.fuel = this.owner.fuel;
    this.unit = this.owner.me.unit;
    this.team = this.owner.me.team;
    this.atlas = this.owner.atlas;
  }

  initialize() {
    this.update(this.owner.getVisibleRobots(), this.owner.getVisibleRobotMap());
  }

  activate(target) {
    this.stage = Constants.COMBAT_PHASE_SEARCH_AND_DESTROY;
    this.target = target;
  }

  getNumVisiblePilgrims() {
    return this.robots.filter((robot) => {
      if (this.team === robot.team && robot.unit === SPECS.PILGRIM && robot.x !== undefined) {
        return true;
      }
      return false;
    }).length;
  }

  getNumVisibleProphets() {
    return this.robots.filter((robot) => {
      if (this.team === robot.team && robot.unit === SPECS.PROPHET) {
        return true;
      }
      return false;
    }).length;
  }

  getNearbyEnemies() {
    // get all robots within range
    return this.robots.filter((robot) => {
      const dist = (this.pos.x - robot.x) ** 2 + (this.pos.y - robot.y) ** 2;
      const maxRange = SPECS.UNITS[this.unit].VISION_RADIUS;
      if (this.team !== robot.team && dist <= maxRange) {
        return true;
      }
      return false;
    });
  }

  getNearbyEnemy() {
    const enemies = this.getNearbyEnemies();
    // attack enemies in order of prophet > preacher > crusader > pilgrim
    if (enemies.length > 0 && this.fuel >= 10) {
      // break the list of attackable robots down by unit type
      const enemyRobots = {
        [SPECS.PROPHET]: [],
        [SPECS.PREACHER]: [],
        [SPECS.CRUSADER]: [],
        [SPECS.PILGRIM]: [],
        [SPECS.CASTLE]: [],
        [SPECS.CHURCH]: [],
      };

      // split the list up by unit to make it easy to prioritize targets
      for (let i = 0; i < enemies.length; i++) {
        enemyRobots[enemies[i].unit].push(enemies[i]);
      }

      // get the first enemy robot
      for (const key in enemyRobots) {
        if (enemyRobots[key].length > 0) {
          return enemyRobots[key][0];
        }
      }
    }
    return null;
  }

  enemyInRange(enemy) {
    const dist = ((enemy.x - this.pos.x) ** 2 + (enemy.y - this.pos.y) ** 2);

    if (dist >= SPECS.UNITS[this.unit].ATTACK_RADIUS[0] && dist <= SPECS.UNITS[this.unit].ATTACK_RADIUS[1]) {
      return true;
    }
    return false;
  }

  // only attack if not on the same team
  // if out of range, move closer
  attackEnemy(enemy) {
    const dX = enemy.x - this.pos.x;
    const dY = enemy.y - this.pos.y;
    const dist = (dX ** 2 + dY ** 2);

    if (this.team !== enemy.team) {
      if (dist >= SPECS.UNITS[this.unit].ATTACK_RADIUS[0] && dist <= SPECS.UNITS[this.unit].ATTACK_RADIUS[1]) {
        return this.owner.attack(dX, dY);
      }

      this.atlas.calculatePathAdjacentToTarget(enemy.x, enemy.y);
      return this.atlas.continueMovement();
    }
    return null;
  }
}