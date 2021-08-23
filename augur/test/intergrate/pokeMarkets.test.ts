import { Requester } from '@chainlink/ea-bootstrap'
import { assertError, assertSuccess } from '@chainlink/ea-test-helpers'
import { AdapterRequest } from '@chainlink/types'
import { execute, makeExecute } from '../../src/adapter'

describe('execute',function () {
  const jobID = '1'
  const contractAddress = '0xD54AdA4fd8871Ad717738e422458cF4371F517a0'
  describe('successful calls @integration', () => {
    const requests = [
      {
        name: 'Test case',
        testData: {
          id: '1',
          data: {
            "method": "poke",
            "contractAddress": contractAddress
          }
        },
      },
    ]

    requests.forEach((req) => {
      it(`${req.name}`, async () => {

        const data = await makeExecute()(req.testData as AdapterRequest, null);
        assertSuccess({ expected: 200, actual: data.statusCode }, data, jobID)

      }, 300000)
    })
  })
})
