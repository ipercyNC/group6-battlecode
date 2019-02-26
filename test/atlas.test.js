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
  describe("function updateResourceMap()",() => {
    it("should update the resource map based on robot locations", () => {
      const atlas = makeAtlas();
      atlas.owner= {'me': {'x':0}};
      setupBasics(atlas);
      atlas.robotMap = makeRobotMap();
      atlas.updateResourceMap();
      expect(atlas.resourceTiles[0].state).toEqual(Constants.RESOURCE_TILE_BUSY);
    });
  });
  describe("functions to tileIsFuel and tileIsKarbonite",() => {
    it("testing tileIsFuel()", () => {
      const atlas = makeAtlas();
      setupBasics(atlas);
      expect(atlas.resourceMap[0][0]).toEqual(Constants.FUEL);
    });
    it("testing tileIsKarbonite()", () => {
     const atlas = makeAtlas();
     setupBasics(atlas);
     expect(atlas.resourceMap[2][3]).toEqual(Constants.KARBONITE); 
    });
  }); 
  describe("function tileIsBlocked()", () => {
    it("testing when tile is blocked by other robot", () => {
      const atlas = makeAtlas(); 
      setupBasics(atlas);
      const tile = {'x':0,'y':0};
      atlas.owner = {'me': {'x':1,'y':1}};
      atlas.robotMap = makeRobotMap();
      expect(atlas.tileIsBlocked(tile)).toEqual(true);
    });
    it("testing when blocked by me", () => {
      const atlas = makeAtlas();
      setupBasics(atlas);
      const tile = {'x':0,'y':0}; 
      atlas.owner = {'me': {'x':0,'y':0}};
      expect(atlas.tileIsBlocked(tile)).toEqual(false); 
    });
    it("testing when not blocked", () => {
      const atlas = makeAtlas();
      setupBasics(atlas);
      const tile ={'x':2,'y':2};
      atlas.owner = {'me': {'x':3,'y':3}};
      atlas.robotMap = makeRobotMap();
      expect(atlas.tileIsBlocked(tile)).toEqual(false);
    });

  }); 
  describe("function coordIsAdjacentToResource()", () => {
    it("testing coordAdjacent when adjacent", () =>{
      const atlas = makeAtlas();
      setupBasics(atlas);
      atlas.karbonite_map= makeKarbMap();
      expect(atlas.coordIsAdjacentToResource(3,3)).toEqual(true);
    });
    it("testing coordAdjacent when not adjacent", () => {
     const atlas = makeAtlas();
     setupBasics(atlas); 
     atlas.karbonite_map = makeKarbMap();
     expect(atlas.coordIsAdjacentToResource(0,2)).toEqual(false);
    });
  });
  describe("function mapIsHorizontallyMirrored()", () => {
    it("testing when not horizontallyMirrored", () => {
      const atlas = makeAtlas();
      setupBasics(atlas);
      expect(atlas.mapIsHorizontallyMirrored()).toEqual(false);
    });
    it("testing when horizontallyMirrored", () => {
      const atlas = makeAtlas();
      atlas.map = makeHorizontalMap();
      expect(atlas.mapIsHorizontallyMirrored()).toEqual(true);
    });
  });
  describe("function manhattan()", () => {
    it("testing manhattan expected results", () => {
      const atlas = makeAtlas();
      const pos1 = {'x':20,'y':20};
      const pos2 = {'x':17,'y':16};
      expect(atlas.manhattan(pos1,pos2)).toEqual(7);
      expect(atlas.manhattan(pos2,pos1)).toEqual(7);
    });
  });



});
