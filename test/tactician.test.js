import Tactician from "../bots/tactician.js";
import * as Constants from "../bots/constants.js";
import * as SPECS from "../bots/specs.js";
const makeTactician = () => {
  const robot = {'me':{'team':1,'x':1,'y':1,'unit':0,'id':3333},
	         'castle_talk':0,
	         'fuel':100,
	           getVisibleRobots(){
			   const robots = [];
                       return robots;
		   },
	           getVisibleRobotMap(){
                      return [];
		   },
	         countRobots(){
                   return null;
		 },
	         attack(dx,dy){
                   return "attacked";
		 }
	       }; 
  return new Tactician(robot);
};
const makeRobots = () => {
  return [ {'team':2,'unit':1,'x':2,'y':2},
	   {'team':2,'unit':0,'x':2,'y':1},
	   {'team':2,'unit':1,'x':100,'y':100}
  ];
};

describe("class Tactician", () => {
  describe("function update()", () => {
    it("should properly update object values", () => {
      const tactician = makeTactician();
      tactician.update([],[]);
      expect(tactician.pos.x).toEqual(1);
    });
  });
  describe("funciton initialize()", ()=> {
    it("will properly call intialize()", () => {
      const tactician = makeTactician();
      tactician.initialize();
    });
  });
  describe("function activate()", ()=>{
    it("should set target to expected coords",() =>{
      const tactician = makeTactician();
      const targetRobot = {'x':14,'y':21};
      tactician.activate(targetRobot);
      expect(tactician.target.x).toEqual(14);
      expect(tactician.target.y).toEqual(21);
    });

  });
  describe("function getNearbyEnemies()", () =>{
    it("should find the nearby robot", () =>{
      const tactician = makeTactician();
      const robots = makeRobots(); 
      tactician.update(robots,[]);
      const ret = tactician.getNearbyEnemies();
      expect(ret.length).toEqual(2); 
      expect(robots.length).toEqual(3);
    });

  });
  describe("function getNearbyEnemy()", () => {
    it("should find the one robot in range", () =>{
      const tactician = makeTactician();
      const robots = makeRobots();
      tactician.update(robots,[]);
      const ret = tactician.getNearbyEnemy();
      expect(ret.unit).toEqual(0);
    });

  });
  describe("function enemyInRange()",() => {
    it("should positiviely identify robot in range", () => {
     const tactician = makeTactician();
     const enemy = {'x':2,'y':2};
     tactician.update([],[]);
     const ret = tactician.enemyInRange(enemy);
     expect(ret).toEqual(true);
    });
    it("should postively return out of range for robot out of range", () =>{
      const tactician = makeTactician();
      const enemy = {'x':100,'y':100};
      tactician.update([],[]);
      const ret = tactician.enemyInRange(enemy);
      expect(ret).toEqual(false);
    });
  
  });
  describe("function attackEnemy()", () =>{
    it("should try to attack", () =>{
      const tactician = makeTactician();
      const enemy = {'x':2,'y':2,'team':2};
      tactician.update([],[]);
      const ret = tactician.attackEnemy(enemy);
      expect(ret).toEqual("attacked");
    });
   it("same team don't attack", () =>{
     const tactician = makeTactician();
     const enemy = {'x':2,'y':2,'team':1};
     tactician.update([],[]);
     const ret = tactician.attackEnemy(enemy);
     expect(ret).toEqual(null);
   });
  });
});
