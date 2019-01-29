// sX, sY: starting x and y
// tX, tY: target x and y
// speed: units the unit can move
// terrain: terrain map from bc
export default function nextMoveToDestination(sX, sY, tX, tY, speed, terrain) {
  const distances = [];

  for (let y = 0; y < terrain.length; y++) {
    const row = [];
    for (let x = 0; x < terrain[y].length; x++) {
      if (terrain[y][x] === false || terrain[y][x] === 0) { // second case is for testing because true/false arrays are hard to read
        row.push(9999);
      } else {
        const distanceFromTileToTarget = ((x - tX) ** 2 + (y - tY) ** 2) ** 0.5;
        const distanceFromTileToStart = ((x - sX) ** 2 + (y - sY) ** 2) ** 0.5;
        if (Math.ceil(distanceFromTileToStart) < speed) {
          console.log(distanceFromTileToStart);
          row.push(distanceFromTileToTarget);
        } else {
          row.push(9999);
        }
      }
    }
    distances.push(row);
  }

  let bX = 0;
  let bY = 0;
  for (let y = 0; y < distances.length; y++) {
    for (let x = 0; x < distances[y].length; x++) {
      if (distances[y][x] < distances[bY][bX]) {
        bX = x;
        bY = y;
      }
    }
  }

  // no legal movements
  if (distances[bY][bX] === 9999) {
    return [-1, -1];
  }
  return [bX, bY];
}