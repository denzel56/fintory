import { spawn } from 'node:child_process'
import http from 'node:http'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const devServerHost = '127.0.0.1'
const devServerPort = 5173
const devServerUrl = `http://${devServerHost}:${devServerPort}/`
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
  runCommand(process.execPath, [viteCliPath, '--host', devServerHost, '--strictPort'])

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

const assertDevServerPortAvailable = () =>
  new Promise((resolve, reject) => {
    const server = net.createServer()

    server.once('error', () => {
      reject(
        new Error(
          `Port ${devServerPort} is already in use. Stop the existing Vite dev server before running dev:electron.`,
        ),
      )
    })

    server.once('listening', () => {
      server.close(resolve)
    })

    server.listen(devServerPort, devServerHost)
  })

const waitForViteStartup = (viteProcess) =>
  new Promise((resolve, reject) => {
    const handleViteExit = (code) => {
      reject(
        new Error(
          `Vite dev server exited before startup completed with exit code ${code ?? 0}.`,
        ),
      )
    }

    viteProcess.once('exit', handleViteExit)

    waitForDevServer()
      .then(() => {
        viteProcess.off('exit', handleViteExit)
        resolve()
      })
      .catch((error) => {
        viteProcess.off('exit', handleViteExit)
        reject(error)
      })
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

let viteProcess = null
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
  await assertDevServerPortAvailable()
  viteProcess = runVite()
  await Promise.all([buildMainProcess(), waitForViteStartup(viteProcess)])

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
