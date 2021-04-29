import { Logger } from './Logger';

export type BinaryLengthType = BinaryBigIntType | BinaryNumberType;

type BinaryNumberType = 's8' | 's16' | 's32' | 'u8' | 'u16' | 'u32';

type BinaryBigIntType = 's64' | 'u64';

type BufferMethodType =
  | 'readInt8'
  | 'readInt16BE'
  | 'readInt32BE'
  | 'readUInt8'
  | 'readUInt16BE'
  | 'readUInt32BE'
  | 'readBigUInt64BE'
  | 'readBigInt64BE'
  | 'readFloatBE'
  | 'readDoubleBE';

type BufferWriteType =
  | 'writeInt8'
  | 'writeInt16BE'
  | 'writeInt32BE'
  | 'writeUInt8'
  | 'writeUInt16BE'
  | 'writeUInt32BE'
  | 'writeFloatBE'
  | 'writeDoubleBE';

const BUFFER_METHOD_MAP: { [key: string]: BufferMethodType } = {
  s8: 'readInt8',
  s16: 'readInt16BE',
  s32: 'readInt32BE',
  s64: 'readBigInt64BE',
  u8: 'readUInt8',
  u16: 'readUInt16BE',
  u32: 'readUInt32BE',
  u64: 'readBigUInt64BE',
  f: 'readFloatBE',
  d: 'readDoubleBE',
};

// 64bit is handled by special case
const BUFFER_WRITE_MAP: { [key: string]: BufferWriteType } = {
  s8: 'writeInt8',
  s16: 'writeInt16BE',
  s32: 'writeInt32BE',
  u8: 'writeUInt8',
  u16: 'writeUInt16BE',
  u32: 'writeUInt32BE',
  f: 'writeFloatBE',
  d: 'writeDoubleBE',
};

const NUMBER_CLAMP_MAP: { [key: string]: (x: number) => number } = {
  s8: x => Number(BigInt.asIntN(8, BigInt(~~x))),
  s16: x => Number(BigInt.asIntN(16, BigInt(~~x))),
  s32: x => Number(BigInt.asIntN(32, BigInt(~~x))),
  u8: x => Number(BigInt.asUintN(8, BigInt(~~x))),
  u16: x => Number(BigInt.asUintN(16, BigInt(~~x))),
  u32: x => Number(BigInt.asUintN(32, BigInt(~~x))),
  f: x => x,
  d: x => x,
};

const BINARY_LENGTH_MAP: { [key: string]: number } = {
  s8: 1,
  s16: 2,
  s32: 4,
  s64: 8,
  u8: 1,
  u16: 2,
  u32: 4,
  u64: 8,
  f: 4,
  d: 8,
};

// Buffer polyfill
if (process.version.startsWith('v10')) {
  Logger.debug('Polyfill: Bigint Buffer');

  const writeBigU_Int64BE = (buf: Buffer, value: bigint, offset: number) => {
    let lo = Number(value & BigInt(0xffffffff));
    buf[offset + 7] = lo;
    lo = lo >> 8;
    buf[offset + 6] = lo;
    lo = lo >> 8;
    buf[offset + 5] = lo;
    lo = lo >> 8;
    buf[offset + 4] = lo;
    let hi = Number((value >> BigInt(32)) & BigInt(0xffffffff));
    buf[offset + 3] = hi;
    hi = hi >> 8;
    buf[offset + 2] = hi;
    hi = hi >> 8;
    buf[offset + 1] = hi;
    hi = hi >> 8;
    buf[offset] = hi;
    return offset + 8;
  };

  Buffer.prototype.readBigUInt64BE = function (offset = 0) {
    const first = this[offset];
    const last = this[offset + 7];
    if (first === undefined || last === undefined) return;

    const hi =
      first * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + this[++offset];

    const lo = this[++offset] * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + last;

    return (BigInt(hi) << BigInt(32)) + BigInt(lo);
  };

  Buffer.prototype.readBigInt64BE = function (offset = 0) {
    const first = this[offset];
    const last = this[offset + 7];
    if (first === undefined || last === undefined) return;

    const val =
      (first << 24) + // Overflow
      this[++offset] * 2 ** 16 +
      this[++offset] * 2 ** 8 +
      this[++offset];

    return (
      (BigInt(val) << BigInt(32)) +
      BigInt(this[++offset] * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + last)
    );
  };

  Buffer.prototype.writeBigInt64BE = function (value: bigint, offset = 0) {
    return writeBigU_Int64BE(this, value, offset);
  };

  Buffer.prototype.writeBigUInt64BE = function (value: bigint, offset = 0) {
    return writeBigU_Int64BE(this, value, offset);
  };
}

export class WriteBuffer {
  private buffer: Buffer;
  private capacity: number;
  private offset: number;
  private byte: number;
  private word: number;

  constructor(capacity = 32) {
    this.capacity = capacity;
    this.buffer = Buffer.alloc(this.capacity);
    this.offset = 0;
    this.byte = 0;
    this.word = 0;
  }

  public autoGrow(increment: number): void {
    let grow = false;
    while (this.offset + increment >= this.capacity) {
      this.capacity *= 2;
      grow = true;
    }

    if (grow) {
      const newBuffer = Buffer.alloc(this.capacity);
      newBuffer.set(this.buffer);
      this.buffer = newBuffer;
    }
  }

  get length(): number {
    return this.offset;
  }

  public writeByte(value: number): void {
    this.autoGrow(1);
    this.buffer.writeUInt8(value & 0xff, this.offset);
    this.offset += 1;
  }

  public skip(len: number): void {
    this.autoGrow(len);
    this.offset += len;
  }

  public get(index: number): number {
    return this.buffer[index];
  }

  public subarray(begin = 0, end?: number): Buffer {
    if (end === undefined) {
      end = this.length;
    }
    return this.buffer.subarray(begin, end);
  }

  public write(type: BinaryLengthType, value: number | bigint): void {
    const bytes = BINARY_LENGTH_MAP[type];
    this.autoGrow(bytes);

    if (type !== 'u64' && type !== 's64' && typeof value == 'number') {
      this.buffer[BUFFER_WRITE_MAP[type]](NUMBER_CLAMP_MAP[type](value), this.offset);
    } else if (typeof value == 'bigint') {
      if (type[0] === 's') {
        this.buffer.writeBigInt64BE(BigInt.asIntN(64, value), this.offset);
      } else {
        this.buffer.writeBigUInt64BE(BigInt.asUintN(64, value), this.offset);
      }
    }
    this.offset += bytes;
  }

  public writeBytes(data: string | Buffer): void {
    const len = data.length;
    this.autoGrow(len);

    if (typeof data === 'string') {
      this.buffer.write(data, this.offset);
    } else {
      this.buffer.set(data, this.offset);
    }

    this.offset += len;
  }

  public writeStream(data: string | Buffer): void {
    const len = data.length;
    this.write('u32', len);
    this.writeBytes(data);
    this.realign();
  }

  public writeArray(type: BinaryLengthType, data: (number | bigint)[]): void {
    const size = data.length * BINARY_LENGTH_MAP[type];
    this.write('u32', size);

    for (const value of data) {
      this.write(type, value);
    }
    this.realign();
  }

  public writeNumberData(type: BinaryLengthType, data: (number | bigint)[]): void {
    if (this.byte % 4 === 0) {
      this.byte = this.offset;
    }
    if (this.word % 4 === 0) {
      this.word = this.offset;
    }

    // const isBig = type === 's64' || type === 'u64';
    const dataSize = BINARY_LENGTH_MAP[type];
    const size = BINARY_LENGTH_MAP[type] * data.length;

    if (size === 1) {
      if (this.byte % 4 === 0) {
        this.write('u32', 0);
      }

      for (const value of data) {
        if (typeof value == 'number') {
          this.buffer[BUFFER_WRITE_MAP[type]](NUMBER_CLAMP_MAP[type](value), this.byte);
        }

        this.byte += dataSize;
      }
    } else if (size === 2) {
      if (this.word % 4 === 0) {
        this.write('u32', 0);
      }

      for (const value of data) {
        if (typeof value == 'number') {
          this.buffer[BUFFER_WRITE_MAP[type]](NUMBER_CLAMP_MAP[type](value), this.word);
        }

        this.word += dataSize;
      }
    } else {
      for (const value of data) {
        this.write(type, value);
      }
      this.realign();
    }
  }

  public realign(size = 4): void {
    const padding = this.offset % size;
    if (padding !== 0) {
      this.autoGrow(size - padding);
      this.offset += size - padding;
    }
  }

  public getBuffer(): Buffer {
    return this.buffer.subarray(0, this.offset);
  }
}

export class ReadBuffer {
  public data: Buffer;
  private start: number;
  private byte: number;
  private word: number;
  private offset: number;

  constructor(data: Buffer, offset = 0) {
    this.data = data;
    this.start = offset;
    this.offset = 0;
    this.byte = 0;
    this.word = 0;
  }

  public peek(type: BinaryLengthType): number | bigint {
    const res = this.data[BUFFER_METHOD_MAP[type]](this.start + this.offset);
    return res;
  }

  public get(type: BinaryLengthType): bigint | number {
    const res = this.peek(type);
    this.offset += BINARY_LENGTH_MAP[type];

    return res;
  }

  public peekBytes(len: number): Buffer {
    return this.data.subarray(this.start + this.offset, this.start + this.offset + len);
  }

  public getBytes(len: number): Buffer {
    const res = this.peekBytes(len);
    this.offset += len;

    return res;
  }

  public hasData(): boolean {
    return this.start + this.offset < this.data.length;
  }

  public realign(size = 4): void {
    if (this.offset % size !== 0) {
      this.offset += size - (this.offset % size);
    }
  }

  public getStream(): Buffer {
    const size = Number(this.get('s32'));
    let res = null;
    if (size > 0) {
      res = this.getBytes(size);
    }
    this.realign();

    return res;
  }

  public getArray(type: BinaryLengthType): (number | bigint)[] {
    const size = Number(this.get('u32'));

    const len = size / BINARY_LENGTH_MAP[type];

    const res = [];
    for (let i = 0; i < len; ++i) {
      res.push(this.get(type));
    }
    this.realign();
    return res;
  }

  public getNumberData(type: BinaryLengthType, count = 1): (number | bigint)[] {
    if (this.byte % 4 === 0) {
      this.byte = this.offset;
    }

    if (this.word % 4 === 0) {
      this.word = this.offset;
    }

    const dataSize = BINARY_LENGTH_MAP[type];
    const size = dataSize * count;
    const res = [];

    if (size === 1) {
      for (let i = 0; i < count; ++i) {
        res.push(this.data[BUFFER_METHOD_MAP[type]](this.start + this.byte));
        this.byte += dataSize;
      }
    } else if (size === 2) {
      for (let i = 0; i < count; ++i) {
        res.push(this.data[BUFFER_METHOD_MAP[type]](this.start + this.word));
        this.word += dataSize;
      }
    } else {
      for (let i = 0; i < count; ++i) {
        res.push(this.get(type));
      }
      this.realign();
    }

    const trailing = Math.max(this.byte, this.word);
    if (this.offset < trailing) {
      this.offset = trailing;
      this.realign();
    }

    return res;
  }
}
