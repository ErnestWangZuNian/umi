import esbuild from '@umijs/bundler-utils/compiled/esbuild';
import { logger } from '@umijs/utils';
import path from 'path';
import { esbuildAliasPlugin } from './esbuildPlugins/esbuildAliasPlugin';
import { esbuildExternalPlugin } from './esbuildPlugins/esbuildExternalPlugin';

export async function build(opts: {
  entryPoints: string[];
  watch?:
    | {
        onRebuildSuccess({ result }: { result: esbuild.BuildResult }): void;
      }
    | false;
  config: { alias?: any; cwd: string };
  plugins?: esbuild.Plugin[];
  write?: boolean;
}) {
  const outdir = path.join(path.dirname(opts.entryPoints[0]), 'out');
  const alias = opts.config?.alias || {};
  return await esbuild.build({
    // 需要指定 absWorkingDir 兼容 APP_ROOT 的情况
    absWorkingDir: opts.config.cwd,
    format: 'esm',
    platform: 'browser',
    target: 'esnext',
    loader: {
      // use tsx loader for js/jsx/ts/tsx files
      // since only ts support decorator
      '.js': 'tsx',
      '.jsx': 'tsx',
      '.ts': 'ts',
      '.tsx': 'tsx',
    },
    watch: !!opts.watch && {
      onRebuild(err, result) {
        if (err) {
          logger.error(`[icons] build failed: ${err}`);
        } else {
          if (opts.watch) {
            opts.watch.onRebuildSuccess({ result: result! });
          }
        }
      },
    },
    // do I need this?
    // incremental: true,
    bundle: true,
    logLevel: 'error',
    entryPoints: opts.entryPoints,
    write: opts.write || false,
    outdir,
    metafile: true,
    plugins: [
      // why externals must be in front of alias?
      // e.g.
      // if we have alias { 'foo': 'path' }
      // then we import 'foo/bar.less'
      // if we resolve alias first, we will get { path }
      // if we resolve externals first, we will get { external: true }
      esbuildExternalPlugin({ alias }),
      esbuildAliasPlugin({ alias }),
      ...(opts.plugins || []),
    ],
  });
}
