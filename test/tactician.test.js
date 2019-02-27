import Atlas from "../bots/atlas.js";
import * as Constants from "../bots/constants.js";

const makeAtlas = () => {
  const map =  null;
  const fuel = null;
  const karb = null;
  const robot = null;
  
  return new Atlas(map, fuel, karb, robot);
};
const makeKarbMap = () => {
  return [
	  [0,0,0,0,0],
	  [0,0,0,0,0],
	  [0,0,0,1,0],
	  [0,0,0,0,0],
	  [1,0,0,0,0]
  ];
};
const makeFuelMap = () => {
  return [
	  [1,0,0,0,0],
	  [0,0,0,0,0],
	  [0,0,0,0,0],
	  [0,0,0,0,0],
	  [0,0,0,0,0]
  ];
};
const makeMap = () => {
  return [
	  [1,1,1,1,0],
	  [1,1,1,1,1],
	  [1,1,1,1,1],
	  [1,1,1,1,1],
	  [1,1,1,1,0]
  ];
};
const makeHorizontalMap = () => {
  return [[0,0,0,0],
	  [0,0,0,0],
	  [0,0,0,0],
	  [0,0,0,0]
  ];
};
const makeRobotMap = () => {
  return [
	  [1,0,0,0,0],
	  [0,0,0,0,0],
	  [0,0,0,0,0],
	  [0,0,0,0,0],
	  [0,0,0,0,0]
  ];
};
function setupBasics(atlas){
  atlas.map = makeMap();
  atlas.karbMap = makeKarbMap(); 
  atlas.fuelMap = makeFuelMap();
  atlas.initializeResources();
}
describe("class Atlas", () => {
  describe("function update(robots, robotMap)", () => {
    it("should save robots and robotMap as object fields", () => {
      const atlas = makeAtlas();

      const robotsBefore = atlas.robots;
      const robotMapBefore = atlas.robotMapBefore;
      atlas.owner = {'me':{'x':0}};
      atlas.update(54, 32);
      
      expect(robotsBefore).not.toEqual(54);
      expect(robotMapBefore).not.toEqual(32);
      expect(atlas.robots).toEqual(54);
      expect(atlas.robotMap).toEqual(32);
    });
  });


});
