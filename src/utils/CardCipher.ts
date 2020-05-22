const CIPHER_CHARS = '0123456789ABCDEFGHJKLMNPRSTUWXYZ';
const CIPHER_MAP: { [key: string]: number } = {
  0: 0,
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
  9: 9,
  A: 10,
  B: 11,
  C: 12,
  D: 13,
  E: 14,
  F: 15,
  G: 16,
  H: 17,
  J: 18,
  K: 19,
  L: 20,
  M: 21,
  N: 22,
  P: 23,
  R: 24,
  S: 25,
  T: 26,
  U: 27,
  W: 28,
  X: 29,
  Y: 30,
  Z: 31,
};

const KEY = [
  BigInt('0x20d0d03c'),
  BigInt('0x868ecb41'),
  BigInt('0xbcd89c84'),
  BigInt('0x4c0e0d0d'),
  BigInt('0x84fc30ac'),
  BigInt('0x4cc1890e'),
  BigInt('0xfc5418a4'),
  BigInt('0x02c50f44'),
  BigInt('0x68acb4e0'),
  BigInt('0x06cd4a4e'),
  BigInt('0xcc28906c'),
  BigInt('0x4f0c8ac0'),
  BigInt('0xb03ca468'),
  BigInt('0x884ac7c4'),
  BigInt('0x389490d8'),
  BigInt('0xcf80c6c2'),
  BigInt('0x58d87404'),
  BigInt('0xc48ec444'),
  BigInt('0xb4e83c50'),
  BigInt('0x498d0147'),
  BigInt('0x64f454c0'),
  BigInt('0x4c4701c8'),
  BigInt('0xec302cc4'),
  BigInt('0xc6c949c1'),
  BigInt('0xc84c00f0'),
  BigInt('0xcdcc49cc'),
  BigInt('0x883c5cf4'),
  BigInt('0x8b0fcb80'),
  BigInt('0x703cc0b0'),
  BigInt('0xcb820a8d'),
  BigInt('0x78804c8c'),
  BigInt('0x4fca830e'),
  BigInt('0x80d0f03c'),
  BigInt('0x8ec84f8c'),
  BigInt('0x98c89c4c'),
  BigInt('0xc80d878f'),
  BigInt('0x54bc949c'),
  BigInt('0xc801c5ce'),
  BigInt('0x749078dc'),
  BigInt('0xc3c80d46'),
  BigInt('0x2c8070f0'),
  BigInt('0x0cce4dcf'),
  BigInt('0x8c3874e4'),
  BigInt('0x8d448ac3'),
  BigInt('0x987cac70'),
  BigInt('0xc0c20ac5'),
  BigInt('0x288cfc78'),
  BigInt('0xc28543c8'),
  BigInt('0x4c8c7434'),
  BigInt('0xc50e4f8d'),
  BigInt('0x8468f4b4'),
  BigInt('0xcb4a0307'),
  BigInt('0x2854dc98'),
  BigInt('0x48430b45'),
  BigInt('0x6858fce8'),
  BigInt('0x4681cd49'),
  BigInt('0xd04808ec'),
  BigInt('0x458d0fcb'),
  BigInt('0xe0a48ce4'),
  BigInt('0x880f8fce'),
  BigInt('0x7434b8fc'),
  BigInt('0xce080a8e'),
  BigInt('0x5860fc6c'),
  BigInt('0x46c886cc'),
  BigInt('0xd01098a4'),
  BigInt('0xce090b8c'),
  BigInt('0x1044cc2c'),
  BigInt('0x86898e0f'),
  BigInt('0xd0809c3c'),
  BigInt('0x4a05860f'),
  BigInt('0x54b4f80c'),
  BigInt('0x4008870e'),
  BigInt('0x1480b88c'),
  BigInt('0x0ac8854f'),
  BigInt('0x1c9034cc'),
  BigInt('0x08444c4e'),
  BigInt('0x0cb83c64'),
  BigInt('0x41c08cc6'),
  BigInt('0x1c083460'),
  BigInt('0xc0c603ce'),
  BigInt('0x2ca0645c'),
  BigInt('0x818246cb'),
  BigInt('0x0408e454'),
  BigInt('0xc5464487'),
  BigInt('0x88607c18'),
  BigInt('0xc1424187'),
  BigInt('0x284c7c90'),
  BigInt('0xc1030509'),
  BigInt('0x40486c94'),
  BigInt('0x4603494b'),
  BigInt('0xe0404ce4'),
  BigInt('0x4109094d'),
  BigInt('0x60443ce4'),
  BigInt('0x4c0b8b8d'),
  BigInt('0xe054e8bc'),
  BigInt('0x02008e89'),
];

const LOOKUP1 = [
  BigInt('0x02080008'),
  BigInt('0x02082000'),
  BigInt('0x00002008'),
  BigInt('0x00000000'),
  BigInt('0x02002000'),
  BigInt('0x00080008'),
  BigInt('0x02080000'),
  BigInt('0x02082008'),
  BigInt('0x00000008'),
  BigInt('0x02000000'),
  BigInt('0x00082000'),
  BigInt('0x00002008'),
  BigInt('0x00082008'),
  BigInt('0x02002008'),
  BigInt('0x02000008'),
  BigInt('0x02080000'),
  BigInt('0x00002000'),
  BigInt('0x00082008'),
  BigInt('0x00080008'),
  BigInt('0x02002000'),
  BigInt('0x02082008'),
  BigInt('0x02000008'),
  BigInt('0x00000000'),
  BigInt('0x00082000'),
  BigInt('0x02000000'),
  BigInt('0x00080000'),
  BigInt('0x02002008'),
  BigInt('0x02080008'),
  BigInt('0x00080000'),
  BigInt('0x00002000'),
  BigInt('0x02082000'),
  BigInt('0x00000008'),
  BigInt('0x00080000'),
  BigInt('0x00002000'),
  BigInt('0x02000008'),
  BigInt('0x02082008'),
  BigInt('0x00002008'),
  BigInt('0x02000000'),
  BigInt('0x00000000'),
  BigInt('0x00082000'),
  BigInt('0x02080008'),
  BigInt('0x02002008'),
  BigInt('0x02002000'),
  BigInt('0x00080008'),
  BigInt('0x02082000'),
  BigInt('0x00000008'),
  BigInt('0x00080008'),
  BigInt('0x02002000'),
  BigInt('0x02082008'),
  BigInt('0x00080000'),
  BigInt('0x02080000'),
  BigInt('0x02000008'),
  BigInt('0x00082000'),
  BigInt('0x00002008'),
  BigInt('0x02002008'),
  BigInt('0x02080000'),
  BigInt('0x00000008'),
  BigInt('0x02082000'),
  BigInt('0x00082008'),
  BigInt('0x00000000'),
  BigInt('0x02000000'),
  BigInt('0x02080008'),
  BigInt('0x00002000'),
  BigInt('0x00082008'),
];

const LOOKUP2 = [
  BigInt('0x08000004'),
  BigInt('0x00020004'),
  BigInt('0x00000000'),
  BigInt('0x08020200'),
  BigInt('0x00020004'),
  BigInt('0x00000200'),
  BigInt('0x08000204'),
  BigInt('0x00020000'),
  BigInt('0x00000204'),
  BigInt('0x08020204'),
  BigInt('0x00020200'),
  BigInt('0x08000000'),
  BigInt('0x08000200'),
  BigInt('0x08000004'),
  BigInt('0x08020000'),
  BigInt('0x00020204'),
  BigInt('0x00020000'),
  BigInt('0x08000204'),
  BigInt('0x08020004'),
  BigInt('0x00000000'),
  BigInt('0x00000200'),
  BigInt('0x00000004'),
  BigInt('0x08020200'),
  BigInt('0x08020004'),
  BigInt('0x08020204'),
  BigInt('0x08020000'),
  BigInt('0x08000000'),
  BigInt('0x00000204'),
  BigInt('0x00000004'),
  BigInt('0x00020200'),
  BigInt('0x00020204'),
  BigInt('0x08000200'),
  BigInt('0x00000204'),
  BigInt('0x08000000'),
  BigInt('0x08000200'),
  BigInt('0x00020204'),
  BigInt('0x08020200'),
  BigInt('0x00020004'),
  BigInt('0x00000000'),
  BigInt('0x08000200'),
  BigInt('0x08000000'),
  BigInt('0x00000200'),
  BigInt('0x08020004'),
  BigInt('0x00020000'),
  BigInt('0x00020004'),
  BigInt('0x08020204'),
  BigInt('0x00020200'),
  BigInt('0x00000004'),
  BigInt('0x08020204'),
  BigInt('0x00020200'),
  BigInt('0x00020000'),
  BigInt('0x08000204'),
  BigInt('0x08000004'),
  BigInt('0x08020000'),
  BigInt('0x00020204'),
  BigInt('0x00000000'),
  BigInt('0x00000200'),
  BigInt('0x08000004'),
  BigInt('0x08000204'),
  BigInt('0x08020200'),
  BigInt('0x08020000'),
  BigInt('0x00000204'),
  BigInt('0x00000004'),
  BigInt('0x08020004'),
];

const LOOKUP3 = [
  BigInt('0x80040100'),
  BigInt('0x01000100'),
  BigInt('0x80000000'),
  BigInt('0x81040100'),
  BigInt('0x00000000'),
  BigInt('0x01040000'),
  BigInt('0x81000100'),
  BigInt('0x80040000'),
  BigInt('0x01040100'),
  BigInt('0x81000000'),
  BigInt('0x01000000'),
  BigInt('0x80000100'),
  BigInt('0x81000000'),
  BigInt('0x80040100'),
  BigInt('0x00040000'),
  BigInt('0x01000000'),
  BigInt('0x81040000'),
  BigInt('0x00040100'),
  BigInt('0x00000100'),
  BigInt('0x80000000'),
  BigInt('0x00040100'),
  BigInt('0x81000100'),
  BigInt('0x01040000'),
  BigInt('0x00000100'),
  BigInt('0x80000100'),
  BigInt('0x00000000'),
  BigInt('0x80040000'),
  BigInt('0x01040100'),
  BigInt('0x01000100'),
  BigInt('0x81040000'),
  BigInt('0x81040100'),
  BigInt('0x00040000'),
  BigInt('0x81040000'),
  BigInt('0x80000100'),
  BigInt('0x00040000'),
  BigInt('0x81000000'),
  BigInt('0x00040100'),
  BigInt('0x01000100'),
  BigInt('0x80000000'),
  BigInt('0x01040000'),
  BigInt('0x81000100'),
  BigInt('0x00000000'),
  BigInt('0x00000100'),
  BigInt('0x80040000'),
  BigInt('0x00000000'),
  BigInt('0x81040000'),
  BigInt('0x01040100'),
  BigInt('0x00000100'),
  BigInt('0x01000000'),
  BigInt('0x81040100'),
  BigInt('0x80040100'),
  BigInt('0x00040000'),
  BigInt('0x81040100'),
  BigInt('0x80000000'),
  BigInt('0x01000100'),
  BigInt('0x80040100'),
  BigInt('0x80040000'),
  BigInt('0x00040100'),
  BigInt('0x01040000'),
  BigInt('0x81000100'),
  BigInt('0x80000100'),
  BigInt('0x01000000'),
  BigInt('0x81000000'),
  BigInt('0x01040100'),
];

const LOOKUP4 = [
  BigInt('0x04010801'),
  BigInt('0x00000000'),
  BigInt('0x00010800'),
  BigInt('0x04010000'),
  BigInt('0x04000001'),
  BigInt('0x00000801'),
  BigInt('0x04000800'),
  BigInt('0x00010800'),
  BigInt('0x00000800'),
  BigInt('0x04010001'),
  BigInt('0x00000001'),
  BigInt('0x04000800'),
  BigInt('0x00010001'),
  BigInt('0x04010800'),
  BigInt('0x04010000'),
  BigInt('0x00000001'),
  BigInt('0x00010000'),
  BigInt('0x04000801'),
  BigInt('0x04010001'),
  BigInt('0x00000800'),
  BigInt('0x00010801'),
  BigInt('0x04000000'),
  BigInt('0x00000000'),
  BigInt('0x00010001'),
  BigInt('0x04000801'),
  BigInt('0x00010801'),
  BigInt('0x04010800'),
  BigInt('0x04000001'),
  BigInt('0x04000000'),
  BigInt('0x00010000'),
  BigInt('0x00000801'),
  BigInt('0x04010801'),
  BigInt('0x00010001'),
  BigInt('0x04010800'),
  BigInt('0x04000800'),
  BigInt('0x00010801'),
  BigInt('0x04010801'),
  BigInt('0x00010001'),
  BigInt('0x04000001'),
  BigInt('0x00000000'),
  BigInt('0x04000000'),
  BigInt('0x00000801'),
  BigInt('0x00010000'),
  BigInt('0x04010001'),
  BigInt('0x00000800'),
  BigInt('0x04000000'),
  BigInt('0x00010801'),
  BigInt('0x04000801'),
  BigInt('0x04010800'),
  BigInt('0x00000800'),
  BigInt('0x00000000'),
  BigInt('0x04000001'),
  BigInt('0x00000001'),
  BigInt('0x04010801'),
  BigInt('0x00010800'),
  BigInt('0x04010000'),
  BigInt('0x04010001'),
  BigInt('0x00010000'),
  BigInt('0x00000801'),
  BigInt('0x04000800'),
  BigInt('0x04000801'),
  BigInt('0x00000001'),
  BigInt('0x04010000'),
  BigInt('0x00010800'),
];

const LOOKUP5 = [
  BigInt('0x00000400'),
  BigInt('0x00000020'),
  BigInt('0x00100020'),
  BigInt('0x40100000'),
  BigInt('0x40100420'),
  BigInt('0x40000400'),
  BigInt('0x00000420'),
  BigInt('0x00000000'),
  BigInt('0x00100000'),
  BigInt('0x40100020'),
  BigInt('0x40000020'),
  BigInt('0x00100400'),
  BigInt('0x40000000'),
  BigInt('0x00100420'),
  BigInt('0x00100400'),
  BigInt('0x40000020'),
  BigInt('0x40100020'),
  BigInt('0x00000400'),
  BigInt('0x40000400'),
  BigInt('0x40100420'),
  BigInt('0x00000000'),
  BigInt('0x00100020'),
  BigInt('0x40100000'),
  BigInt('0x00000420'),
  BigInt('0x40100400'),
  BigInt('0x40000420'),
  BigInt('0x00100420'),
  BigInt('0x40000000'),
  BigInt('0x40000420'),
  BigInt('0x40100400'),
  BigInt('0x00000020'),
  BigInt('0x00100000'),
  BigInt('0x40000420'),
  BigInt('0x00100400'),
  BigInt('0x40100400'),
  BigInt('0x40000020'),
  BigInt('0x00000400'),
  BigInt('0x00000020'),
  BigInt('0x00100000'),
  BigInt('0x40100400'),
  BigInt('0x40100020'),
  BigInt('0x40000420'),
  BigInt('0x00000420'),
  BigInt('0x00000000'),
  BigInt('0x00000020'),
  BigInt('0x40100000'),
  BigInt('0x40000000'),
  BigInt('0x00100020'),
  BigInt('0x00000000'),
  BigInt('0x40100020'),
  BigInt('0x00100020'),
  BigInt('0x00000420'),
  BigInt('0x40000020'),
  BigInt('0x00000400'),
  BigInt('0x40100420'),
  BigInt('0x00100000'),
  BigInt('0x00100420'),
  BigInt('0x40000000'),
  BigInt('0x40000400'),
  BigInt('0x40100420'),
  BigInt('0x40100000'),
  BigInt('0x00100420'),
  BigInt('0x00100400'),
  BigInt('0x40000400'),
];

const LOOKUP6 = [
  BigInt('0x00800000'),
  BigInt('0x00001000'),
  BigInt('0x00000040'),
  BigInt('0x00801042'),
  BigInt('0x00801002'),
  BigInt('0x00800040'),
  BigInt('0x00001042'),
  BigInt('0x00801000'),
  BigInt('0x00001000'),
  BigInt('0x00000002'),
  BigInt('0x00800002'),
  BigInt('0x00001040'),
  BigInt('0x00800042'),
  BigInt('0x00801002'),
  BigInt('0x00801040'),
  BigInt('0x00000000'),
  BigInt('0x00001040'),
  BigInt('0x00800000'),
  BigInt('0x00001002'),
  BigInt('0x00000042'),
  BigInt('0x00800040'),
  BigInt('0x00001042'),
  BigInt('0x00000000'),
  BigInt('0x00800002'),
  BigInt('0x00000002'),
  BigInt('0x00800042'),
  BigInt('0x00801042'),
  BigInt('0x00001002'),
  BigInt('0x00801000'),
  BigInt('0x00000040'),
  BigInt('0x00000042'),
  BigInt('0x00801040'),
  BigInt('0x00801040'),
  BigInt('0x00800042'),
  BigInt('0x00001002'),
  BigInt('0x00801000'),
  BigInt('0x00001000'),
  BigInt('0x00000002'),
  BigInt('0x00800002'),
  BigInt('0x00800040'),
  BigInt('0x00800000'),
  BigInt('0x00001040'),
  BigInt('0x00801042'),
  BigInt('0x00000000'),
  BigInt('0x00001042'),
  BigInt('0x00800000'),
  BigInt('0x00000040'),
  BigInt('0x00001002'),
  BigInt('0x00800042'),
  BigInt('0x00000040'),
  BigInt('0x00000000'),
  BigInt('0x00801042'),
  BigInt('0x00801002'),
  BigInt('0x00801040'),
  BigInt('0x00000042'),
  BigInt('0x00001000'),
  BigInt('0x00001040'),
  BigInt('0x00801002'),
  BigInt('0x00800040'),
  BigInt('0x00000042'),
  BigInt('0x00000002'),
  BigInt('0x00001042'),
  BigInt('0x00801000'),
  BigInt('0x00800002'),
];

const LOOKUP7 = [
  BigInt('0x10400000'),
  BigInt('0x00404010'),
  BigInt('0x00000010'),
  BigInt('0x10400010'),
  BigInt('0x10004000'),
  BigInt('0x00400000'),
  BigInt('0x10400010'),
  BigInt('0x00004010'),
  BigInt('0x00400010'),
  BigInt('0x00004000'),
  BigInt('0x00404000'),
  BigInt('0x10000000'),
  BigInt('0x10404010'),
  BigInt('0x10000010'),
  BigInt('0x10000000'),
  BigInt('0x10404000'),
  BigInt('0x00000000'),
  BigInt('0x10004000'),
  BigInt('0x00404010'),
  BigInt('0x00000010'),
  BigInt('0x10000010'),
  BigInt('0x10404010'),
  BigInt('0x00004000'),
  BigInt('0x10400000'),
  BigInt('0x10404000'),
  BigInt('0x00400010'),
  BigInt('0x10004010'),
  BigInt('0x00404000'),
  BigInt('0x00004010'),
  BigInt('0x00000000'),
  BigInt('0x00400000'),
  BigInt('0x10004010'),
  BigInt('0x00404010'),
  BigInt('0x00000010'),
  BigInt('0x10000000'),
  BigInt('0x00004000'),
  BigInt('0x10000010'),
  BigInt('0x10004000'),
  BigInt('0x00404000'),
  BigInt('0x10400010'),
  BigInt('0x00000000'),
  BigInt('0x00404010'),
  BigInt('0x00004010'),
  BigInt('0x10404000'),
  BigInt('0x10004000'),
  BigInt('0x00400000'),
  BigInt('0x10404010'),
  BigInt('0x10000000'),
  BigInt('0x10004010'),
  BigInt('0x10400000'),
  BigInt('0x00400000'),
  BigInt('0x10404010'),
  BigInt('0x00004000'),
  BigInt('0x00400010'),
  BigInt('0x10400010'),
  BigInt('0x00004010'),
  BigInt('0x00400010'),
  BigInt('0x00000000'),
  BigInt('0x10404000'),
  BigInt('0x10000010'),
  BigInt('0x10400000'),
  BigInt('0x10004010'),
  BigInt('0x00000010'),
  BigInt('0x00404000'),
];

const LOOKUP8 = [
  BigInt('0x00208080'),
  BigInt('0x00008000'),
  BigInt('0x20200000'),
  BigInt('0x20208080'),
  BigInt('0x00200000'),
  BigInt('0x20008080'),
  BigInt('0x20008000'),
  BigInt('0x20200000'),
  BigInt('0x20008080'),
  BigInt('0x00208080'),
  BigInt('0x00208000'),
  BigInt('0x20000080'),
  BigInt('0x20200080'),
  BigInt('0x00200000'),
  BigInt('0x00000000'),
  BigInt('0x20008000'),
  BigInt('0x00008000'),
  BigInt('0x20000000'),
  BigInt('0x00200080'),
  BigInt('0x00008080'),
  BigInt('0x20208080'),
  BigInt('0x00208000'),
  BigInt('0x20000080'),
  BigInt('0x00200080'),
  BigInt('0x20000000'),
  BigInt('0x00000080'),
  BigInt('0x00008080'),
  BigInt('0x20208000'),
  BigInt('0x00000080'),
  BigInt('0x20200080'),
  BigInt('0x20208000'),
  BigInt('0x00000000'),
  BigInt('0x00000000'),
  BigInt('0x20208080'),
  BigInt('0x00200080'),
  BigInt('0x20008000'),
  BigInt('0x00208080'),
  BigInt('0x00008000'),
  BigInt('0x20000080'),
  BigInt('0x00200080'),
  BigInt('0x20208000'),
  BigInt('0x00000080'),
  BigInt('0x00008080'),
  BigInt('0x20200000'),
  BigInt('0x20008080'),
  BigInt('0x20000000'),
  BigInt('0x20200000'),
  BigInt('0x00208000'),
  BigInt('0x20208080'),
  BigInt('0x00008080'),
  BigInt('0x00208000'),
  BigInt('0x20200080'),
  BigInt('0x00200000'),
  BigInt('0x20000080'),
  BigInt('0x20008000'),
  BigInt('0x00000000'),
  BigInt('0x00008000'),
  BigInt('0x00200000'),
  BigInt('0x20200080'),
  BigInt('0x00208080'),
  BigInt('0x20000000'),
  BigInt('0x20208000'),
  BigInt('0x00000080'),
  BigInt('0x20008080'),
];

const rotateRight = (val: bigint, amount: bigint): bigint => {
  val = val & BigInt('0xffffffff');
  return ((val << (BigInt('32') - amount)) | (val >> amount)) & BigInt('0xffffffff');
};

const unpack = (buffer: Buffer, state: bigint): void => {
  const i1 = state >> BigInt('32');
  const i2 = state;
  const i3 = rotateRight(i2, BigInt('31'));
  const i4 = (i1 ^ i3) & BigInt('0x55555555');
  const i5 = i4 ^ i3;
  const i6 = rotateRight(i4 ^ i1, BigInt('31'));
  const i7 = (i6 ^ (i5 >> BigInt('8'))) & BigInt('0x00ff00ff');
  const i8 = i5 ^ (i7 << BigInt('8'));
  const i9 = i7 ^ i6;
  const i10 = ((i9 >> BigInt('2')) ^ i8) & BigInt('0x33333333');
  const i11 = (i10 << BigInt('2')) ^ i9;
  const i12 = i10 ^ i8;
  const i13 = (i11 ^ (i12 >> BigInt('16'))) & BigInt('0x0000ffff');
  const i14 = i12 ^ (i13 << BigInt('16'));
  const i15 = i13 ^ i11;
  const i16 = (i14 ^ (i15 >> BigInt('4'))) & BigInt('0x0f0f0f0f');
  const i17 = (i16 << BigInt('4')) ^ i15;
  const i18 = i16 ^ i14;
  buffer[0] = Number(i18) & 0xff;
  buffer[1] = Number(i18 >> BigInt('8')) & 0xff;
  buffer[2] = Number(i18 >> BigInt('16')) & 0xff;
  buffer[3] = Number(i18 >> BigInt('24')) & 0xff;
  buffer[4] = Number(i17) & 0xff;
  buffer[5] = Number(i17 >> BigInt('8')) & 0xff;
  buffer[6] = Number(i17 >> BigInt('16')) & 0xff;
  buffer[7] = Number(i17 >> BigInt('24')) & 0xff;
};

const cipher1 = (off: number, state: bigint): bigint => {
  let higher = state >> BigInt('32');
  let lower = state & BigInt('0xffffffff');
  for (let i = 0; i < 32; i += 4) {
    const lowerROR = rotateRight(higher ^ KEY[off + 31 - i], BigInt('28'));
    let lowerXOR = BigInt('0');
    lowerXOR ^= LOOKUP1[Number(((higher ^ KEY[off + 30 - i]) >> BigInt('26')) & BigInt('0x3f'))];
    lowerXOR ^= LOOKUP2[Number(((higher ^ KEY[off + 30 - i]) >> BigInt('18')) & BigInt('0x3f'))];
    lowerXOR ^= LOOKUP3[Number(((higher ^ KEY[off + 30 - i]) >> BigInt('10')) & BigInt('0x3f'))];
    lowerXOR ^= LOOKUP4[Number(((higher ^ KEY[off + 30 - i]) >> BigInt('2')) & BigInt('0x3f'))];
    lowerXOR ^= LOOKUP5[Number((lowerROR >> BigInt('26')) & BigInt('0x3f'))];
    lowerXOR ^= LOOKUP6[Number((lowerROR >> BigInt('18')) & BigInt('0x3f'))];
    lowerXOR ^= LOOKUP7[Number((lowerROR >> BigInt('10')) & BigInt('0x3f'))];
    lowerXOR ^= LOOKUP8[Number((lowerROR >> BigInt('2')) & BigInt('0x3f'))];
    lower ^= lowerXOR;
    const higherROR = rotateRight(lower ^ KEY[off + 29 - i], BigInt('28'));
    let higherXOR = BigInt('0');
    higherXOR ^= LOOKUP1[Number(((lower ^ KEY[off + 28 - i]) >> BigInt('26')) & BigInt('0x3f'))];
    higherXOR ^= LOOKUP2[Number(((lower ^ KEY[off + 28 - i]) >> BigInt('18')) & BigInt('0x3f'))];
    higherXOR ^= LOOKUP3[Number(((lower ^ KEY[off + 28 - i]) >> BigInt('10')) & BigInt('0x3f'))];
    higherXOR ^= LOOKUP4[Number(((lower ^ KEY[off + 28 - i]) >> BigInt('2')) & BigInt('0x3f'))];
    higherXOR ^= LOOKUP5[Number((higherROR >> BigInt('26')) & BigInt('0x3f'))];
    higherXOR ^= LOOKUP6[Number((higherROR >> BigInt('18')) & BigInt('0x3f'))];
    higherXOR ^= LOOKUP7[Number((higherROR >> BigInt('10')) & BigInt('0x3f'))];
    higherXOR ^= LOOKUP8[Number((higherROR >> BigInt('2')) & BigInt('0x3f'))];
    higher ^= higherXOR;
  }
  return (higher << BigInt('32')) | (lower & BigInt('0xffffffff'));
};

const cipher2 = (off: number, state: bigint): bigint => {
  let higher = state >> BigInt('32');
  let lower = state & BigInt('0xffffffff');
  for (let i = 0; i < 32; i += 4) {
    const lowerROR = rotateRight(higher ^ KEY[off + i + 1], BigInt('28'));
    let lowerXOR = BigInt('0');
    lowerXOR ^= LOOKUP5[Number((lowerROR >> BigInt('26')) & BigInt('0x3f'))];
    lowerXOR ^= LOOKUP6[Number((lowerROR >> BigInt('18')) & BigInt('0x3f'))];
    lowerXOR ^= LOOKUP7[Number((lowerROR >> BigInt('10')) & BigInt('0x3f'))];
    lowerXOR ^= LOOKUP8[Number((lowerROR >> BigInt('2')) & BigInt('0x3f'))];
    lowerXOR ^= LOOKUP1[Number(((higher ^ KEY[off + i]) >> BigInt('26')) & BigInt('0x3f'))];
    lowerXOR ^= LOOKUP2[Number(((higher ^ KEY[off + i]) >> BigInt('18')) & BigInt('0x3f'))];
    lowerXOR ^= LOOKUP3[Number(((higher ^ KEY[off + i]) >> BigInt('10')) & BigInt('0x3f'))];
    lowerXOR ^= LOOKUP4[Number(((higher ^ KEY[off + i]) >> BigInt('2')) & BigInt('0x3f'))];
    lower ^= lowerXOR;
    const higherROR = rotateRight(lower ^ KEY[off + i + 3], BigInt('28'));
    let higherXOR = BigInt('0');
    higherXOR ^= LOOKUP5[Number((higherROR >> BigInt('26')) & BigInt('0x3f'))];
    higherXOR ^= LOOKUP6[Number((higherROR >> BigInt('18')) & BigInt('0x3f'))];
    higherXOR ^= LOOKUP7[Number((higherROR >> BigInt('10')) & BigInt('0x3f'))];
    higherXOR ^= LOOKUP8[Number((higherROR >> BigInt('2')) & BigInt('0x3f'))];
    higherXOR ^= LOOKUP1[Number(((lower ^ KEY[off + i + 2]) >> BigInt('26')) & BigInt('0x3f'))];
    higherXOR ^= LOOKUP2[Number(((lower ^ KEY[off + i + 2]) >> BigInt('18')) & BigInt('0x3f'))];
    higherXOR ^= LOOKUP3[Number(((lower ^ KEY[off + i + 2]) >> BigInt('10')) & BigInt('0x3f'))];
    higherXOR ^= LOOKUP4[Number(((lower ^ KEY[off + i + 2]) >> BigInt('2')) & BigInt('0x3f'))];
    higher ^= higherXOR;
  }
  return (higher << BigInt('32')) | (lower & BigInt('0xffffffff'));
};

const checksum = (buffer: Buffer): number => {
  let chk = 0;
  for (let i = 0; i < buffer.length; i++) {
    chk += ((i % 3) + 1) * (buffer[i] & 0xff);
  }
  while (chk >= 0x20) {
    chk = (chk & 0x1f) + (chk >> 5);
  }
  return chk & 0xff;
};

const pack = (buffer: Buffer): bigint => {
  let val1 = BigInt(buffer[0]) & BigInt('0xff');
  val1 |= BigInt(buffer[1] & 0xff) << BigInt('8');
  val1 |= BigInt(buffer[2] & 0xff) << BigInt('16');
  val1 |= BigInt(buffer[3] & 0xff) << BigInt('24');
  let val2 = BigInt(buffer[4]) & BigInt('0xff');
  val2 |= BigInt(buffer[5] & 0xff) << BigInt('8');
  val2 |= BigInt(buffer[6] & 0xff) << BigInt('16');
  val2 |= BigInt(buffer[7] & 0xff) << BigInt('24');
  const i1 = (((val1 ^ (val2 >> BigInt('4'))) & BigInt('0x0f0f0f0f')) << BigInt('4')) ^ val2;
  const i2 = ((val1 ^ (val2 >> BigInt('4'))) & BigInt('0x0f0f0f0f')) ^ val1;
  const i3 = (i1 ^ (i2 >> BigInt('16'))) & BigInt('0x0000ffff');
  const i4 = ((i1 ^ (i2 >> BigInt('16'))) << BigInt('16')) ^ i2;
  const i5 = i3 ^ i1;
  const i6 = (i4 ^ (i5 >> BigInt('2'))) & BigInt('0x33333333');
  const i7 = i5 ^ (i6 << BigInt('2'));
  const i8 = i6 ^ i4;
  const i9 = (i7 ^ (i8 >> BigInt('8'))) & BigInt('0x00ff00ff');
  const i10 = i8 ^ (i9 << BigInt('8'));
  const i11 = rotateRight(i9 ^ i7, BigInt('1'));
  const i12 = (i10 ^ i11) & BigInt('0x55555555');
  const i13 = rotateRight(i12 ^ i10, BigInt('1'));
  const i14 = i12 ^ i11;
  return (i13 << BigInt('32')) | (i14 & BigInt('0xffffffff'));
};

export const cardType = (cardID: string): number => {
  if (cardID.startsWith('E004')) {
    return 1;
  }
  if (cardID.startsWith('0')) {
    return 2;
  }
  return -1;
};

export const nfc2card = (nfc: string): string => {
  if (nfc.length !== 16) {
    throw new Error('Invalid Length');
  }

  nfc = nfc.toUpperCase();

  const nfcData = Buffer.from(nfc, 'hex').reverse();
  const type = cardType(nfc);

  if (type < 0) {
    throw new Error('Invalid Card Type');
  }

  const cipher = Buffer.from(nfcData);
  unpack(cipher, cipher2(0x00, pack(cipher)));
  unpack(cipher, cipher1(0x20, pack(cipher)));
  unpack(cipher, cipher2(0x40, pack(cipher)));

  const bits = Buffer.alloc(65);
  for (let i = 0; i < 64; ++i) {
    bits[i] = (cipher[i >> 3] >> (~i & 7)) & 1;
  }
  bits[64] = 0;

  const parts = Buffer.alloc(16);
  for (let i = 0; i < 13; ++i) {
    parts[i] = 0;
    for (let j = 0; j < 5; ++j) {
      parts[i] |= bits[i * 5 + j] << (4 - j);
    }
  }

  parts[0] ^= type;
  parts[13] = 1;
  for (let i = 1; i < 14; ++i) {
    parts[i] ^= parts[i - 1];
  }

  parts[14] = type;
  parts[15] = 0;
  parts[15] = checksum(parts);
  let cipherText = '';
  for (let i = 0; i < 16; ++i) {
    cipherText += CIPHER_CHARS[parts[i]];
  }
  return cipherText;
};

export const card2nfc = (cipher: string): string => {
  cipher = cipher
    .toUpperCase()
    .trim()
    .replace(/[\s\-]/g, '')
    .replace(/O/g, '0')
    .replace(/I/g, '1');

  if (cipher.length !== 16) {
    throw new Error('Invalid Length');
  }

  const parts = Buffer.alloc(16);
  for (let offset = 0; offset < 16; ++offset) {
    const c = cipher[offset];
    const value = CIPHER_MAP[c];

    if (value === undefined) {
      throw new Error('Invalid Character');
    }
    parts[offset] = value;
  }
  for (let i = 13; i > 0; --i) {
    parts[i] ^= parts[i - 1];
  }
  parts[0] ^= parts[14];

  const bits = Buffer.alloc(64);
  for (let i = 0; i < 64; ++i) {
    bits[i] = (parts[Math.floor(i / 5)] >> (4 - (i % 5))) & 1;
  }

  const cipherBytes = Buffer.alloc(8);
  for (let i = 0; i < 8; ++i) {
    cipherBytes[i] = 0;
  }

  for (let i = 0; i < 64; ++i) {
    cipherBytes[Math.floor(i / 8)] |= bits[i] << (~i & 7);
  }

  const decipheredBytes = Buffer.alloc(cipherBytes.length);
  unpack(decipheredBytes, cipher1(0x40, pack(cipherBytes)));
  unpack(decipheredBytes, cipher2(0x20, pack(decipheredBytes)));
  unpack(decipheredBytes, cipher1(0x00, pack(decipheredBytes)));

  return decipheredBytes.reverse().toString('hex').toUpperCase();
};
