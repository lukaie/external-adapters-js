import { Contract } from 'ethers';
import { mocked } from 'ts-jest/utils';
import {execute} from '../../src/adapter'

jest.mock('ethers', () => {
	return {
		Contract: jest.fn().mockImplementation(() => {
			return {
				nextResolutionTime: () => {}, 
				getCoins: () => {},
				address: "0x000000000000000000000000000000000"
			}
		})
	}
});

describe("unit test", () => {
	const contractMock = mocked(Contract, true);
	beforeAll(() => {
		contractMock.mockClear();
	})

	it("fetchResolutionRoundIds", () => {
		
	})
})