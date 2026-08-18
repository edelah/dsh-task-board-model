import { defineConfig } from 'tsdown'

/**
 * The DSH web loader consumes one host bundle and one browser bundle. Keep
 * framework/runtime packages external so DSH supplies its singleton modules.
 */
export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
      invariant: 'src/invariant.ts',
    },
    outDir: 'lib',
    format: ['esm'],
    fixedExtension: false,
    outExtensions: () => ({ js: '.js' }),
    dts: false,
    sourcemap: true,
    clean: false,
    deps: { neverBundle: [/^@deepseek-ai\//, /^react(?:[-/]|$)/, 'schemastery'] },
  },
  {
    entry: {
      client: 'src/client/index.ts',
    },
    outDir: 'lib',
    format: ['cjs'],
    platform: 'browser',
    fixedExtension: false,
    outExtensions: () => ({ js: '.js' }),
    banner: 'window.__ModuleLoader__.load({ id: "dsh-task-board-model", factory: (require) => { var module = { exports: {} }; var exports = module.exports;',
    footer: 'return module.exports; }});',
    css: { inject: true },
    dts: false,
    sourcemap: true,
    clean: false,
    deps: { neverBundle: [/^@deepseek-ai\//, /^react(?:[-/]|$)/, 'schemastery'] },
  },
])
