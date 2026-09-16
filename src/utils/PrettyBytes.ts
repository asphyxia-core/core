/**
 * Replacement for the `pretty-bytes` package (default options).
 */
const BYTE_UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

export function prettyBytes(number: number): string {
  if (!Number.isFinite(number)) {
    throw new TypeError(`Expected a finite number, got ${typeof number}: ${number}`);
  }

  const UNITS = BYTE_UNITS;

  const isNegative = number < 0;
  const prefix = isNegative ? '-' : '';

  if (isNegative) {
    number = -number;
  }

  if (number < 1) {
    return prefix + String(number) + ' ' + UNITS[0];
  }

  const exponent = Math.min(Math.floor(Math.log10(number) / 3), UNITS.length - 1);
  number /= Math.pow(1000, exponent);

  const numberString = String(Number(number.toPrecision(3)));

  return prefix + numberString + ' ' + UNITS[exponent];
}

export default prettyBytes;
