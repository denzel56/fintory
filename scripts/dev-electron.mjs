import { spawn } from 'node:child_process'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const devServerUrl = 'http://127.0.0.1:5173/'
const npmCliPath = process.env.npm_execpath
const currentFilePath = fileURLToPath(import.meta.url)
const projectRoot = path.resolve(path.dirname(currentFilePath), '..')
const viteCliPath = path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js')

const runCommand = (command, args, options = {}) => {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: false,
    ...options,
  })

  return child
}

const runNpm = (args, options = {}) => {
  if (npmCliPath) {
    return runCommand(process.execPath, [npmCliPath, ...args], options)
  }

  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  return runCommand(npmCommand, args, options)
}

const runVite = () =>
  runCommand(process.execPath, [viteCliPath, '--host', '127.0.0.1', '--strictPort'])

const stopProcessTree = (childProcess) => {
  if (!childProcess || childProcess.killed) {
    return
  }

  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(childProcess.pid), '/t', '/f'], {
      stdio: 'ignore',
      windowsHide: true,
    })
    return
  }

  childProcess.kill()
}

const waitForDevServer = () =>
  new Promise((resolve, reject) => {
    const startedAt = Date.now()
    const timeoutMs = 30_000

    const poll = () => {
      const request = http.get(devServerUrl, (response) => {
        response.resume()
        resolve()
      })

      request.on('error', () => {
        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error('Timed out waiting for Vite dev server.'))
          return
        }

        setTimeout(poll, 250)
      })
    }

    poll()
  })

const buildMainProcess = () =>
  new Promise((resolve, reject) => {
    const build = runNpm(['run', 'build:electron'])

    build.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`Electron main process build failed with exit code ${code}.`))
    })
  })

const viteProcess = runVite()
let electronProcess = null
let isStopping = false

const stopChildProcesses = () => {
  if (isStopping) {
    return
  }

  isStopping = true
  stopProcessTree(electronProcess)
  stopProcessTree(viteProcess)
}

process.on('SIGINT', () => {
  stopChildProcesses()
  process.exit(130)
})

process.on('SIGTERM', () => {
  stopChildProcesses()
  process.exit(143)
})

try {
  await buildMainProcess()
  await waitForDevServer()

  electronProcess = runNpm(['exec', 'electron', '.'], {
    env: {
      ...process.env,
      VITE_DEV_SERVER_URL: devServerUrl,
    },
  })

  electronProcess.on('exit', (code) => {
    stopChildProcesses()
    process.exit(code ?? 0)
  })
} catch (error) {
  stopChildProcesses()
  console.error(error)
  process.exit(1)
}
