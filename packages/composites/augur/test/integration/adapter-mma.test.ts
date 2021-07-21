import { AdapterError, Requester } from '@chainlink/ea-bootstrap'
import { assertError, assertSuccess } from '@chainlink/ea-test-helpers'
import { AdapterRequest } from '@chainlink/types'
import { makeExecute } from '../../src/adapter'
import MockDate from 'mockdate'
import express from 'express'
import * as Sportsdataio from '@chainlink/sportsdataio-adapter'
import fs from 'fs'

// jest.mock('@chainlink/sportsdataio-adapter');

// const sportsDataIOExecuteMocked = Sportsdataio.makeExecute as jest.MockedFunction<typeof Sportsdataio.makeExecute>


describe('createMarket execute', () => {
	const jobID = '1'
	const execute = makeExecute()
	let server: any

	process.env.RPC_URL = "http://127.0.0.1:8545";
	process.env.PRIVATE_KEY = "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
	process.env.SPORTSDATAIO_MMA_STATS_API_KEY = "key";
	process.env["SPORTSDATAIO_API_ENDPOINT"] = "http://127.0.0.1:3000";


	describe('successful calls @integration', () => {

		beforeAll(() => new Promise((resolve) => {

			const app = express()
			const PORT = 3000

			const s2021 = JSON.parse(fs.readFileSync(__dirname + "/mma/json/Schedule/UFC/2021.json").toString());

			app.get("/mma/scores/json/Schedule/:league/:season", (req, res) => {
				res.json(s2021);
			})

			app.get("/mma/scores/json/Fight/:id", (req, res) => {
				try {
					let result = JSON.parse(fs.readFileSync(__dirname + "/mma/json/Fight/" + req.params[":id"] + ".json").toString())
					res.json(result);
				} catch (e) {
					res.send("");
				}
			})

			app.get("/mma/scores/json/Event/:eventId", (req, res) => {
				try {
					let result = JSON.parse(fs.readFileSync(__dirname + "/mma/json/Event/" + req.params["eventId"] + ".json").toString())
					res.json(result);
				} catch (e) {
					console.log(e);
					res.send("");
				}
			})

			server = app.listen(PORT, () => {
				console.log("Mock server start at port: ", PORT)
			})

			resolve(true)
		}))


		afterAll(() => {
			return server.close();
		})

		let Dates = [
			"2021-01-16T12:00:00",
			"2021-01-20T09:00:00",
			"2021-01-23T19:00:00",
			"2021-02-06T17:00:00",
			"2021-02-13T19:00:00",
			"2021-02-20T17:00:00",
			"2021-02-27T18:00:00",
			"2021-03-06T17:15:00",
			"2021-03-13T17:00:00",
			"2021-03-20T19:30:00",
			"2021-03-27T19:30:00",
			"2021-04-10T11:30:00",
			"2021-04-17T19:00:00",
			"2021-04-24T18:00:00",
			"2021-05-01T19:00:00",
			"2021-05-08T18:00:00",
			"2021-05-15T18:30:00",
			"2021-05-22T16:00:00",
			"2021-06-05T16:00:00",
			"2021-06-12T18:00:00",
			"2021-06-19T16:00:00",
			"2021-06-26T13:00:00",
			"2021-07-10T18:00:00",
			"2021-07-17T19:00:00",
			"2021-07-24T16:00:00",
			"2021-07-31T18:00:00",
			"2021-08-07T18:15:00",
			"2021-08-21T19:00:00",
			"2021-08-31T20:00:00",
			"2021-09-07T20:00:00",
			"2021-09-14T20:00:00",
			"2021-09-21T20:00:00",
			"2021-09-25T18:15:00",
			"2021-09-28T20:00:00"
		];

		Dates.forEach((date) => {
			MockDate.set(date);
			it(`${date} solve`, async () => {
				let testData =
				{
					id: jobID,
					data: {
						"method": "create",
						"sport": "MMA",
						"daysInAdvance": 1,
						"startBuffer": 60,
						"affiliateIds": [1, 3],
						"contractAddress": process.env.TEST_CONTRACT
					},
				}

				const data = await execute(testData as AdapterRequest)
				assertSuccess({
					expected: 200, actual: data.statusCode
				}, data, jobID)
			});
			MockDate.reset();
		})


		Dates.forEach((date) => {
			MockDate.set(date);
			it(`${date} resolve`, async () => {
				let testData =
				{
					id: jobID,
					data: {
						"method": "resolve",
						"sport": "MMA",
						"contractAddress": process.env.TEST_CONTRACT
					},
				}

				const data = await execute(testData as AdapterRequest)
				assertSuccess({
					expected: 200, actual: data.statusCode
				}, data, jobID)
			});
			MockDate.reset();
		})
	})


	describe('error calls @integration', () => {
		const requests = [
			{
				name: 'not supplied method',
				testData: {
					id: jobID, data:
					{
					}
				},
			},
			// {
			// 	name: 'not supplied daysInAdvance',
			// 	testData: {
			// 		id: jobID, data:
			// 		{
			// 			"method": "create",
			// 			"sport": "MMA",
			// 			"startBuffer": 60,
			// 			"affiliateIds": [1, 3],
			// 			"contractAddress": process.env.TEST_CONTRACT
			// 		}
			// 	},
			// },
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
