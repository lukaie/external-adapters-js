import express from 'express'
import { readFileSync } from 'fs'
import * as http from 'http'

export function makeMockDataServer() {
  const app = express()

  function loadResource(pathToResource: string) {
    const buf: string = readFileSync(pathToResource).toString()
    return JSON.parse(buf)
  }

  function resourcePath(req: express.Request): string {
    return `${__dirname}/test-data${req.path}.json`
  }

  // entire URL -> json-compatible response
  const overrides: { [url: string]: any } = {}
  function setOverride(url: string, override: any) {
    overrides[url] = override
  }
  function clearOverride(url: string) {
    delete overrides[url]
  }
  async function withOverride<T>(
    url: string,
    override: any,
    callback: () => T | Promise<T>,
  ): Promise<T> {
    setOverride(url, override)
    const response = await callback()
    clearOverride(url)
    return response
  }

  app.get('*', (req: express.Request, res: express.Response) => {
    const override = overrides[req.originalUrl]
    if (override) {
      res.json(override)
      return
    }

    try {
      const resource = loadResource(resourcePath(req))
      res.json(resource)
    } catch (e) {
      res.send('')
    }
  })

  let key: string | undefined
  let endpoint: string | undefined
  let server: http.Server
  function startServer(port = 3000) {
    key = process.env.SPORTSDATAIO_NFL_STATS_API_KEY
    endpoint = process.env.SPORTSDATAIO_API_ENDPOINT
    process.env.SPORTSDATAIO_NFL_STATS_API_KEY = 'key'
    process.env.SPORTSDATAIO_API_ENDPOINT = `http://127.0.0.1:${port}`

    server = app.listen(port)
    return server
  }

  function stopServer() {
    server.close()
    process.env.SPORTSDATAIO_NFL_STATS_API_KEY = key
    process.env.SPORTSDATAIO_API_ENDPOINT = endpoint
  }

  return { startServer, stopServer, setOverride, clearOverride, withOverride }
}

export type StartServer = (port?: number) => http.Server
export type StopServer = () => void
export type SetOverride = (url: string, override: any) => void
export type ClearOverride = (url: string) => void
export type WithOverride<T> = (
  url: string,
  override: any,
  callback: () => T | Promise<T>,
) => Promise<T>
