import Network from "../bots/network.js";
import * as Constants from "../bots/constants.js";

const makeNetwork = () => {
  const robot = {'me':{'unit':2,'id':3333},
	         'castle_talk':0,
	         castleTalk(x) {
	            this.castle_talk=x;
		    return x;	   
		 } ,
	           getVisibleRobots(){
			   const robots = [];
                       return robots;
		   },
	         countRobots(){
                   return null;
		 }
	       }; 
  return new Network(robot);
};
const makeRobots = () => {
  return [ {castle_talk:1},
	   {castle_talk:33},
	   {castle_talk:65},
	   {castle_talk:97},
	   {castle_talk:129},
	   {castle_talk:161}
  ];
};

describe("class Network", () => {
  describe("function transmit()", () => {
    it("should update castleTalk value in unit", () => {
      const network = makeNetwork();
      network.transmit(1); 
      expect(network.owner.castle_talk).toEqual(65); 
      network.transmit(1000);
      expect(network.owner.castle_talk).toEqual(1064);
    });
  });
  describe("function update()", () => {
    it("will update transmit for now to idle",() => {
      const network = makeNetwork();
      network.transmit(1000);
      expect(network.owner.castle_talk).toEqual(1064);
      network.update();
      expect(network.owner.castle_talk).toEqual(65);
    });

  });
  describe("get unit functions",() => {
    it("correct num castles", () => {
      const network = makeNetwork();
      network.robots = makeRobots();
      network.countRobots();
      expect(network.getNumCastles()).toEqual(1);
    });
    it("correct num crusaders", () => {
     const network = makeNetwork();
     network.robots = makeRobots();
     network.countRobots(); 
     expect(network.getNumCrusaders()).toEqual(1);
    });
    it("correct num pilgrims", () => {
      const network = makeNetwork();
      network.robots = makeRobots();
      network.countRobots();
      expect(network.getNumPilgrims()).toEqual(1);
    });
    it("correct num preachers", () => {
      const network = makeNetwork();
      network.robots = makeRobots();
      network.countRobots();
      expect(network.getNumPreachers()).toEqual(1);
    });
    it("correct num prophets", () => {
      const network = makeNetwork();
      network.robots = makeRobots();
      network.countRobots();
      expect(network.getNumProphets()).toEqual(1);

    })
    it("correct num churches", () => {
      const network = makeNetwork();
      network.robots = makeRobots();
      network.countRobots();
      expect(network.getNumChurches()).toEqual(1);

    });
  });
  describe("function initialize()", () => {
    it("should call update", () => {
     const network = makeNetwork();
     network.transmit(1000);
     network.initialize();
     expect(network.owner.castle_talk).toEqual(65);
    });

  });

});
