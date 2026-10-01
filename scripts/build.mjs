#!/usr/bin/env node
/**
 * Build both halves of the bundle.
 *
 * - `lib/client.js` — ONE self-contained script with no imports. The shell hands
 *   this file to the browser and evaluates it there, so relative imports cannot
 *   survive the trip; the Client source is therefore split into modules, and
 *   esbuild folds them back into a single IIFE. Platform words (`react`,
 *   `react-dom`) are never static imports: `src/platform.ts` receives the
 *   module-table `require` from the factory at runtime.
 * - `lib/index.js`, `lib/core/*.js` — the typed Host half and the pure core,
 *   emitted by tsc so the shipped artifact is exactly what the unit tests import.
 *
 * `lib/` is committed (the plugin is installed from GitHub, which runs no build
 * step); `pnpm run check:fresh` catches drift between src/ and lib/.
 */
import { execFileSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { build } from 'esbuild'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(root)

rmSync('lib', { recursive: true, force: true })

const result = await build({
  entryPoints: ['src/client.ts'],
  outfile: 'lib/client.js',
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  legalComments: 'none',
  charset: 'utf8',
  logLevel: 'warning',
  banner: {
    js: '/* @local/dsh-pomodoro — generated from src/ by `pnpm run build`; do not edit. */',
  },
})

if (result.warnings.length > 0) {
  for (const warning of result.warnings) console.warn('esbuild:', warning.text)
}

execFileSync('tsc', ['-p', 'tsconfig.build.json'], { stdio: 'inherit' })

console.log('build: lib/client.js (bundled) + lib/index.js, lib/core/*.js (tsc)')
