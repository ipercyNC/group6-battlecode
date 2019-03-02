import SPECS from "./specs.js";
import * as Constants from "./constants.js";

// eslint-disable-next-line no-unused-lets
export default class Network {
  constructor(owner) {
    this.robots = null;
    this.owner = owner;

    this.sentSync = false;
    this.units = [];
  }

  update() {
    this.transmit(Constants.STATUS_IDLE);
    this.robots = this.owner.getVisibleRobots();
    this.countRobots();
  }

  transmit(value) {
    this.owner.castleTalk(this.owner.me.unit * 32 + value);
  }

  syncCastles() {
    if (!this.sentSync) {
      this.transmit(this.owner.me.id % 32);
      this.sentSync = true;
    } else {
      let rank = 0;
      for (let i = 0; i < this.units[SPECS.CASTLE].length; i++) {
        const state = this.units[SPECS.CASTLE][i];

        if (this.owner.me.id % 32 > state) {
          rank++;
        }
      }
      return rank;
    }
    return null;
  }

  getCastles(step, castles) {
    const transmitX = Math.floor(this.owner.me.x / (this.owner.map.length / 4));
    const transmitY = Math.floor(this.owner.me.y / (this.owner.map.length / 4));
    this.transmit(transmitX * 4 + transmitY);

    let index = 0;
    for (let i = 0; i < this.units[SPECS.CASTLE].length; i++) {
      const data = this.units[SPECS.CASTLE][i];
      const x = Math.round(Math.floor(data / 4) * (this.owner.map.length / 4) + (this.owner.map.length / 8));
      const y = Math.round(data % 4 * (this.owner.map.length / 4) + (this.owner.map.length / 8));

      if (castles[index] === undefined) {
        castles.push({ x, y });
        index++;
      }
    }
  }

  countRobots() {
    this.units = [];
    for (let i = 0; i < 6; i++) {
      this.units.push([]);
    }

    for (let i = 0; i < this.robots.length; i++) {
      const data = this.robots[i].castle_talk;
      if (data !== undefined && data !== 0) { // if it's zero then the robot is an infant and hasn't transmitted anything
        const unit = Math.floor(data / 32);
        const state = data % 32;
        this.units[unit].push(state);
      }
    }
  }

  getNumCastles() {
    return this.units[SPECS.CASTLE].length;
  }

  getNumCrusaders() {
    return this.units[SPECS.CRUSADER].length;
  }

  getNumPilgrims() {
    return this.units[SPECS.PILGRIM].length;
  }

  getNumPreachers() {
    return this.units[SPECS.PREACHER].length;
  }

  getNumProphets() {
    return this.units[SPECS.PROPHET].length;
  }

  getNumChurches() {
    return this.units[SPECS.CHURCH].length;
  }


  initialize() {
    this.update(this.owner.getVisibleRobots());
  }


}