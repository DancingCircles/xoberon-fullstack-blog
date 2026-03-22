/**
 * Vitest wrapper: 监测 stdout/stderr 输出，当静默超过阈值后强制退出。
 * 解决 Windows 上 vitest run 进程挂起不退出的问题。
 */
import { spawn, execSync } from 'node:child_process'

const SILENCE_MS = 10_000
const HARD_TIMEOUT_MS = 120_000

function killTree(pid) {
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' })
    } else {
      process.kill(pid, 'SIGTERM')
    }
  } catch { /* already dead */ }
}

const child = process.platform === 'win32'
  ? spawn('npx vitest run', [], {
      shell: true,
      stdio: ['inherit', 'pipe', 'pipe'],
    })
  : spawn('npx', ['vitest', 'run'], {
      stdio: ['inherit', 'pipe', 'pipe'],
    })

let failed = false
let timer

function resetTimer() {
  clearTimeout(timer)
  timer = setTimeout(() => {
    killTree(child.pid)
    process.exit(failed ? 1 : 0)
  }, SILENCE_MS)
}

resetTimer()

child.stdout.on('data', (chunk) => {
  const text = chunk.toString()
  process.stdout.write(text)
  if (/FAIL|×/.test(text)) failed = true
  resetTimer()
})

child.stderr.on('data', (chunk) => {
  process.stderr.write(chunk)
  resetTimer()
})

child.on('exit', (code) => {
  clearTimeout(timer)
  clearTimeout(hardTimer)
  process.exit(code ?? 0)
})

const hardTimer = setTimeout(() => {
  killTree(child.pid)
  process.exit(1)
}, HARD_TIMEOUT_MS)
