import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cargoBin = path.join(os.homedir(), '.cargo', 'bin')
const env = {
  ...process.env,
  PATH: `${cargoBin}${path.delimiter}${process.env.PATH || ''}`,
  // Reduce flaky STATUS_ACCESS_VIOLATION during parallel rustc on some Windows setups
  CARGO_BUILD_JOBS: process.env.CARGO_BUILD_JOBS || '1',
}

const args = process.argv.slice(2)
const tauriCli = path.join(root, 'node_modules', '@tauri-apps', 'cli', 'tauri.js')

const child = spawn(process.execPath, [tauriCli, ...args], {
  cwd: root,
  env,
  stdio: 'inherit',
  shell: false,
})

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 1)
})
