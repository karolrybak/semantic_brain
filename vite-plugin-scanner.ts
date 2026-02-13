import { Plugin } from 'vite'
import * as fs from 'fs'
import * as path from 'path'
import { scanProject, getNodeDetails } from './server/graph-scanner'

export default function scannerPlugin(): Plugin {
  return {
    name: 'graph-scanner',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url) return next()
        
        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
        
        // 1. GRAPH ENDPOINT
        if (url.pathname === '/api/graph') {
            try {
                const queryPath = url.searchParams.get('path')
                const projectRoot = queryPath ? path.resolve(queryPath) : process.cwd()
                
                if (!fs.existsSync(projectRoot)) {
                    res.statusCode = 404
                    res.end(JSON.stringify({ error: `Path not found: ${projectRoot}` }))
                    return
                }

                console.log(`[GraphScanner] Scanning: ${projectRoot}`)
                const data = scanProject(projectRoot)

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(data))

            } catch (e: any) {
                console.error('[GraphScanner] Error:', e)
                res.statusCode = 500
                res.end(JSON.stringify({ error: e.toString() }))
            }
            return
        }

        // 2. DETAILS ENDPOINT
        if (url.pathname === '/api/details') {
            try {
                const queryPath = url.searchParams.get('path')
                const nodeId = url.searchParams.get('id')
                const projectRoot = queryPath ? path.resolve(queryPath) : process.cwd()
                
                if (!nodeId) throw new Error('No id provided')

                const data = getNodeDetails(projectRoot, nodeId)

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(data))

            } catch (e: any) {
                console.error('[GraphScanner] Details Error:', e)
                res.statusCode = 500
                res.end(JSON.stringify({ error: e.toString() }))
            }
            return
        }

        next()
      })
    }
  }
}
