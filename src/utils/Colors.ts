/**
 * Minimal chalk-compatible terminal colors.
 *
 * Chalk only emits escape codes when the stream is a color-capable TTY
 * (unless FORCE_COLOR is set), which is the behavior the original
 * Asphyxia CORE relied on.
 */
function supportsColor(): boolean {
  if (process.env.NO_COLOR != null && process.env.NO_COLOR !== '') {
    return false;
  }
  const force = process.env.FORCE_COLOR;
  if (force != null && force !== '') {
    return force !== '0' && force.toLowerCase() !== 'false';
  }
  if (process.env.TERM === 'dumb') {
    return false;
  }
  return Boolean(process.stdout && process.stdout.isTTY);
}

const COLOR_ENABLED = supportsColor();

export function cyanBright(text: string): string {
  return COLOR_ENABLED ? `\x1b[96m${text}\x1b[39m` : text;
}

export function yellowBright(text: string): string {
  return COLOR_ENABLED ? `\x1b[93m${text}\x1b[39m` : text;
}

export function redBright(text: string): string {
  return COLOR_ENABLED ? `\x1b[91m${text}\x1b[39m` : text;
}

export default { cyanBright, yellowBright, redBright };
