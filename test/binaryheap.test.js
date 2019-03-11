import BinaryHeap from "../bots/binaryHeap.js";
import * as Constants from "../bots/constants.js";

const makeHeap = () => {
	function temp(x){
             return x;
	};
  return new BinaryHeap(temp);
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

describe("class BinaryHeap", () => {
  describe("function default", () => {
    it("should create null", () => {
      const heap = makeHeap();
      console.log(heap.content);
      expect(heap.content).toEqual([]);
    });
  });
  describe("function push",() =>{
    it("should push one item",() =>{
      const heap = makeHeap();
      heap.push(1);
	  console.log(heap.size());
      expect(heap.size()).toEqual(1);
    });
  });
  describe("function pop", () =>{
    it("should pop item on heap", () =>{

    });
  });

});
