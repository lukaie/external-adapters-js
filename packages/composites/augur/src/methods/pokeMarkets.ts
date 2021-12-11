import { Logger, Requester, Validator } from '@chainlink/ea-bootstrap'
import { AdapterRequest, AdapterResponse, AdapterContext } from '@chainlink/types'
import { ethers, BigNumber, BigNumberish } from 'ethers'
import { DateTime } from 'luxon'

import { Config } from '../config'
import { getContract } from './index'
import { AggregatorV3Interface__factory, CryptoMarketFactoryV3 } from '../typechain'

// Use this for cases where something goes wrong.
// The contract will verify these
type HackyResolveRoundIDs = {
  [timestamp: number]: {
    [coin: string]: string
  }
}

const hackyResolveRoundIds: HackyResolveRoundIDs = {
  1639170000: {
    ETH: '36893488147420141384',
    BTC: '36893488147420136179',
    MATIC: '36893488147420122720',
    REP: '18446744073709564204',
    DOGE: '36893488147419532819',
    LINK: '36893488147420125521',
  },
}

class RoundManagement {
  readonly phase: BigNumber
  readonly justRound: BigNumber

  constructor(phase: BigNumberish, justRound: BigNumberish) {
    this.phase = BigNumber.from(phase)
    this.justRound = BigNumber.from(justRound)
  }

  public get id(): BigNumber {
    return this.phase.shl(64).or(this.justRound)
  }

  public nextRound(): RoundManagement {
    return new RoundManagement(this.phase, this.justRound.add(1))
  }

  public prevRound(): RoundManagement {
    return new RoundManagement(this.phase, this.justRound.sub(1))
  }

  static decode(roundId: BigNumberish): RoundManagement {
    roundId = BigNumber.from(roundId)
    const phase = roundId.shr(64)
    const justRoundId = roundId.sub(phase.shl(64))
    return new RoundManagement(phase, justRoundId)
  }
}

async function getNextWeekResolutionTimestamp(contract: CryptoMarketFactoryV3): Promise<number> {
  const contractNextResolutionTime = await contract.nextResolutionTime()
  const now = Math.floor(DateTime.now().setZone('America/New_York').toSeconds())
  if (contractNextResolutionTime.gt(now)) {
    Logger.warn(`Augur: Next resolution time is in the future`)

    return 0
  }

  return getUpcomingFriday4pmET()
}

export function getUpcomingFriday4pmET(): number {
  const nowEastern = DateTime.now().setZone('America/New_York')
  const thisWeek = nowEastern.set({ weekday: 5, hour: 16, minute: 0, second: 0, millisecond: 0 })
  const past = thisWeek.diff(nowEastern).milliseconds < 0
  const when = past ? thisWeek.plus({ week: 1 }) : thisWeek
  return Math.floor(when.toSeconds())
}

interface Coin {
  name: string
  priceFeed: string
}

interface RoundData {
  roundId: BigNumberish
  startedAt: BigNumberish
  updatedAt: BigNumberish
}

interface RoundDataForCoin {
  coinId: number
  roundId: BigNumberish
}

const pokeParams = {
  contractAddress: true,
}

export async function execute(
  input: AdapterRequest,
  context: AdapterContext,
  config: Config,
): Promise<AdapterResponse> {
  const validator = new Validator(input, pokeParams)
  if (validator.error) throw validator.error

  const jobRunID = input.id

  const contract = getContract(
    'crypto',
    validator.validated.data.contractAddress,
    config.signer,
  ) as unknown as CryptoMarketFactoryV3

  await pokeMarkets(contract, context, config)

  return Requester.success(jobRunID, {})
}

async function fetchResolutionRoundIds(
  resolutionTime: number,
  contract: CryptoMarketFactoryV3,
  _: AdapterContext,
  config: Config,
): Promise<RoundDataForCoin[]> {
  const coins: Coin[] = (await contract.getCoins()).slice(1)
  return Promise.all(
    coins.map(async (coin, index) => {
      const aggregator = AggregatorV3Interface__factory.connect(coin.priceFeed, config.signer)

      // Here we are going to walk backward through rounds to make sure that
      // we pick the *first* update after the passed-in resolutionTime
      let roundData: RoundData = await aggregator.latestRoundData()

      // If any of the coins can't be resolved, don't resolve any of them we
      // may want to change this
      if (roundData.updatedAt < resolutionTime) {
        throw Error(
          `Augur: cryptoMarkets - oracle update for ${coin.name} has not occured yet, resolutionTime is ${resolutionTime} but oracle was updated at ${roundData.updatedAt}`,
        )
      }

      let round = RoundManagement.decode(roundData.roundId)
      // resolution time = 0 => return last round;
      if (resolutionTime == 0) {
        return {
          coinId: index + 1,
          roundId: round.id,
        }
      }

      // PG: This is a hack to use a specific round because of a timeout
      // with jobs running too late. The round will be verified on chain.
      if (!!hackyResolveRoundIds[resolutionTime]) {
        const roundId = BigNumber.from(hackyResolveRoundIds[resolutionTime][coin.name])
        Logger.debug('Augur: hacky resolve', {
          name: coin.name,
          roundId: roundId.toString(),
        })

        return {
          coinId: index + 1,
          roundId,
        }
      }

      while (roundData.updatedAt >= resolutionTime) {
        roundData = await aggregator.getRoundData(round.prevRound().id)
        round = round.prevRound()
      }
      return {
        coinId: index + 1, // add one because getCoins excludes the 0th Coin, which is a placeholder for "no coin"
        roundId: round.nextRound().id, // next round because we iterated one past the desired round
      }
    }),
  )
}

async function createAndResolveMarkets(
  roundDataForCoins: RoundDataForCoin[],
  nextWeek: number,
  contract: ethers.Contract,
  _: AdapterContext,
  config: Config,
) {
  //     function createAndResolveMarkets(uint80[] calldata _roundIds, uint256 _nextResolutionTime) public {
  const roundIds: BigNumberish[] = ([0] as BigNumberish[]).concat(
    roundDataForCoins.map((x) => x.roundId),
  )

  const nonce = await config.signer.getTransactionCount()

  try {
    await contract.createAndResolveMarkets(roundIds, nextWeek, { nonce })
    Logger.debug(`Augur: createAndResolveMarkets -- success`)
  } catch (e) {
    Logger.debug(`Augur: createAndResolveMarkets -- failure`)
    Logger.error(e)
  }
}

async function pokeMarkets(
  contract: CryptoMarketFactoryV3,
  context: AdapterContext,
  config: Config,
) {
  const resolutionTime: BigNumber = await contract.nextResolutionTime()
  const nextResolutionTime = await getNextWeekResolutionTimestamp(contract)
  if (nextResolutionTime > 0) {
    const roundIds = await fetchResolutionRoundIds(
      resolutionTime.toNumber(),
      contract,
      context,
      config,
    )
    await createAndResolveMarkets(roundIds, nextResolutionTime, contract, context, config)
  }
}
