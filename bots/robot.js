import { BCAbstractRobot, SPECS } from "battlecode";
import prophet from "./prophet";
import castle from "./castle";
import pilgrim from "./pilgrim";
import crusader from "./crusader";
import navigation from "./navigation";

// eslint-disable-next-line no-unused-vars
class MyRobot extends BCAbstractRobot {
  constructor() {
    super();
    this.pendingRecievedMessages = {};
    this.enemyCastles = [];
    this.myType = undefined;
    this.step = -1;
    this.pilgrimsBuilt = 0;
  }

  turn() {
    if (this.myType === undefined) {
      switch (this.me.unit) {
        case SPECS.PROPHET:
          this.myType = prophet;
          break;
        case SPECS.CASTLE:
          this.myType = castle;
          break;
        case SPECS.PILGRIM:
          this.myType = pilgrim;
          break;
        case SPECS.CRUSADER:
          this.myType = crusader;
          break;
        default:
          this.me.log("Unknown unit type" + this.me.unit);
      }
    }
    return this.myType.takeTurn(this);
  }
}
