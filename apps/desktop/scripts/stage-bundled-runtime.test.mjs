import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'vitest'

import { copyWindowsPythonTree, uvVenvArgs } from './stage-bundled-runtime.mjs'

function makeTree(root, entries) {
  for (const [rel, content] of Object.entries(entries)) {
    const full = path.join(root, rel)
    fs.mkdirSync(path.dirname(full), { recursive: true })
    fs.writeFileSync(full, content)
  }
}

test('copyWindowsPythonTree skips Python launcher executables', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-runtime-'))
  try {
    const src = path.join(tmp, 'src')
    const dest = path.join(tmp, 'dest')

    makeTree(src, {
      'python.exe': 'launcher',
      'python3.exe': 'launcher',
      'pythonw.exe': 'launcher',
      'python3w.exe': 'launcher',
      'Lib/site.py': 'print("ok")',
      'DLLs/python311.dll': 'dll'
    })

    copyWindowsPythonTree(src, dest)

    assert.equal(fs.existsSync(path.join(dest, 'python.exe')), false)
    assert.equal(fs.existsSync(path.join(dest, 'python3.exe')), false)
    assert.equal(fs.existsSync(path.join(dest, 'pythonw.exe')), false)
    assert.equal(fs.existsSync(path.join(dest, 'python3w.exe')), false)
    assert.equal(fs.readFileSync(path.join(dest, 'Lib', 'site.py'), 'utf8'), 'print("ok")')
    assert.equal(fs.readFileSync(path.join(dest, 'DLLs', 'python311.dll'), 'utf8'), 'dll')
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
})

test('uvVenvArgs only passes options supported by uv venv', () => {
  assert.deepEqual(uvVenvArgs('runtime/venv', 'python.exe'), [
    'venv',
    'runtime/venv',
    '--python',
    'python.exe'
  ])
})
