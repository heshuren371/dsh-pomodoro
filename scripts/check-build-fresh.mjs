#!/usr/bin/env node
/**
 * CI gate: the committed `lib/` must be exactly what `src/` builds.
 *
 * GitHub installs run no build step, so a stale artifact ships stale behaviour.
 * This rebuilds and fails when git reports a difference under `lib/`.
 */
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(root)

execFileSync('node', ['scripts/build.mjs'], { stdio: 'inherit' })

const status = execFileSync('git', ['status', '--porcelain', '--', 'lib'], { encoding: 'utf8' }).trim()
if (status !== '') {
  console.error('\ncheck:fresh — lib/ is not in sync with src/:\n' + status)
  console.error('\nRun `pnpm run build` and commit the result.')
  process.exit(1)
}
console.log('check:fresh — lib/ matches src/')
