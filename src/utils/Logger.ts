import { cyanBright, yellowBright } from './Colors';
import { IS_PACKAGED } from './Env';

/**
 * Standalone replacement for the winston logger.
 *
 * Level colors are emitted unconditionally (matching winston's
 * `format.colorize()`, which forces colors on), while the plugin name
 * uses TTY-aware colors (matching the original chalk usage).
 *
 * The message handling below mirrors winston's `log()` semantics:
 *  - `Logger.error(err)` prints `err.message` and the stack.
 *  - `Logger.error(err, meta)` stringifies the error ("Error: ...") and
 *    uses `meta.stack` when present.
 *  - `info` messages from the core plugin are printed without any prefix
 *    (and without a stack), everything else gets `  [plugin] level: msg`.
 */
export type LogMeta = { plugin?: any } & Record<string, any>;

const LEVEL_COLORS: { [key: string]: string } = {
  error: '31',
  warn: '33',
  info: '32',
  debug: '34',
};

/** Packaged builds suppress debug messages, exactly like winston's `level: 'info'`. */
const isDebug = !IS_PACKAGED;

function colorizeLevel(level: string): string {
  const color = LEVEL_COLORS[level];
  if (!color) return level;
  return `\x1b[${color}m${level}\x1b[39m`;
}

function render(level: 'info' | 'warn' | 'error' | 'debug', message: any, meta?: LogMeta): string {
  const plugin = (meta && meta.plugin) || 'core';

  let stack = '';
  let text: string;

  if (meta !== undefined) {
    if (meta.message) {
      message = `${message} ${meta.message}`;
    }
    if (meta.stack) {
      stack = `\n${meta.stack}`;
    } else if (message && typeof message === 'object' && message.stack) {
      stack = `\n${message.stack}`;
    }
    text = message instanceof Error ? message.toString() : String(message);
  } else if (message instanceof Error) {
    stack = message.stack ? `\n${message.stack}` : '';
    text = message.message;
  } else if (message && typeof message === 'object' && (message as any).stack) {
    stack = `\n${(message as any).stack}`;
    text = String((message as any).message);
  } else {
    text = String(message);
  }

  const pluginName = plugin == 'core' ? cyanBright('core') : yellowBright(plugin);

  if (level === 'info') {
    if (plugin == 'core') {
      return text;
    }
    return `  [${pluginName}] ${text}` + stack;
  }

  return `  [${pluginName}] ${colorizeLevel(level)}: ${text}` + stack;
}

function write(level: 'info' | 'warn' | 'error' | 'debug', message: any, meta?: LogMeta) {
  const line = render(level, message, meta);
  if (level === 'error') {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
  }
}

export const Logger = {
  info: (message: any, meta?: LogMeta) => write('info', message, meta),
  warn: (message: any, meta?: LogMeta) => write('warn', message, meta),
  error: (message: any, meta?: LogMeta) => write('error', message, meta),
  debug: (message: any, meta?: LogMeta) => {
    if (isDebug) write('debug', message, meta);
  },
};
