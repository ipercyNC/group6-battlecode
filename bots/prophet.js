import { BCAbstractRobot, SPECS } from "battlecode";
import navigation from "./navigation.js";

const prophet = {};

prophet.takeTurn = (self) => {
    self.step++;
    if (self.step % 2 ) {
        self.prevMove.x = self.me.x;
        self.prevMove.y = self.me.y;
    }

    const bots = self.getVisibleRobots();
    const o_castles = bots.filter((r) => {
        if (r.unit === SPECS.CASTLE && r.team === self.me.team) {
            return true;
        }
        return false;
    });

    // get enemy robots
    const e_bots = bots.filter((r) => {
        if (r.unit !== SPECS.CASTLE
            && r.team !== self.me.team) {
                return true;
            }
            return false;
        });

    if (e_bots.length > 0 ) {
        var e_bot = e_bots[0];
        var dist = 999999;
        for (let i = 0; i < e_bots.length; i++) {
            // if visible enemy robots in attackable range, then attack it
            if (navigation.attackable(self.me, e_bots[i])) {
                self.log('Attacking enemy');
                return self.attack(e_bots[i].x - self.me.x, e_bots[i].y - self.me.y);
            }
            //otherwise, look for the closest one between our robot and castle
            const newDist = navigation.Distance(self.me, e_bot);
            let dist_Castle = 99999;
            if (o_castles.length > 0) {
                for (let j = 0; j < o_castles.length; j++) {
                    const newDist_Castle = navigation.Distance(self.me, o_castles[j]);
                    if (newDist + newDist_Castle < dist) {
                        dist = newDist;
                        dist_Castle = newDist_Castle;
                        e_bot = e_bots[i];
                    }
                }
            } else if (newDist < dist) {
                dist = newDist;
                e_bot = e_bots[i];
            }
        }
        // moving to the closest one
        self.log("Moving closer to enemy");
        const dir = navigation.moveToTarget(self.me, e_bot, self.getPassableMap(), self.getVisibleRobotMap());
        const newLoc = navigation.applyDir(self.me, dir);
        if (newLoc.x === self.prevMove.x && newLoc.y === self.prevMove.y) {
            self.trapped++;
        }
        if (self.trapped > 20) {
            self.trapped = 10;
            return self.move(0,0);
        }
        return self.move(dir.x,dir.y);
    }



    /////////////////// CASTLE
    // calculating enemy castles
    if (self.enemyCastles.length > 0 ) {
        var e_castle = self.enemyCastles[0];
        var dist = 999999;
        for (let i = 0; i < self.enemyCastles.length; i++) {
            // if visible enemy castles in attackable range, then attack it
            if (navigation.attackable(self.me, self.enemyCastles[i])) {
                self.log("Attacking Castle");
                const e_castles = bots.filter((r) => {
                    if (r.unit === SPECS.CASTLE
                        && r.team !== self.me.team) {
                            return true;
                        }
                        return false;
                    });
                if (e_castles.length > 0) {
                    return self.attack(self.enemyCastles[i].x - self.me.x, self.enemyCastles[i].y - self.me.y);
                }
                else {
                    self.enemyCastles.splice(i,1);
                }
            }
            // otherwise, look for the closest one
            const newDist = navigation.Distance(self.me, e_castle);
            if (newDist < dist) {
                dist = newDist;
                e_castle = self.enemyCastles[i];
            }
        }
        // moving to the closest one
        self.log("Moving closer to castle 1");
        const dir = navigation.moveToTarget(self.me, e_castle, self.getPassableMap(), self.getVisibleRobotMap());
        const newLoc = navigation.applyDir(self.me, dir);
        if (newLoc.x === self.prevMove.x && newLoc.y === self.prevMove.y) {
            self.trapped++;
        }
        if (self.trapped > 20) {
            self.trapped = 10;
            return self.move(0,0);
        }
        return self.move(dir.x, dir.y);

    }
    else {
        let vertical = true;
        let x_sum = 0;
        let y_sum = 0;
        self.log(o_castles.length);
        if (o_castles.length > 1) {

            for (let i = 0; i < o_castles.length-1; i++) {
                const o_castle1 = o_castles[i];
                const o_castle2 = o_castles[i+1];
                x_sum = x_sum + Math.abs(o_castle1.x - o_castle2.x);
                y_sum = y_sum + Math.abs(o_castle1.y - o_castle2.y);
            }

            if (x_sum > y_sum) {
                vertical = false;
            }

            if (vertical) {
                for (let i =0; i < o_castles.length; i++) {
                    const castle = {x : self.getPassableMap().length - o_castles[i].x - 1, y: o_castles[i].y};
                    // self.log(castle.x);
                    // self.log(castle.y);
                    self.enemyCastles.push(castle);
                }
            } else {
                for (let i =0; i < o_castles.length; i++) {
                    const castle = {x : o_castles[i].x, y: self.getPassableMap().length - o_castles[i].y - 1 };
                    // self.log(castle.x);
                    // self.log(castle.y);
                    self.enemyCastles.push(castle);
                }
            }
        } else {
            for (let i =0; i < o_castles.length; i++) {
                const castle1 = {x : self.getPassableMap().length - o_castles[i].x - 1, y: o_castles[i].y};
                const castle2 = {x : o_castles[i].x, y: self.getPassableMap().length - o_castles[i].y - 1 };
                // self.log(castle.x);
                // self.log(castle.y);
                self.enemyCastles.push(castle1)
                self.enemyCastles.push(castle2);
            }
        }


        var e_castle = self.enemyCastles[0];
        var dist = 999999;
        for (let i = 0; i < self.enemyCastles.length; i++) {
            // if visible enemy castles in attackable range, then attack it
            if (navigation.attackable(self.me, self.enemyCastles[i])) {
                self.log("Attacking Castle");
                return self.attack(self.enemyCastles[i].x - self.me.x, self.enemyCastles[i].y - self.me.y);
            }
            // otherwise, look for the closest one
            const newDist = navigation.Distance(self.me, e_castle);
            if (newDist < dist) {
                dist = newDist;
                e_castle = self.enemyCastles[i];
            }
        }

        var e_castle = self.enemyCastles[0];
        var dist = 999999;
        for (let i = 0; i < self.enemyCastles.length; i++) {
            // if visible enemy castles in attackable range, then attack it
            if (navigation.attackable(self.me, self.enemyCastles[i])) {
                self.log("Attacking Castle");
                return self.attack(self.enemyCastles[i].x - self.me.x, self.enemyCastles[i].y - self.me.y);
            }
            // otherwise, look for the closest one
            const newDist = navigation.Distance(self.me, e_castle);
            if (newDist < dist) {
                dist = newDist;
                e_castle = self.enemyCastles[i];
            }
        }
        // moving to the closest one
        self.log("Moving closer to castle 1");
        const dir = navigation.moveToTarget(self.me, e_castle, self.getPassableMap(), self.getVisibleRobotMap());
        const newLoc = navigation.applyDir(self.me, dir);
        if (newLoc.x === self.prevMove.x && newLoc.y === self.prevMove.y) {
            self.trapped++;
        }
        if (self.trapped > 20) {
            self.trapped = 10;
            return self.move(0,0);
        }
        return self.move(dir.x, dir.y);
    }
};
export default prophet;
