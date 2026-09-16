import path from 'path';

declare const Bun: any;

/** True when running from a `bun build --compile` standalone binary. */
export const IS_COMPILED =
  typeof Bun !== 'undefined' && String(Bun.main || '').startsWith('/$bunfs/');

/** True for any packaged/standalone build (Bun compiled or legacy pkg). */
export const IS_PACKAGED = IS_COMPILED || Boolean((process as any).pkg);

/** Directory that holds config.ini, plugins/ and savedata/. */
export const EXEC_PATH = path.resolve(
  IS_COMPILED
    ? path.dirname(process.execPath)
    : (process as any).pkg
    ? path.dirname(process.argv0)
    : process.cwd()
);

/** Directory holding the WebUI assets (views, static files, changelog). */
export const ASSETS_PATH = IS_PACKAGED
  ? path.join(path.dirname(process.execPath), 'assets')
  : path.resolve(EXEC_PATH, 'assets');
