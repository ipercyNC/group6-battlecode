// sX, sY: starting x and y
// karbonite: karbonite from bc
export default function nextMoveToDestination(sX, sY, karbonite) {
  const distances = [];

  for (let y = 0; y < karbonite.length; y++) {
    const row = [];
    for (let x = 0; x < karbonite[y].length; x++) {
      if (karbonite[y][x] === false || karbonite[y][x] === 0) { // second case is for testing because true/false arrays are hard to read
        row.push(9999);
      } else {
        const distanceFromTileToStart = ((x - sX) ** 2 + (y - sY) ** 2) ** 0.5;
        row.push(distanceFromTileToStart);
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