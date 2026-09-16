import { spawn } from 'child_process';

/**
 * Replacement for the `open` package. Launches the platform URL handler
 * detached, ignoring stdio, and never throws (matching the original usage
 * where failures are swallowed by the caller).
 */
export function open(url: string): void {
  let command: string;
  let args: string[];

  if (process.platform === 'darwin') {
    command = 'open';
    args = [url];
  } else if (process.platform === 'win32') {
    // `start` is a cmd builtin; the empty title keeps URLs with & intact.
    command = 'cmd';
    args = ['/c', 'start', '""', url.replace(/&/g, '^&')];
  } else {
    command = 'xdg-open';
    args = [url];
  }

  try {
    const child = spawn(command, args, {
      detached: true,
      stdio: 'ignore',
    });
    child.on('error', () => {});
    child.unref();
  } catch {
    // ignore, same as the original best-effort behavior
  }
}

export default open;
