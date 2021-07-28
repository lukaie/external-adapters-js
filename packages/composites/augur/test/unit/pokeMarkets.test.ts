import { assert } from 'node:console';
import rewire from 'rewire'



/**
 * Unit test for module pokeMarkets.
 * 
 */

describe('execute', () => {
  const pokeMarketsPath= "../../dist/methods/pokeMarkets.js";

  let pokeMarketsPublic;

  beforeAll(() => {
    pokeMarketsPublic = rewire(pokeMarketsPath);
  })

  it("RoundManagement Test", () => {
    let RoundManagement = pokeMarketsPublic.__get__("RoundManagement");
    let roundManagement = RoundManagement(1, 1);
    console.log(roundManagement.get);
    assert(true, true);
  })
  // it("Test ")
})
