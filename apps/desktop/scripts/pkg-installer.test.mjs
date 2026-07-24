import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { test } from 'vitest'

const desktopRoot = path.resolve(import.meta.dirname, '..')
const packageJson = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'package.json'), 'utf8'))
const postinstall = fs.readFileSync(path.join(import.meta.dirname, 'pkg', 'postinstall'), 'utf8')

test('macOS PKG installs the bundled app into Applications', () => {
  assert.equal(packageJson.scripts['dist:mac:pkg'], 'npm run build && npm run builder -- --mac pkg')
  assert.deepEqual(packageJson.build.pkg, {
    scripts: '../scripts/pkg',
    installLocation: '/Applications',
    allowAnywhere: false,
    allowCurrentUserHome: false,
    allowRootDirectory: true,
    isRelocatable: false
  })
})

test('macOS PKG registers Hermes and preserves an existing command', () => {
  assert.match(postinstall, /bin_dir="\/usr\/local\/bin"/)
  assert.match(postinstall, /bundled_command="\$bin_dir\/hermes-bundled"/)
  assert.match(postinstall, /Hermes Bundled\.app\/Contents\/Resources\/hermes-runtime/)
  assert.match(postinstall, /exec "\$python" -m hermes_cli\.main "\$@"/)
  assert.match(postinstall, /ln -s "\$bundled_command" "\$hermes_command"/)
  assert.match(postinstall, /hermes\.pre-hermes-bundled/)
  assert.match(postinstall, /mv "\$hermes_command" "\$backup_command"/)
})
