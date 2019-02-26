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
	  [1,1,1,1,1],
	  [1,1,1,1,1],
	  [1,1,1,1,1],
	  [1,1,1,1,1],
	  [1,1,1,1,1]
  ];
};
describe("class Atlas", () => {
  /*describe("function update(robots, robotMap)", () => {
    it("should save robots and robotMap as object fields", () => {
      const atlas = makeAtlas();

      const robotsBefore = atlas.robots;
      const robotMapBefore = atlas.robotMapBefore;

      atlas.update(robotsBefore, robotMapBefore);

      expect(robotsBefore).not.toEqual(54);
      expect(robotMapBefore).not.toEqual(32);
      expect(atlas.robots).toEqual(54);
      expect(atlas.robotMap).toEqual(32);
    });
  });*/
  describe("function getNumResources()",() =>{
    it("should correctly return number of resources", () => {
      const atlas = makeAtlas();
      atlas.map=makeMap();
      atlas.karbMap=makeKarbMap();
      atlas.fuelMap=makeFuelMap();
      const ret = atlas.getNumResources();
      expect(ret).toEqual(3);
    });
  });
  describe("function _coorIsValid()",() =>{
    it("should return if coords are valid or not", ()  => {
      const atlas = makeAtlas();
      atlas.map=makeMap();
      const ret = atlas._coordIsValid(2,2);
      expect(ret).toEqual(true);
      const ret2 = atlas._coordIsValid(100,100);
      expect(ret2).toEqual(false);
      const ret3 = atlas._coordIsValid(-1,-1);
      expect(ret3).toEqual(false);
    });

  });
  describe("function initializeResources()",() =>{
    it("should init the resource map of karb + fuel", () => {
      const atlas = makeAtlas();
      atlas.map     = makeMap();
      atlas.karbMap = makeKarbMap();
      atlas.fuelMap = makeFuelMap();
      atlas.initializeResources();
      expect(atlas.resourceMap[0][0]).not.toEqual(Constants.EMPTY);


    });
  });
});
