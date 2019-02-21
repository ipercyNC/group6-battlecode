import getClosestReadyResource from '../bots/robot.js';


const makeTerrain = () => {
	return [
	[0,0,1],
	[0,0,0],
	[0,0,0]
	];

};
describe("function getClosestReadyResource",() => {
	it("should move to best square", () =>{
		const map  = makeTerrain();
		const closestResource =  getClosestReadyResource(map);
	});
});
