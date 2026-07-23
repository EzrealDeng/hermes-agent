import fs from 'node:fs'
import path from 'node:path'

const DEFAULT_CONNECTION_RESOURCE_NAME = 'default-connection.json'

function readPackagedDesktopConnectionConfig(options: {
  appRoot?: string
  resourcesPath?: string | null
  fsApi?: Pick<typeof fs, 'readFileSync'>
} = {}) {
  const fsApi = options.fsApi || fs
  const candidates = [
    options.resourcesPath ? path.join(options.resourcesPath, DEFAULT_CONNECTION_RESOURCE_NAME) : null,
    options.appRoot ? path.join(options.appRoot, 'build', DEFAULT_CONNECTION_RESOURCE_NAME) : null
  ].filter((candidate): candidate is string => Boolean(candidate))

  for (const candidate of candidates) {
    try {
      const raw = fsApi.readFileSync(candidate, 'utf8')
      const parsed = JSON.parse(raw)

      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return {
          path: candidate,
          config: parsed as Record<string, unknown>
        }
      }
    } catch {
      continue
    }
  }

  return null
}

export { DEFAULT_CONNECTION_RESOURCE_NAME, readPackagedDesktopConnectionConfig }
