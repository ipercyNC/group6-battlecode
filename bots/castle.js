import {BCAbstractRobot, SPECS} from 'battlecode';

const castle = {};

castle.takeTurn = (self) => {
    self.log('castle taking turn')
    if (self.step % 100) {
        // self.log('KNOWN ENEMY CASTLES: ');
        for(let i = 0; i < self.enemyCastles.length; i++) {
            const {x,y} = self.enemyCastles[i];
            self.log(x + ',' + y);
        }
    }

    if (self.pilgrimsBuilt < 2 && self.karbonite >= 100) {
        self.log('Building a pilgrim at ' + (self.me.x+1) + ',' + (self.me.y+1));
        self.pilgrimsBuilt++;
        return self.buildUnit(SPECS.CRUSADER, 1, 0);
    }

    if (self.karbonite > 200) {
        return self.buildUnit(SPECS.PROPHET, 1, 0);
    }
};


export default castle;
