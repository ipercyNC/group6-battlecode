import BinaryHeap from "../bots/binaryHeap.js";
import * as Constants from "../bots/constants.js";

const makeHeap = () => {
  return new BinaryHeap();
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
    });
  });

});
