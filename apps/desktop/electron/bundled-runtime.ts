import path from 'node:path'

export function getBundledRuntimePython(
  runtimeRoot: string,
  platform = process.platform,
  pathModule = platform === 'win32' ? path.win32 : path.posix
): string {
  return platform === 'win32'
    ? pathModule.join(runtimeRoot, 'python', 'python.exe')
    : pathModule.join(runtimeRoot, 'venv', 'bin', 'python')
}
