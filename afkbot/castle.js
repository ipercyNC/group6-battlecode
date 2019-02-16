import { SPECS } from "battlecode";

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
  return null
};


export default castle;
