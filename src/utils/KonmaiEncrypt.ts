import { createHash, randomFillSync } from 'crypto';

export class KonmaiEncrypt {
  private konmaiKey: Buffer;
  private realKey?: Buffer;

  constructor(publicKey?: string) {
    this.konmaiKey = Buffer.from([
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x69,
      0xd7,
      0x46,
      0x27,
      0xd9,
      0x85,
      0xee,
      0x21,
      0x87,
      0x16,
      0x15,
      0x70,
      0xd0,
      0x8d,
      0x93,
      0xb1,
      0x24,
      0x55,
      0x03,
      0x5b,
      0x6d,
      0xf0,
      0xd8,
      0x20,
      0x5d,
      0xf5,
    ]);

    if (publicKey) {
      // 1-5cfb8b00-a8b3
      const keyPart = publicKey.split('-');
      const keys = keyPart[1] + keyPart[2];
      for (let i = 0; i < 6; ++i) {
        const result = parseInt(keys.substr(i * 2, 2), 16);
        if (isNaN(result)) {
          return;
        }
        this.konmaiKey[i] = result;
      }
    } else {
      randomFillSync(this.konmaiKey, 0, 6);
    }

    this.realKey = createHash('md5').update(this.konmaiKey).digest();
  }

  public getPublicKey(): string {
    return (
      '1-' +
      this.konmaiKey.subarray(0, 4).toString('hex') +
      '-' +
      this.konmaiKey.subarray(4, 6).toString('hex')
    );
  }

  public encrypt(data: Buffer): Buffer {
    if (!this.realKey) {
      return;
    }

    const s = [...Array(256).keys()];
    let t = 0;
    for (let b = 0; b < 256; ++b) {
      t = (t + s[b] + this.realKey[b % this.realKey.length]) % 256;
      const tmp = s[b];
      s[b] = s[t];
      s[t] = tmp;
    }

    let i = 0;
    let j = 0;
    const res = Buffer.alloc(data.length);
    for (let y = 0; y < data.length; ++y) {
      i = (i + 1) % 256;
      j = (j + s[i]) % 256;
      const tmp = s[i];
      s[i] = s[j];
      s[j] = tmp;
      res[y] = data[y] ^ s[(s[i] + s[j]) % 256];
    }
    return res;
  }
}
