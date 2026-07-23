import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { test } from 'vitest'

import { readPackagedDesktopConnectionConfig } from './default-connection'

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-default-connection-'))
}

test('readPackagedDesktopConnectionConfig returns null when no candidate exists', () => {
  assert.equal(
    readPackagedDesktopConnectionConfig({
      appRoot: makeTempDir(),
      resourcesPath: null
    }),
    null
  )
})

test('readPackagedDesktopConnectionConfig prefers the packaged resource over build output', () => {
  const root = makeTempDir()
  const resources = makeTempDir()
  const packaged = path.join(resources, 'default-connection.json')
  const build = path.join(root, 'build', 'default-connection.json')

  fs.mkdirSync(path.dirname(packaged), { recursive: true })
  fs.mkdirSync(path.dirname(build), { recursive: true })
  fs.writeFileSync(packaged, JSON.stringify({ source: 'packaged' }))
  fs.writeFileSync(build, JSON.stringify({ source: 'build' }))

  const result = readPackagedDesktopConnectionConfig({
    appRoot: root,
    resourcesPath: resources
  })

  assert.equal(result?.path, packaged)
  assert.deepEqual(result?.config, { source: 'packaged' })
})

test('readPackagedDesktopConnectionConfig skips malformed packaged JSON and falls back to build output', () => {
  const root = makeTempDir()
  const resources = makeTempDir()
  const packaged = path.join(resources, 'default-connection.json')
  const build = path.join(root, 'build', 'default-connection.json')

  fs.mkdirSync(path.dirname(packaged), { recursive: true })
  fs.mkdirSync(path.dirname(build), { recursive: true })
  fs.writeFileSync(packaged, '{')
  fs.writeFileSync(build, JSON.stringify({ source: 'build' }))

  const result = readPackagedDesktopConnectionConfig({
    appRoot: root,
    resourcesPath: resources
  })

  assert.equal(result?.path, build)
  assert.deepEqual(result?.config, { source: 'build' })
})
