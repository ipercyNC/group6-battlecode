import Atlas from "../bots/atlas.js";

const makeAtlas = () => {
  const map = null;
  const fuel = null;
  const karb = null;
  const robot = null;

  return new Atlas(map, fuel, karb, robot);
};

describe("class Atlas", () => {
  describe("function update(robots, robotMap)", () => {
    it("should save robots and robotMap as object fields", () => {
      const atlas = makeAtlas();

      const robotsBefore = atlas.robots;
      const robotMapBefore = atlas.robotMapBefore;

      atlas.update(54, 32);

      expect(robotsBefore).not.toEqual(54);
      expect(robotMapBefore).not.toEqual(32);
      expect(atlas.robots).toEqual(54);
      expect(atlas.robotMap).toEqual(32);
    });
  });
});