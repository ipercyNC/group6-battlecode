import nextMoveToDestination from "../bots/nextMoveTodestination.js";

describe("function nextMoveToDestination", () => {
  it("should return Types.FILTER_NOTHING if the hit requester id does not match any entry's requester id", () => {
    nextMoveToDestination();
  });
});
