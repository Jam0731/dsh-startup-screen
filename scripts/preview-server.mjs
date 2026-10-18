// Real React settings and the real Host routes, in an isolated local preview home.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const root = fileURLToPath(new URL('..', import.meta.url))
process.env.DSH_HOME ||= path.join(root, '.work', 'preview-home')
const { apply } = await import('../lib/index.js')
const routes = [], taps = []
apply({ webServer: {
  register(route) { routes.push(route); return () => {} },
  tapIndex(fn) { taps.push(fn); return () => {} }
}, effect() {} })
const vendor = await build({ stdin: { contents: 'import React from "react";import {createRoot} from "react-dom/client";window.PreviewReact=React;window.PreviewCreateRoot=createRoot;', resolveDir: root },
  bundle: true, write: false, platform: 'browser', format: 'iife', define: { 'process.env.NODE_ENV': '"development"' } })
const loader = `window.__ModuleLoader__={load(entry){const mod=entry.factory(name=>{if(name==='react')return window.PreviewReact;throw new Error(name)});mod.apply({slots:{inject(_name,fn){fn()},register(_opts,render){window.PreviewCreateRoot(document.getElementById('panel')).render(render());return ()=>{}}}})}};`
const html = fs.readFileSync(path.join(root, 'preview', 'settings.html'), 'utf8')
const server = http.createServer(async (req, res) => {
  const port = server.address().port
  if (!['127.0.0.1:' + port, 'localhost:' + port].includes(req.headers.host)) { res.writeHead(403); res.end(); return }
  const pathname = (req.url || '/').split('?')[0]
  const route = routes.find(r => r.kind === 'exact' ? r.path === pathname : pathname === r.path || pathname.startsWith(r.path + '/'))
  if (route) { await route.handler(req, res); return }
  if (pathname === '/') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(taps.reduce((text, tap) => tap(text), html)); return }
  const files = { '/preview-react.js': ['text/javascript', vendor.outputFiles[0].text],
    '/preview-loader.js': ['text/javascript', loader], '/lib/client.js': ['text/javascript', fs.readFileSync(path.join(root, 'lib/client.js'))] }
  if (files[pathname]) { res.setHeader('Content-Type', files[pathname][0]); res.end(files[pathname][1]); return }
  res.writeHead(404); res.end()
})
server.listen(Number(process.env.PORT || 4318), '127.0.0.1', () => console.log('Settings preview: http://127.0.0.1:' + server.address().port))
