/**
 * Build the browser half (src/client -> lib/client.js) in the DSH client
 * module-table format: window.__ModuleLoader__.load({ id, factory }) with a
 * CJS factory resolving externals through the injected require (platform
 * modules + served bundles). Inline styles only - no CSS pipeline.
 * (Template: dsh-llm-failover scripts/build-client.mjs)
 */
import { build } from 'esbuild'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

/** Resolved from the loader module table at runtime (never inlined). */
const EXTERNALS = [
  'react',
  'react/jsx-runtime',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-runtime/client',
  // Runtime-guarded require for the shared transient banner (FlashView).
  '@deepseek-ai/dsh-client-ui-primitives'
]

// Assembled with String.raw so backslash escapes survive every write path.
const BANNER = String.raw`window.__ModuleLoader__.load({
	id: "dsh-keepalive",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });`
const FOOTER = String.raw`
		return module.exports;
	}
});`

const result = await build({
  entryPoints: ['src/client/index.tsx'],
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  jsx: 'automatic',
  loader: { '.ts': 'ts', '.tsx': 'tsx' },
  external: EXTERNALS,
  write: false,
  banner: {
    js: BANNER
  },
  footer: {
    js: FOOTER
  }
})

const output = result.outputFiles[0]
if (output === undefined) throw new Error('esbuild produced no output')
mkdirSync(dirname('lib/client.js'), { recursive: true })
writeFileSync('lib/client.js', output.text)
console.log('built lib/client.js (' + output.text.length + ' bytes)')
