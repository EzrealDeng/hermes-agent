import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { test } from 'vitest'

const desktopRoot = path.resolve(import.meta.dirname, '..')
const packageJson = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'package.json'), 'utf8'))
const installer = fs.readFileSync(path.join(import.meta.dirname, 'installer.nsh'), 'utf8')

test('NSIS packages the Hermes CLI PATH integration', () => {
  assert.equal(packageJson.build.nsis.include, 'scripts/installer.nsh')
  assert.match(installer, /hermes\.cmd/)
  assert.match(installer, /python\\python\.exe/)
  assert.match(installer, /-m hermes_cli\.main %\*/)
  assert.match(installer, /WriteRegExpandStr HKCU \"Environment\" \"Path\"/)
  assert.match(installer, /customUnInstall/)
  assert.match(installer, /RemoveHermesCliPath/)
  assert.match(installer, /SendMessageTimeoutW/)
})
