import { AdapterError, Requester } from '@chainlink/ea-bootstrap'
import { assertError, assertSuccess } from '@chainlink/ea-test-helpers'
import { AdapterContext, AdapterRequest } from '@chainlink/types'
import { execute } from '../../src/adapter'
import MockDate from 'mockdate'
import server from '../utils/data-server'
import { Server } from 'http'
import { ethers, deployments, getNamedAccounts } from 'hardhat'
import { Contract } from 'ethers'
import { Config } from '../../src/config'
import { expect, spy } from './chai-setup'

describe('NFL createMarket execute', () => {
  const jobID = '1'
  let mockDataServer: Server

  describe('successful calls @integration', () => {
    let nflMarketFactory: Contract
    let config: Config

    before(async () => {
      process.env.SPORTSDATAIO_NFL_STATS_API_KEY = 'key'
      process.env.SPORTSDATAIO_API_ENDPOINT = 'http://127.0.0.1:3000'
      // run mock server;
      mockDataServer = server.listen(3000)

      // deploy smart contract
      await deployments.fixture(['Sports'])

      // fetch the NFL market factory.
      nflMarketFactory = await ethers.getContract('NFLMarketFactory')

      const { deployer } = await getNamedAccounts()
      const signer = await ethers.getSigner(deployer)
      config = {
        ...Requester.getDefaultConfig(''),
        verbose: true,
        signer,
      }
    })

    after(() => {
      return mockDataServer.close()
    })

    let Dates = ['2021-01-16T12:00:00']

    Dates.forEach((date) => {
      MockDate.set(date)
      it(`${date} create`, async () => {
        let testData = {
          id: jobID,
          data: {
            method: 'create',
            sport: 'NFL',
            daysInAdvance: 1,
            startBuffer: 60,
            affiliateIds: [1, 3],
            contractAddress: nflMarketFactory.address,
          },
        }

        const data = await execute(testData as AdapterRequest, {} as AdapterContext, config)
      })
      MockDate.reset()
    })

    Dates.forEach((date) => {
      MockDate.set(date)
      it(`${date} resolve`, async () => {
        let testData = {
          id: jobID,
          data: {
            method: 'resolve',
            sport: 'NFL',
            contractAddress: nflMarketFactory.address,
          },
        }

        const data = await execute(testData as AdapterRequest, {} as AdapterContext, config)
      })
      MockDate.reset()
    })
  })

  describe('error calls @integration', () => {
    const requests = [
      {
        name: 'not supplied method',
        testData: {
          id: jobID,
          data: {},
        },
      },
    ]

    // requests.forEach((req) => {
    // 	it(`${req.name}`, async () => {
    // 		try {
    // 			await execute(req.testData as AdapterRequest, {} as AdapterContext, config);
    // 		} catch (error) {
    // 			const errorResp = Requester.errored(jobID, error)
    // 			assertError({ expected: 400, actual: errorResp.statusCode }, errorResp, jobID)
    // 		}
    // 	})
    // })
  })
})
