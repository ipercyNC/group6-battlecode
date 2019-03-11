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
      const heap = makeHeap();
      heap.push(1);
      console.log(heap.size());
      expect(heap.size()).toEqual(1);
      heap.pop(1);
      console.log(heap.size());
      expect(heap.size()).toEqual(0);
    });
  });
  describe("function bubbleUp()", () =>{
    it("should properly bubbleup", () =>{
      const heap = makeHeap();
      heap.push(1);
      console.log(heap.content);
      heap.push(2); 
      console.log(heap.content);
      heap.bubbleUp(2);
      console.log(heap.content);
      expect(heap.content[1]).toEqual(2);
    
    });

  });
  describe("function sinkDown()", () =>{
    it("should properly sink item down", () =>{
      const heap = makeHeap();
      heap.push(1);
      console.log(heap.content);
      heap.push(2);
      heap.push(3);
      console.log(heap.content);
      heap.sinkDown(2);
      console.log(heap.content);
    });
  });
  describe("function remove()", () =>{
    it("should properly remove item", () =>{
      const heap = makeHeap();
      heap.push(1);
      heap.push(2);
      console.log(heap.content);
      heap.remove(1); 
      expect(heap.size()).toEqual(1);
      heap.remove(2);
      expect(heap.size()).toEqual(0);
    });
    it("should fail silently for empty", () =>{
       const heap = makeHeap();
       heap.remove(4);
       expect(heap.size()).toEqual(0);
    });
  });

});
