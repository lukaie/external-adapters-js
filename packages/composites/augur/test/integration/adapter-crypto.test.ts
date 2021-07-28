import { AdapterError, Requester } from '@chainlink/ea-bootstrap'
import { assertError, assertSuccess } from '@chainlink/ea-test-helpers'
import { AdapterRequest } from '@chainlink/types'
import { makeExecute } from '../../src/adapter'
import { makeConfig } from '../../src/config'
import MockDate from 'mockdate'

import { BigNumber, ethers } from 'ethers'

import { CRYPTO_ABI } from '../../src/methods'
import { DateTime } from 'luxon'

describe('createMarket execute', () => {
  const jobID = '1'
  const execute = makeExecute()
  let contract: ethers.Contract
  let cryptoAddress = process.env.TEST_CONTRACT
  let Dates: Date[]

  beforeAll(async () => {
    contract = new ethers.Contract(cryptoAddress, CRYPTO_ABI, makeConfig().wallet)
    let nextResolutionTime: BigNumber = await contract.nextResolutionTime()
    Dates = [new Date(nextResolutionTime.sub(1000).toNumber())]
  })

  describe('successful calls @integration', () => {
    it(`poke`, async (done) => {
	 //  TODO : mock Datetime.
      let testData = {
        id: jobID,
        data: {
          method: 'poke',
          contractAddress: process.env.TEST_CONTRACT,
        },
      }

      const data = await execute(testData as AdapterRequest)
      assertSuccess(
        {
          expected: 200,
          actual: data.statusCode,
        },
        data,
        jobID,
      )
      done()
    }, 99900)
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

    requests.forEach((req) => {
      it(`${req.name}`, async () => {
        try {
          await execute(req.testData as AdapterRequest)
        } catch (error) {
          const errorResp = Requester.errored(jobID, error)
          assertError({ expected: 400, actual: errorResp.statusCode }, errorResp, jobID)
        }
      })
    })
  })
})
