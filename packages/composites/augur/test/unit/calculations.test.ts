import { calcHomeSpread, TeamSchedule } from '../../src/dataProviders/sportsdataio'

describe('calculations', () => {
  describe('calcHomeSpread', () => {
    it('positive, favored -> pos', () => {
      const spreadIn = 1.5
      const event: TeamSchedule = makeFakeEvent({
        PointSpread: spreadIn,
        HomeTeamMoneyLine: -1, // negative means favored
      })
      expect(calcHomeSpread(event)).toEqual(spreadIn)
    })
    it('negative, favored -> pos', () => {
      const spreadIn = -1.5
      const event: TeamSchedule = makeFakeEvent({
        PointSpread: spreadIn,
        HomeTeamMoneyLine: -1, // negative means favored
      })
      expect(calcHomeSpread(event)).toEqual(-spreadIn)
    })
    it('positive, disfavored -> neg', () => {
      const spreadIn = 1.5
      const event: TeamSchedule = makeFakeEvent({
        PointSpread: spreadIn,
        HomeTeamMoneyLine: +1, // positive means disfavored
      })
      expect(calcHomeSpread(event)).toEqual(-spreadIn)
    })
    it('negative, disfavored -> neg', () => {
      const spreadIn = -1.5
      const event: TeamSchedule = makeFakeEvent({
        PointSpread: spreadIn,
        HomeTeamMoneyLine: +1, // positive means disfavored
      })
      expect(calcHomeSpread(event)).toEqual(spreadIn)
    })
    it('pos, missing moneyline -> 0', () => {
      const spreadIn = 1.5
      const event: TeamSchedule = makeFakeEvent({
        PointSpread: spreadIn,
      })
      expect(calcHomeSpread(event)).toEqual(0)
    })
    it('neg, missing moneyline -> 0', () => {
      const spreadIn = -1.5
      const event: TeamSchedule = makeFakeEvent({
        PointSpread: spreadIn,
      })
      expect(calcHomeSpread(event)).toEqual(0)
    })
    it('missing spread, favored -> 0', () => {
      const event: TeamSchedule = makeFakeEvent({
        HomeTeamMoneyLine: -1, // negative means favored
      })
      expect(calcHomeSpread(event)).toEqual(0)
    })
    it('missing spread, disfavored -> 0', () => {
      const event: TeamSchedule = makeFakeEvent({
        HomeTeamMoneyLine: +1, // positive means disfavored
      })
      expect(calcHomeSpread(event)).toEqual(0)
    })
  })
})

function makeFakeEvent(override: Partial<TeamSchedule>): TeamSchedule {
  return {
    Date: '',
    GameID: 0,
    AwayTeamName: '',
    AwayTeamID: 0,
    HomeTeamName: '',
    HomeTeamID: 0,
    Status: '',
    PointSpread: null,
    AwayTeamMoneyLine: null,
    HomeTeamMoneyLine: null,
    OverUnder: null,
    ...override,
  }
}
