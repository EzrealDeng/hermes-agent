import assert from 'node:assert/strict'
import path from 'node:path'

import { test } from 'vitest'

import { getBundledRuntimePython } from './bundled-runtime'

test('Windows bundled runtime launches the copied base interpreter', () => {
  assert.equal(getBundledRuntimePython('C:\\runtime', 'win32', path.win32), 'C:\\runtime\\python\\python.exe')
})

test('POSIX bundled runtime keeps launching through the venv', () => {
  assert.equal(getBundledRuntimePython('/runtime', 'darwin', path.posix), '/runtime/venv/bin/python')
})
