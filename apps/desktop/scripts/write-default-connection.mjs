/**
 * Writes apps/desktop/build/default-connection.json from the optional
 * source-side config at apps/desktop/config/default-connection.json.
 *
 * The packaged app reads this file on first launch and uses it as the
 * initial desktop connection when no user-owned connection.json exists yet.
 * If the source file is absent, the build emits a neutral local default.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { isMain } from './utils.mjs'

const DESKTOP_ROOT = resolve(import.meta.dirname, '..')
const SOURCE_FILE = join(DESKTOP_ROOT, 'config', 'default-connection.json')
const OUT_DIR = join(DESKTOP_ROOT, 'build')
const OUT_FILE = join(OUT_DIR, 'default-connection.json')

function readSourceConfig() {
  if (!existsSync(SOURCE_FILE)) {
    return null
  }

  const raw = readFileSync(SOURCE_FILE, 'utf8')
  const parsed = JSON.parse(raw)

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`default connection config must be a JSON object: ${SOURCE_FILE}`)
  }

  return parsed
}

function main() {
  const config = readSourceConfig()

  if (!config) {
    mkdirSync(OUT_DIR, { recursive: true })
    writeFileSync(OUT_FILE, JSON.stringify({ mode: 'local', remote: {}, profiles: {} }, null, 2) + '\n', 'utf8')
    console.log(`[write-default-connection] no source config at ${SOURCE_FILE}; wrote a neutral packaged default`)
    return
  }

  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(OUT_FILE, JSON.stringify(config, null, 2) + '\n', 'utf8')
  console.log(`[write-default-connection] wrote ${OUT_FILE}`)
}

if (isMain(import.meta.url)) {
  main()
}
