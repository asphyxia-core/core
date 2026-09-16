/**
 * Dependency-free port of the `hashids` package (MIT) as used by
 * Asphyxia CORE: `new Hashids('AsphyxiaCORE', 15, '0123456789ABCDEF')`.
 * Outputs are byte-identical to hashids v2 for the same inputs.
 */
const MIN_ALPHABET_LENGTH = 16;
const SEPARATOR_DIV = 3.5;
const GUARD_DIV = 12;
const HEXADECIMAL = 16;
const SPLIT_AT_EVERY_NTH = 12;
const MODULO_PART = 100;

const DEFAULT_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
const DEFAULT_SEPS = 'cfhistuCFHISTU';

function keepUnique(content: string[]): string[] {
  return [...new Set(content)];
}

function withoutChars(chars: string[], charsToExclude: string[]): string[] {
  return chars.filter(char => !charsToExclude.includes(char));
}

function onlyChars(chars: string[], keepChars: string[]): string[] {
  return chars.filter(char => keepChars.includes(char));
}

function isIntegerNumber(n: any): boolean {
  return typeof n === 'bigint' || (!Number.isNaN(Number(n)) && Math.floor(Number(n)) === n);
}

function isPositiveAndFinite(n: any): boolean {
  return typeof n === 'bigint' || (n >= 0 && Number.isSafeInteger(n));
}

function shuffle(alphabetChars: string[], saltChars: string[]): string[] {
  if (saltChars.length === 0) {
    return alphabetChars;
  }

  let integer: number;
  const transformed = [...alphabetChars];
  for (let i = transformed.length - 1, v = 0, p = 0; i > 0; i--, v++) {
    v %= saltChars.length;
    p += integer = saltChars[v].codePointAt(0);
    const j = (integer + v + p) % i;
    const a = transformed[i];
    const b = transformed[j];
    transformed[j] = a;
    transformed[i] = b;
  }
  return transformed;
}

function toAlphabet(input: number | bigint, alphabetChars: string[]): string[] {
  const id: string[] = [];
  let value = input;
  if (typeof value === 'bigint') {
    const alphabetLength = BigInt(alphabetChars.length);
    do {
      id.unshift(alphabetChars[Number(value % alphabetLength)]);
      value /= alphabetLength;
    } while (value > BigInt(0));
  } else {
    do {
      id.unshift(alphabetChars[value % alphabetChars.length]);
      value = Math.floor(value / alphabetChars.length);
    } while (value > 0);
  }
  return id;
}

function fromAlphabet(inputChars: string[], alphabetChars: string[]): number | bigint {
  return inputChars.reduce((carry: number | bigint, item: string) => {
    const index = alphabetChars.indexOf(item);
    if (index === -1) {
      throw new Error(
        `The provided ID (${inputChars.join(
          ''
        )}) is invalid, as it contains characters that do not exist in the alphabet (${alphabetChars.join(
          ''
        )})`
      );
    }
    if (typeof carry === 'bigint') {
      return carry * BigInt(alphabetChars.length) + BigInt(index);
    }
    const value = (carry as number) * alphabetChars.length + index;
    if (Number.isSafeInteger(value)) {
      return value;
    }
    return BigInt(carry) * BigInt(alphabetChars.length) + BigInt(index);
  }, 0);
}

function makeAnyOfCharsRegExp(chars: string[]): RegExp {
  return new RegExp(
    chars
      .map(char => escapeRegExp(char))
      .sort((a, b) => b.length - a.length)
      .join('|')
  );
}

function makeAtLeastSomeCharRegExp(chars: string[]): RegExp {
  return new RegExp(
    `^[${chars
      .map(char => escapeRegExp(char))
      .sort((a, b) => b.length - a.length)
      .join('')}]+$`
  );
}

function escapeRegExp(text: string): string {
  return text.replace(/[\s#$()*+,.?[\\\]^{|}-]/g, '\\$&');
}

export default class Hashids {
  private salt: string[];
  private alphabet: string[];
  private seps: string[];
  private guards: string[];
  private minLength: number;
  private guardsRegExp: RegExp;
  private sepsRegExp: RegExp;
  private allowedCharsRegExp: RegExp;

  constructor(
    salt = '',
    minLength = 0,
    alphabet = DEFAULT_ALPHABET,
    seps = DEFAULT_SEPS
  ) {
    this.minLength = minLength;

    const saltChars = Array.from(salt);
    const alphabetChars = Array.from(alphabet);
    const sepsChars = Array.from(seps);
    this.salt = saltChars;

    const uniqueAlphabet = keepUnique(alphabetChars);
    if (uniqueAlphabet.length < MIN_ALPHABET_LENGTH) {
      throw new Error(
        `Hashids: alphabet must contain at least ${MIN_ALPHABET_LENGTH} unique characters, provided: ${uniqueAlphabet.join(
          ''
        )}`
      );
    }

    /** `alphabet` should not contains `seps` */
    this.alphabet = withoutChars(uniqueAlphabet, sepsChars);
    /** `seps` should contain only characters present in `alphabet` */
    const filteredSeps = onlyChars(sepsChars, uniqueAlphabet);
    this.seps = shuffle(filteredSeps, saltChars);

    let sepsLength: number;
    let diff: number;
    if (this.seps.length === 0 || this.alphabet.length / this.seps.length > SEPARATOR_DIV) {
      sepsLength = Math.ceil(this.alphabet.length / SEPARATOR_DIV);
      if (sepsLength > this.seps.length) {
        diff = sepsLength - this.seps.length;
        this.seps.push(...this.alphabet.slice(0, diff));
        this.alphabet = this.alphabet.slice(diff);
      }
    }

    this.alphabet = shuffle(this.alphabet, saltChars);
    const guardCount = Math.ceil(this.alphabet.length / GUARD_DIV);

    if (this.alphabet.length < 3) {
      this.guards = this.seps.slice(0, guardCount);
      this.seps = this.seps.slice(guardCount);
    } else {
      this.guards = this.alphabet.slice(0, guardCount);
      this.alphabet = this.alphabet.slice(guardCount);
    }

    this.guardsRegExp = makeAnyOfCharsRegExp(this.guards);
    this.sepsRegExp = makeAnyOfCharsRegExp(this.seps);
    this.allowedCharsRegExp = makeAtLeastSomeCharRegExp([
      ...this.alphabet,
      ...this.guards,
      ...this.seps,
    ]);
  }

  public encode(first: number | number[], ...inputNumbers: number[]): string {
    let numbers: (number | bigint)[] = Array.isArray(first)
      ? first
      : [...(first != null ? [first] : []), ...inputNumbers];

    if (numbers.length === 0) {
      return '';
    }

    if (!numbers.every(isIntegerNumber)) {
      numbers = numbers.map(n => (typeof n === 'bigint' || typeof n === 'number' ? n : parseInt(String(n), 10)));
    }

    if (!numbers.every(isPositiveAndFinite)) {
      return '';
    }

    return this._encode(numbers).join('');
  }

  public decode(id: string): (number | bigint)[] {
    if (!id || typeof id !== 'string' || id.length === 0) {
      return [];
    }
    return this._decode(id);
  }

  public encodeHex(inputHex: string | bigint): string {
    let hex = inputHex;
    switch (typeof hex) {
      case 'bigint':
        hex = hex.toString(HEXADECIMAL);
        break;
      case 'string':
        if (!/^[\dA-Fa-f]+$/.test(hex)) return '';
        break;
      default:
        throw new Error(
          `Hashids: The provided value is neither a string, nor a BigInt (got: ${typeof hex})`
        );
    }

    const numbers = splitAtIntervalAndMap(hex, SPLIT_AT_EVERY_NTH, part =>
      Number.parseInt(`1${part}`, 16)
    );
    return this.encode(numbers);
  }

  public decodeHex(id: string): string {
    return this.decode(id)
      .map(number => number.toString(HEXADECIMAL).slice(1))
      .join('');
  }

  public isValidId(id: string): boolean {
    return this.allowedCharsRegExp.test(id);
  }

  private _encode(numbers: (number | bigint)[]): string[] {
    let { alphabet } = this;
    const numbersIdInt = numbers.reduce<number>(
      (last, number, i) =>
        last +
        (typeof number === 'bigint'
          ? Number(number % BigInt(i + MODULO_PART))
          : number % (i + MODULO_PART)),
      0
    );

    let ret = [alphabet[numbersIdInt % alphabet.length]];
    const lottery = [...ret];
    const { seps } = this;
    const { guards } = this;

    numbers.forEach((number, i) => {
      const buffer = lottery.concat(this.salt, alphabet);
      alphabet = shuffle(alphabet, buffer);
      const last = toAlphabet(number, alphabet);
      ret.push(...last);

      if (i + 1 < numbers.length) {
        const charCode = last[0].codePointAt(0) + i;
        const extraNumber =
          typeof number === 'bigint' ? Number(number % BigInt(charCode)) : number % charCode;
        ret.push(seps[extraNumber % seps.length]);
      }
    });

    if (ret.length < this.minLength) {
      const prefixGuardIndex = (numbersIdInt + ret[0].codePointAt(0)) % guards.length;
      ret.unshift(guards[prefixGuardIndex]);

      if (ret.length < this.minLength) {
        const suffixGuardIndex = (numbersIdInt + ret[2].codePointAt(0)) % guards.length;
        ret.push(guards[suffixGuardIndex]);
      }
    }

    const halfLength = Math.floor(alphabet.length / 2);
    while (ret.length < this.minLength) {
      alphabet = shuffle(alphabet, alphabet);
      ret.unshift(...alphabet.slice(halfLength));
      ret.push(...alphabet.slice(0, halfLength));

      const excess = ret.length - this.minLength;
      if (excess > 0) {
        const halfOfExcess = excess / 2;
        ret = ret.slice(halfOfExcess, halfOfExcess + this.minLength);
      }
    }

    return ret;
  }

  private _decode(id: string): (number | bigint)[] {
    if (!this.isValidId(id)) {
      throw new Error(
        `The provided ID (${id}) is invalid, as it contains characters that do not exist in the alphabet (${this.guards.join(
          ''
        )}${this.seps.join('')}${this.alphabet.join('')})`
      );
    }

    const idGuardsArray = id.split(this.guardsRegExp);
    const splitIndex = idGuardsArray.length === 3 || idGuardsArray.length === 2 ? 1 : 0;
    const idBreakdown = idGuardsArray[splitIndex];
    if (idBreakdown.length === 0) return [];

    const lotteryChar = idBreakdown[Symbol.iterator]().next().value as string;
    const idArray = idBreakdown.slice(lotteryChar.length).split(this.sepsRegExp);
    let lastAlphabet = this.alphabet;
    const result: (number | bigint)[] = [];

    for (const subId of idArray) {
      const buffer = [lotteryChar, ...this.salt, ...lastAlphabet];
      const nextAlphabet = shuffle(lastAlphabet, buffer.slice(0, lastAlphabet.length));
      result.push(fromAlphabet(Array.from(subId), nextAlphabet));
      lastAlphabet = nextAlphabet;
    }

    if (this._encode(result).join('') !== id) {
      return [];
    }

    return result;
  }
}

function splitAtIntervalAndMap(
  str: string,
  nth: number,
  map: (part: string) => number
): number[] {
  return Array.from({ length: Math.ceil(str.length / nth) }, (_, index) =>
    map(str.slice(index * nth, (index + 1) * nth))
  );
}
