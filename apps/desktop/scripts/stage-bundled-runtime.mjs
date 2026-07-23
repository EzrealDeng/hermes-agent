/**
 * Stage a bundled Hermes Python runtime for the desktop installer.
 *
 * Output layout:
 *   apps/desktop/build/hermes-runtime/
 *     venv/...
 *
 * Source priority:
 *   1. HERMES_DESKTOP_BUNDLED_RUNTIME_DIR
 *   2. apps/desktop/config/hermes-runtime/
 *   3. build from this checkout with uv/python when requested
 *   4. a neutral placeholder directory
 *
 * The packaged app later prefers this runtime over the first-launch bootstrap
 * path, so the installer can ship a self-contained local Hermes backend.
 */

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

import { isMain } from './utils.mjs'

const DESKTOP_ROOT = path.resolve(import.meta.dirname, '..')
const REPO_ROOT = path.resolve(DESKTOP_ROOT, '..', '..')
const OUT_DIR = path.join(DESKTOP_ROOT, 'build', 'hermes-runtime')
const VENV_DIR = path.join(OUT_DIR, 'venv')
const SOURCE_DIR = process.env.HERMES_DESKTOP_BUNDLED_RUNTIME_DIR
  ? path.resolve(process.env.HERMES_DESKTOP_BUNDLED_RUNTIME_DIR)
  : path.join(DESKTOP_ROOT, 'config', 'hermes-runtime')

function rmrf(target) {
  fs.rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
}

function copyTree(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.cpSync(src, dest, { recursive: true, force: true, dereference: true })
}

export function copyTreeRecursive(src, dest, { excludeNames = new Set() } = {}) {
  const base = path.basename(src).toLowerCase()
  if (excludeNames.has(base)) {
    return
  }

  const stat = fs.statSync(src)

  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true })
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      copyTreeRecursive(path.join(src, entry.name), path.join(dest, entry.name), { excludeNames })
    }
    return
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(src, dest)
}

export function copyWindowsPythonTree(src, dest) {
  // setup-python exposes python3*.exe aliases that 7-Zip can mistake for
  // directories. Keep the real launchers: venv\Scripts\python.exe resolves
  // its relocated base interpreter through ..\..\python\python.exe.
  const excluded = new Set(['python3.exe', 'python3w.exe'])
  copyTreeRecursive(src, dest, { excludeNames: excluded })
}

function findCommand(command) {
  const paths = String(process.env.PATH || '').split(path.delimiter)
  const exts = process.platform === 'win32' ? (process.env.PATHEXT || '.EXE;.CMD;.BAT').split(';') : ['']

  for (const dir of paths) {
    if (!dir) continue
    for (const ext of exts) {
      const candidate = path.join(dir, `${command}${ext}`)
      if (fs.existsSync(candidate)) return candidate
    }
  }

  return null
}

function venvPythonPath(venvDir) {
  return path.join(venvDir, process.platform === 'win32' ? 'Scripts' : 'bin', process.platform === 'win32' ? 'python.exe' : 'python')
}

export function uvVenvArgs(venvDir, python) {
  return ['venv', venvDir, '--python', python]
}

function readPyvenvHome(venvDir) {
  const cfg = path.join(venvDir, 'pyvenv.cfg')

  if (!fs.existsSync(cfg)) {
    return null
  }

  const match = fs.readFileSync(cfg, 'utf8').match(/^home\s*=\s*(.+)$/m)

  return match ? match[1].trim() : null
}

function bundleBasePythonRuntime() {
  const cfg = path.join(VENV_DIR, 'pyvenv.cfg')
  const home = readPyvenvHome(VENV_DIR)

  if (!home) {
    throw new Error(`Could not determine base Python home from ${path.join(VENV_DIR, 'pyvenv.cfg')}`)
  }

  const baseRoot = ['bin', 'Scripts'].includes(path.basename(home)) ? path.dirname(home) : home
  const bundledPythonRoot = path.join(OUT_DIR, 'python')

  if (!fs.existsSync(baseRoot)) {
    throw new Error(`Base Python runtime does not exist: ${baseRoot}`)
  }

  rmrf(bundledPythonRoot)
  if (process.platform === 'win32') {
    copyWindowsPythonTree(baseRoot, bundledPythonRoot)
  } else {
    copyTree(baseRoot, bundledPythonRoot)
  }

  if (process.platform !== 'win32') {
    const venvBin = path.join(VENV_DIR, 'bin')
    const python = path.join(venvBin, 'python')
    const bundledPython = path.join('..', '..', 'python', 'bin', 'python3.11')

    rmrf(python)
    fs.symlinkSync(bundledPython, python)

    const cfgText = fs.readFileSync(cfg, 'utf8')
    fs.writeFileSync(cfg, cfgText.replace(/^home\s*=.*$/m, 'home = ../../python/bin'), 'utf8')
  } else {
    const cfgText = fs.readFileSync(cfg, 'utf8')
    fs.writeFileSync(cfg, cfgText.replace(/^home\s*=.*$/m, 'home = ../../python'), 'utf8')
  }
}

function createPlaceholderRuntime() {
  fs.mkdirSync(VENV_DIR, { recursive: true })
  fs.writeFileSync(
    path.join(OUT_DIR, 'README.txt'),
    'Hermes Desktop bundled runtime placeholder.\nBuild with HERMES_DESKTOP_BUNDLE_PYTHON_RUNTIME=1 or provide a prebuilt runtime directory.\n',
    'utf8'
  )
}

function buildRuntimeFromCheckout() {
  const uv = findCommand('uv')
  const python = process.env.HERMES_DESKTOP_RUNTIME_PYTHON || findCommand('python3.11') || findCommand('python3') || findCommand('python')

  if (!python) {
    throw new Error('No Python interpreter found for bundled runtime build.')
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })

  if (uv) {
    let result = spawnSync(uv, uvVenvArgs(VENV_DIR, python), {
      cwd: REPO_ROOT,
      stdio: 'inherit',
      env: { ...process.env, UV_NO_CONFIG: '1' }
    })

    if (result.status !== 0) {
      throw new Error(`uv venv failed with exit code ${result.status}`)
    }

    result = spawnSync(
      uv,
      ['pip', 'install', '--python', venvPythonPath(VENV_DIR), '-e', '.[all]'],
      {
        cwd: REPO_ROOT,
        stdio: 'inherit',
        env: { ...process.env, UV_NO_CONFIG: '1' }
      }
    )

    if (result.status !== 0) {
      throw new Error(`uv pip install failed with exit code ${result.status}`)
    }

    bundleBasePythonRuntime()

    return
  }

  const venvModule = spawnSync(python, ['-m', 'venv', '--copies', VENV_DIR], {
    cwd: REPO_ROOT,
    stdio: 'inherit'
  })

  if (venvModule.status !== 0) {
    throw new Error(`python -m venv failed with exit code ${venvModule.status}`)
  }

  const pip = venvPythonPath(VENV_DIR)
  const install = spawnSync(pip, ['-m', 'pip', 'install', '-e', '.[all]'], {
    cwd: REPO_ROOT,
    stdio: 'inherit'
  })

  if (install.status !== 0) {
    throw new Error(`pip install failed with exit code ${install.status}`)
  }

  bundleBasePythonRuntime()
}

function main() {
  rmrf(OUT_DIR)

  if (SOURCE_DIR && fs.existsSync(SOURCE_DIR)) {
    copyTree(SOURCE_DIR, OUT_DIR)
    console.log(`[stage-bundled-runtime] copied runtime from ${SOURCE_DIR}`)
    return
  }

  if (String(process.env.HERMES_DESKTOP_BUNDLE_PYTHON_RUNTIME || '') === '1') {
    buildRuntimeFromCheckout()
    console.log(`[stage-bundled-runtime] built runtime into ${OUT_DIR}`)
    return
  }

  createPlaceholderRuntime()
  console.log(`[stage-bundled-runtime] wrote placeholder runtime at ${OUT_DIR}`)
}

if (isMain(import.meta.url)) {
  main()
}
