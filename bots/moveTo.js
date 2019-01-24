export default (curX, curY, dstX, dstY, terrain, speed, self) => {
  const tmap = [];

  for (let y = curY - speed; y < curY + speed; y++) {
    const row = [];
    for (let x = curX - speed; x < curX + speed; x++) {
      if (((y - curY) ** 2 + (x - curX) ** 2) ** 0.5 <= speed) { // check that the tile is in move range
        if ((y < 0) || (y > terrain.length) || (x < 0) || (x > terrain[y].length)) {
          row.push(1000);
        } else if (terrain[y][x]) { // check that the tile is open
          row.push((x - dstX) ** 2 + (y - dstY) ** 2); // store the dist from the tile to the destination
        } else {
          row.push(1000);
        }
      } else {
        row.push(1000);
      }
    }
    tmap.push(row);
  }

  let bestTile = [0, 0];
  for (let y = 0; y < tmap.length; y++) {
    for (let x = 0; x < tmap[y].length; x++) {
      if (tmap[y][x] < tmap[bestTile[1]][bestTile[0]]) {
        bestTile = [x, y];
      }
    }
  }

  return bestTile;
};