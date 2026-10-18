// Uses the locally saved API key (or SILICONFLOW_API_KEY); never embeds credentials in the package.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createVoiceService, SCENE_DEFAULTS, VOICE_MODEL } from '../lib/voice-service.js'

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, arg, i, all) => {
  if (arg.startsWith('--')) pairs.push([arg.slice(2), all[i + 1]])
  return pairs
}, []))
if (!args.audio || !args.name || !args.transcript) throw new Error('Required: --audio FILE --name NAME --transcript TEXT')
const packageRoot = fileURLToPath(new URL('..', import.meta.url))
const home = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')
const service = createVoiceService({ home, packageRoot })
const catalog = await service.refresh()
let voice = catalog.voices.find(v => v.kind === 'custom' && v.name === args.name && v.compatible)
if (!voice) voice = await service.upload({ fileName: path.basename(args.audio), name: args.name, text: args.transcript,
  audio: 'data:audio/mpeg;base64,' + fs.readFileSync(args.audio).toString('base64') })
console.log('声音已就绪：' + voice.name)
const result = await service.sync({ voicePreset: voice.id, scenes: SCENE_DEFAULTS, identity: 'JOYCE MOORE' },
  { force: !!args.regenerate, sceneIds: args.regenerate ? args.regenerate.split(',') : undefined })
const assets = path.join(packageRoot, 'lib', 'assets')
const files = []
for (let i = 0; i < SCENE_DEFAULTS.length; i++) {
  const filename = 'shaoluohuang-' + SCENE_DEFAULTS[i].id + '.mp3'
  const source = service.cachedFile(result.config.sceneAudio[i].split('/').pop())
  const bytes = fs.readFileSync(source)
  fs.writeFileSync(path.join(assets, filename), bytes)
  files.push({ file: filename, text: SCENE_DEFAULTS[i].speechText, bytes: bytes.length,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex') })
}
fs.copyFileSync(args.audio, path.join(assets, 'shaoluohuang-reference.mp3'))
service.bindSystemVoice('shaoluohuang', voice.id)
fs.writeFileSync(path.join(packageRoot, 'lib', 'voice-presets.json'), JSON.stringify({
  name: args.name, model: VOICE_MODEL, generatedAt: new Date().toISOString(), files
}, null, 2) + '\n')
console.log(JSON.stringify({ generated: result.generated, reused: result.cached, files: files.map(f => ({ file: f.file, bytes: f.bytes })) }))
