// import { Encoding, codeToString, convert, stringToCode } from 'encoding-japanese';
import iconv from 'iconv-lite';

import xml2json from 'fast-xml-parser';
import { toSafeInteger, isArrayLike, get, isArray, isEmpty, toString, isNil } from 'lodash';
import json2xml = xml2json.j2xParser;

import { BinaryLengthType, ReadBuffer, WriteBuffer } from './AutoBuffer';

export type KAttrMap = { [key: string]: string };
export type KNumberType =
  | 's8'
  | 'u8'
  | 's16'
  | 'u16'
  | 's32'
  | 'u32'
  | 'time'
  | 'ip4'
  | 'float'
  | 'double'
  | 'bool';
export type KBigIntType = 's64' | 'u64';
export type KNumberGroupType =
  | '2s8'
  | '2u8'
  | '2s16'
  | '2u16'
  | '2s32'
  | '2u32'
  | '2f'
  | '2d'
  | '3s8'
  | '3u8'
  | '3s16'
  | '3u16'
  | '3s32'
  | '3u32'
  | '3f'
  | '3d'
  | '4s8'
  | '4u8'
  | '4s16'
  | '4u16'
  | '4s32'
  | '4u32'
  | '4f'
  | '4d'
  | '2b'
  | '3b'
  | '4b'
  | 'vb';
export type KBigIntGroupType =
  | '2s64'
  | '2u64'
  | '3s64'
  | '3u64'
  | '4s64'
  | '4u64'
  | 'vs8'
  | 'vu8'
  | 'vs16'
  | 'vu16';

export type KBinControlIdentifier = 'invalid' | 'attr' | 'array' | 'void';

export type KBinWriteableType =
  | 'bin'
  | 'str'
  | KNumberType
  | KNumberGroupType
  | KBigIntType
  | KBigIntGroupType;

export type KBinAllType =
  | 'bin'
  | 'str'
  | KNumberType
  | KNumberGroupType
  | KBigIntType
  | KBigIntGroupType
  | KBinControlIdentifier;

(BigInt.prototype as any).toJSON = function (this: bigint): string {
  return this.toString() + 'n';
};

const SIGNATURE = 0xa0;
const SIG_COMPRESSED = 0x42;
const SIG_UNCOMPRESSED = 0x45;

const XML_FORMATS: KBinAllType[] = [
  'invalid',
  'void',
  's8',
  'u8',
  's16',
  'u16',
  's32',
  'u32',
  's64',
  'u64',
  'bin',
  'str',
  'ip4',
  'time',
  'float',
  'double',
  '2s8',
  '2u8',
  '2s16',
  '2u16',
  '2s32',
  '2u32',
  '2s64',
  '2u64',
  '2f',
  '2d',
  '3s8',
  '3u8',
  '3s16',
  '3u16',
  '3s32',
  '3u32',
  '3s64',
  '3u64',
  '3f',
  '3d',
  '4s8',
  '4u8',
  '4s16',
  '4u16',
  '4s32',
  '4u32',
  '4s64',
  '4u64',
  '4f',
  '4d',
  'attr',
  'array',
  'vs8',
  'vu8',
  'vs16',
  'vu16',
  'bool',
  '2b',
  '3b',
  '4b',
  'vb',
];

function dataSizeOf(str: string): number {
  if (str[0] === '2') {
    return 2;
  } else if (str[0] === '3') {
    return 3;
  } else if (str[0] === '4') {
    return 4;
  } else if (str === 'vs64' || str === 'vu64' || str === 'vd') {
    return 2;
  } else if (str === 'vs32' || str === 'vu32' || str === 'vf') {
    return 4;
  } else if (str === 'vs16' || str === 'vu16') {
    return 8;
  } else if (str === 'vs8' || str === 'vu8' || str === 'vb') {
    return 16;
  }
  return 1;
}

const NUMBER_TYPES: { [key: string]: number } = {
  's8': 2,
  'u8': 3,
  's16': 4,
  'u16': 5,
  's32': 6,
  'u32': 7,
  'ip4': 12,
  'time': 13,
  'float': 14,
  'double': 15,
  '2s8': 16,
  '2u8': 17,
  '2s16': 18,
  '2u16': 19,
  '2s32': 20,
  '2u32': 21,
  '2f': 24,
  '2d': 25,
  '3s8': 26,
  '3u8': 27,
  '3s16': 28,
  '3u16': 29,
  '3s32': 30,
  '3u32': 31,
  '3f': 34,
  '3d': 35,
  '4s8': 36,
  '4u8': 37,
  '4s16': 38,
  '4u16': 39,
  '4s32': 40,
  '4u32': 41,
  '4f': 44,
  '4d': 45,
  'vs8': 48,
  'vu8': 49,
  'vs16': 50,
  'vu16': 51,
  'bool': 52,
  '2b': 53,
  '3b': 54,
  '4b': 55,
  'vb': 56,
  'f': 14,
  'd': 15,
  'vs32': 40,
  'vu32': 41,
  'vf': 44,
  'b': 52,
};

const BIGINT_TYPES: { [key: string]: number } = {
  's64': 8,
  'u64': 9,
  '2s64': 22,
  '2u64': 23,
  '3s64': 32,
  '3u64': 33,
  '4s64': 42,
  '4u64': 43,
  'vs64': 22,
  'vu64': 23,
};

const XML_TYPES: { [key: string]: number } = {
  ...NUMBER_TYPES,
  ...BIGINT_TYPES,
  void: 1,
  bin: 10,
  str: 11,
  attr: 46,
  array: 47,
  binary: 10,
  string: 11,
  nodeEnd: 190,
  endSection: 191,
  nodeStart: 1,
};

const CHARMAP = '0123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';
const BYTEMAP: { [key: string]: number } = {
  '0': 0,
  '1': 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  ':': 10,
  'A': 11,
  'B': 12,
  'C': 13,
  'D': 14,
  'E': 15,
  'F': 16,
  'G': 17,
  'H': 18,
  'I': 19,
  'J': 20,
  'K': 21,
  'L': 22,
  'M': 23,
  'N': 24,
  'O': 25,
  'P': 26,
  'Q': 27,
  'R': 28,
  'S': 29,
  'T': 30,
  'U': 31,
  'V': 32,
  'W': 33,
  'X': 34,
  'Y': 35,
  'Z': 36,
  '_': 37,
  'a': 38,
  'b': 39,
  'c': 40,
  'd': 41,
  'e': 42,
  'f': 43,
  'g': 44,
  'h': 45,
  'i': 46,
  'j': 47,
  'k': 48,
  'l': 49,
  'm': 50,
  'n': 51,
  'o': 52,
  'p': 53,
  'q': 54,
  'r': 55,
  's': 56,
  't': 57,
  'u': 58,
  'v': 59,
  'w': 60,
  'x': 61,
  'y': 62,
  'z': 63,
};

const ENCODING_STRINGS: { [key: number]: KBinEncoding } = {
  0x00: 'shift_jis',
  0x20: 'ascii',
  0x40: 'iso-8859-1',
  0x60: 'euc-jp',
  0x80: 'shift_jis',
  0xa0: 'utf8',
};

const ICONV2XML: { [key: string]: string } = {
  'shift_jis': 'Shift_JIS',
  'ascii': 'ASCII',
  'iso-8859-1': 'ISO-8859-1',
  'euc-jp': 'EUC-JP',
  'utf8': 'UTF-8',
};

const XML2ICONV: { [key: string]: KBinEncoding } = {
  'shift_jis': 'shift_jis',
  'shift-jis': 'shift_jis',
  'shiftjis': 'shift_jis',
  'ascii': 'ascii',
  'iso-8859-1': 'iso-8859-1',
  'euc-jp': 'euc-jp',
  'euc_jp': 'euc-jp',
  'eucjp': 'euc-jp',
  'utf-8': 'utf8',
  'utf_8': 'utf8',
  'utf8': 'utf8',
};

const ENCODING_VALS: { [key: string]: number } = {
  'shift_jis': 0x80,
  'utf8': 0xa0,
  'euc-jp': 0x60,
  'ascii': 0x20,
  'iso-8859-1': 0x40,
};

export type KBinEncoding = 'shift_jis' | 'utf8' | 'euc-jp' | 'ascii' | 'iso-8859-1';

export function isKBin(input: Buffer): boolean {
  if (input.length < 2) {
    return false;
  }
  const firstByte = input.readUInt8(0);
  const secondByte = input.readUInt8(1);
  return (
    firstByte === SIGNATURE && (secondByte === SIG_COMPRESSED || secondByte === SIG_UNCOMPRESSED)
  );
}

export function unpackSixbit(byteBuf: ReadBuffer | Buffer): string {
  if (byteBuf instanceof Buffer) {
    byteBuf = new ReadBuffer(byteBuf);
  }
  const length = Number(byteBuf.get('u8'));

  let value = 0;
  let valueBits = 0;
  let result = '';
  for (let i = 0; i < length; ++i) {
    if (valueBits < 6) {
      value = (value << 8) + Number(byteBuf.get('u8'));
      valueBits += 8;
    }

    const offset = valueBits - 6;
    const index = value >> offset;
    result += CHARMAP[index];
    valueBits -= 6;
    value = value - (index << offset);
  }

  return result;
}

export function packSixbit(str: string): Buffer {
  let padding = 8 - ((str.length * 6) % 8);
  if (padding === 8) {
    padding = 0;
  }

  const lengthBytes = Math.floor((str.length * 6 + padding) / 8);
  const result = Buffer.alloc(lengthBytes + 1);

  let value = 0;
  let valueBits = 0;
  let byteIndex = 0;

  result.writeUInt8(str.length, byteIndex);
  ++byteIndex;

  for (const char of str) {
    value = (value << 6) + BYTEMAP[char];
    valueBits += 6;

    if (valueBits >= 8) {
      valueBits -= 8;
      const byte = value >> valueBits;
      value = value - (byte << valueBits);
      result.writeUInt8(byte, byteIndex);
      ++byteIndex;
    }
  }

  if (valueBits > 0) {
    result.writeUInt8(value << (8 - valueBits), byteIndex);
  }

  return result;
}

function bufferToString(data: Buffer, encoding: KBinEncoding): string {
  if (data == null) {
    return '';
  }
  const str = iconv.decode(data, encoding);
  const result = str.substr(0, str.length - 1);
  return result;
}

function nodeToBinary(
  node: any,
  name: string,
  nodeBuf: WriteBuffer,
  dataBuf: WriteBuffer,
  encoding: KBinEncoding,
  compressed: boolean
): void {
  const jpEncoding = encoding;

  function appendNodeName(nodeName: string): void {
    if (compressed) {
      nodeBuf.writeBytes(packSixbit(nodeName));
    } else {
      const enc = iconv.encode(nodeName, jpEncoding);
      nodeBuf.writeBytes(Buffer.from([(enc.length - 1) | 64, ...enc]));
    }
  }

  const attrs = node['@attr'];

  let nodeType = attrs !== undefined ? attrs.__type : undefined;

  if (!nodeType) {
    if (node['@content'] && typeof node['@content'] === 'string') {
      nodeType = 'str';
    } else {
      nodeType = 'void';
    }
  }

  const nodeTypeID = XML_TYPES[nodeType];

  const count = attrs !== undefined ? attrs.__count : undefined;
  const isArray = count === undefined ? 0 : 64;

  nodeBuf.write('u8', nodeTypeID | isArray);
  appendNodeName(name);

  if (nodeType !== 'void') {
    const nodeFormat = XML_FORMATS[nodeTypeID];
    const dataCount = dataSizeOf(nodeFormat);
    const dataType = dataCount === 1 ? nodeFormat : nodeFormat.substr(1);

    let value = node['@content'];

    if (nodeFormat === 'str') {
      if (value === null || value === undefined) {
        value = '';
      }
      dataBuf.writeStream(iconv.encode(`${value}\0`, jpEncoding));
    } else if (nodeFormat === 'bin') {
      dataBuf.writeStream(value as Buffer);
    } else {
      let binaryType = dataType;
      if (binaryType === 'ip4' || binaryType === 'time') {
        binaryType = 'u32';
      } else if (binaryType === 'float') {
        binaryType = 'f';
      } else if (binaryType === 'double') {
        binaryType = 'd';
      } else if (binaryType === 'bool' || binaryType === 'b') {
        binaryType = 'u8';
      }

      if (isArray) {
        dataBuf.writeArray(binaryType as BinaryLengthType, value as (number | bigint)[]);
      } else {
        dataBuf.writeNumberData(binaryType as BinaryLengthType, value as (number | bigint)[]);
      }
    }
  }

  if (node['@attr']) {
    const sortedAttrs = Object.entries(node['@attr']).sort();
    for (const attr of sortedAttrs) {
      const k = attr[0];
      let v = attr[1] as any;

      switch (typeof v) {
        case 'number':
        case 'bigint':
        case 'boolean':
        case 'object':
          v = v.toString();
          break;
        case 'string':
          break;
        default:
          continue;
      }

      if (k.startsWith('__')) {
        continue;
      }

      // const dataStr = convert(stringToCode(v), jpEncoding, JOBJ_ENCODING).concat([0]);
      // const vData = Buffer.from(dataStr);
      dataBuf.writeStream(iconv.encode(`${v}\0`, jpEncoding));
      nodeBuf.write('u8', XML_TYPES.attr);
      appendNodeName(k);
    }
  }

  for (const child in node) {
    if (child === '@attr' || child === '@content') {
      continue;
    }
    const childNode = node[child];
    if (Array.isArray(childNode)) {
      for (const entry of childNode) {
        nodeToBinary(entry, child, nodeBuf, dataBuf, encoding, compressed);
      }
    } else {
      nodeToBinary(childNode, child, nodeBuf, dataBuf, encoding, compressed);
    }
  }

  nodeBuf.write('u8', XML_TYPES.nodeEnd | 64);
}

export function kencode(
  data: any,
  encoding: KBinEncoding = 'shift_jis',
  compressed = true
): Buffer {
  const header = Buffer.from([
    SIGNATURE,
    compressed ? SIG_COMPRESSED : SIG_UNCOMPRESSED,
    ENCODING_VALS[encoding],
    0xff ^ ENCODING_VALS[encoding],
    0,
    0,
    0,
    0,
  ]);

  const nodeBuf = new WriteBuffer();
  const dataBuf = new WriteBuffer();

  const rootKey = Object.keys(data)[0];
  nodeToBinary(data[rootKey], rootKey, nodeBuf, dataBuf, encoding, compressed);

  nodeBuf.write('u8', XML_TYPES.endSection | 64);
  nodeBuf.realign();

  header.writeUInt32BE(nodeBuf.length, 4);

  nodeBuf.write('u32', dataBuf.length);

  return Buffer.concat([header, nodeBuf.getBuffer(), dataBuf.getBuffer()]);
}

export function kgetEncoding(input: Buffer): KBinEncoding {
  const nodeBuf = new ReadBuffer(input);
  nodeBuf.get('u8');
  nodeBuf.get('u8');
  const encodingKey = Number(nodeBuf.get('u8'));
  if (
    Number(nodeBuf.get('u8')) !== (0xff ^ encodingKey) ||
    ENCODING_STRINGS[encodingKey] === undefined
  ) {
    return 'utf8';
  }

  return ENCODING_STRINGS[encodingKey];
}

export function kdecode(input: Buffer): any {
  const data = {};

  const nodeStack = [];
  let curNode: any = data;

  const nodeBuf = new ReadBuffer(input);
  if (Number(nodeBuf.get('u8')) !== SIGNATURE) {
    return;
  }

  const compress = Number(nodeBuf.get('u8'));
  if (compress !== SIG_COMPRESSED && compress !== SIG_UNCOMPRESSED) {
    return;
  }

  const compressed = compress === SIG_COMPRESSED;

  const encodingKey = Number(nodeBuf.get('u8'));
  if (
    Number(nodeBuf.get('u8')) !== (0xff ^ encodingKey) ||
    ENCODING_STRINGS[encodingKey] === undefined
  ) {
    return;
  }

  const encoding = ENCODING_STRINGS[encodingKey];

  const nodeEnd = Number(nodeBuf.get('u32')) + 8;

  const dataBuf = new ReadBuffer(input, nodeEnd);
  dataBuf.get('u32'); // Skip dataSize

  const hasNodesLeft = true;
  while (hasNodesLeft && nodeBuf.hasData()) {
    let nodeType = Number(nodeBuf.get('u8'));
    if (nodeType === 0) {
      continue;
    }

    const isArray = nodeType & 64;
    nodeType &= ~64;

    const nodeFormat = XML_FORMATS[nodeType];

    let name = '';
    if (nodeType !== XML_TYPES.nodeEnd && nodeType !== XML_TYPES.endSection) {
      if (compressed) {
        name = unpackSixbit(nodeBuf);
      } else {
        const length = (Number(nodeBuf.get('u8')) & ~64) + 1;
        name = bufferToString(nodeBuf.getBytes(length), encoding);
      }
    }

    let value = '';

    if (nodeType === XML_TYPES.attr) {
      const stream = dataBuf.getStream();
      value = bufferToString(stream, encoding);
      if (curNode['@attr'] === undefined) {
        curNode['@attr'] = {};
      }
      curNode['@attr'][name] = value;

      continue;
    } else if (nodeType === XML_TYPES.nodeEnd) {
      curNode = nodeStack.pop();
      continue;
    } else if (nodeType === XML_TYPES.endSection) {
      break;
    } else if (nodeFormat === undefined) {
      break;
    }

    const parentNode = curNode;
    nodeStack.push(parentNode);

    curNode = {};
    if (parentNode[name] !== undefined) {
      const thisParent = parentNode[name];
      if (Array.isArray(thisParent)) {
        const nodeList = thisParent;
        nodeList.push(curNode);
      } else {
        parentNode[name] = [thisParent, curNode];
      }
    } else {
      parentNode[name] = curNode;
    }

    if (nodeType === XML_TYPES.nodeStart) {
      continue;
    }

    if (curNode['@attr'] === undefined) {
      curNode['@attr'] = {};
    }
    curNode['@attr'].__type = nodeFormat;

    const dataCount = dataSizeOf(nodeFormat);
    const dataType = dataCount === 1 ? nodeFormat : nodeFormat.substr(1);

    if (nodeFormat === 'str') {
      const stream = dataBuf.getStream();
      curNode['@content'] = bufferToString(stream, encoding);
    } else if (nodeFormat === 'bin') {
      const stream = dataBuf.getStream();
      curNode['@content'] = stream;
    } else {
      let binaryType = dataType;
      if (binaryType === 'ip4' || binaryType === 'time') {
        binaryType = 'u32';
      } else if (binaryType === 'float') {
        binaryType = 'f';
      } else if (binaryType === 'double') {
        binaryType = 'd';
      } else if (binaryType === 'bool' || binaryType === 'b') {
        binaryType = 'u8';
      }

      if (isArray) {
        curNode['@content'] = dataBuf.getArray(binaryType as BinaryLengthType);
        curNode['@attr'].__count = Math.floor(curNode['@content'].length / dataCount);
      } else {
        curNode['@content'] = dataBuf.getNumberData(binaryType as BinaryLengthType, dataCount);
      }
    }
  }

  return data;
}

export function int2ip(valve: number): string {
  return (
    (valve >>> 24) + '.' + ((valve >> 16) & 255) + '.' + ((valve >> 8) & 255) + '.' + (valve & 255)
  );
}

export function ip2int(ip: string): number {
  const parts = ip.split('.');
  return (
    ((toSafeInteger(parts[0]) << 24) >>> 0) +
    (toSafeInteger(parts[1]) << 16) +
    (toSafeInteger(parts[2]) << 8) +
    toSafeInteger(parts[3])
  );
}

function escape(data: string | number): string {
  return data
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function unescape(data: string | number): string {
  return data
    .toString()
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stringed(data: any): any {
  if (typeof data !== 'object') return undefined;

  let result: any = {};
  if (Array.isArray(data)) {
    result = [];
    for (const element of data) {
      result.push(stringed(element));
    }
  } else {
    for (const prop in data) {
      if (prop == '@attr') {
        result['@attr'] = {};
        for (const attr in data[prop]) {
          result['@attr'][attr] = escape(data[prop][attr]);
        }
      } else if (prop == '@content') {
        const content = data['@content'];
        let type = get(data, '@attr.__type', 'str');
        if (typeof content == 'string') {
          result['@content'] = escape(content);
        } else if (Buffer.isBuffer(content)) {
          result['@content'] = content.toString('hex');
        } else if (Array.isArray(content)) {
          if (type == 'ip4') {
            result['@content'] = content.map(v => int2ip(v)).join(' ');
          } else {
            result['@content'] = content.join(' ');
          }
        }
      } else {
        result[prop] = stringed(data[prop]);
      }
    }
  }
  return result;
}

function unstringed(data: any): any {
  if (data === '') return {};

  if (typeof data == 'string') return kitem('str', data);

  if (typeof data !== 'object') return undefined;

  let result: any = {};
  if (Array.isArray(data)) {
    result = [];
    for (const element of data) {
      result.push(unstringed(element));
    }
  } else {
    for (const prop in data) {
      if (prop == '@attr') {
        result['@attr'] = {};
        for (const attr in data[prop]) {
          result['@attr'][attr] = unescape(data[prop][attr]);
        }
      } else if (prop == '@content') {
        const content = data['@content'];
        let type = get(data, '@attr.__type', 'str');
        if (typeof type != 'string' || typeof content != 'string') {
          return undefined;
        }

        if (type == 'str') {
          result['@content'] = unescape(content);
        } else if (type == 'bin') {
          result['@content'] = Buffer.from(content, 'hex');
        } else if (type == 'ip4') {
          result['@content'] = content.split(' ').map(v => ip2int(v));
        } else if (type.endsWith('64')) {
          result['@content'] = content.split(' ').map(v => BigInt(v));
        } else {
          result['@content'] = content.split(' ').map(v => parseFloat(v));
        }
      } else {
        result[prop] = unstringed(data[prop]);
      }
    }
  }
  return result;
}

export function dataToXML(data: any, header: boolean = true): string {
  const options = {
    attributeNamePrefix: '',
    attrNodeName: '@attr',
    textNodeName: '@content',
    ignoreAttributes: false,
    ignoreNameSpace: false,
    allowBooleanAttributes: false,
    parseNodeValue: true,
    parseAttributeValue: false,
    format: true,
    supressEmptyNode: true,
  };

  const parser = new json2xml(options);
  const xml = parser.parse(stringed(data));

  if (header) return "<?xml version='1.0' encoding='UTF-8'?>\n" + xml;
  else return xml;
}

export function dataToXMLBuffer(data: any, encoding: KBinEncoding): Buffer {
  const options = {
    attributeNamePrefix: '',
    attrNodeName: '@attr',
    textNodeName: '@content',
    ignoreAttributes: false,
    ignoreNameSpace: false,
    allowBooleanAttributes: false,
    parseNodeValue: true,
    parseAttributeValue: false,
    format: true,
    supressEmptyNode: true,
  };

  const parser = new json2xml(options);
  const xml = parser.parse(stringed(data));

  return iconv.encode(`<?xml version='1.0' encoding='${ICONV2XML[encoding]}'?>\n${xml}`, encoding);
}

export function detectXMLEncoding(xml: Buffer): KBinEncoding {
  const header = iconv.decode(xml.subarray(0, Math.min(128, xml.length)), 'ascii');
  const match = header.match(/<\?xml.*encoding=['|"](.*)['|"].*?>/);
  if (!match || match.length < 2) {
    return 'utf8';
  }
  const encoding = XML2ICONV[match[1].toLowerCase()];
  if (encoding == null) {
    return 'utf8';
  }

  return encoding;
}

export function xmlToData(xml: string): any;
export function xmlToData(xml: Buffer, encoding: KBinEncoding): any;
export function xmlToData(xml: string | Buffer, encoding?: KBinEncoding): any {
  let xmlStr = xml;
  if (typeof xmlStr !== 'string') {
    xmlStr = iconv.decode(xmlStr, encoding);
  }

  const options = {
    attributeNamePrefix: '',
    attrNodeName: '@attr',
    textNodeName: '@content',
    ignoreAttributes: false,
    ignoreNameSpace: false,
    allowBooleanAttributes: false,
    parseNodeValue: false,
    parseAttributeValue: false,
    trimValues: true,
  };

  const data = unstringed(xml2json.parse(xmlStr, options));

  return data;
}

export function kitem(type: 'str', content: string, attr?: KAttrMap): any;
export function kitem(type: 'bin', content: Buffer, attr?: KAttrMap): any;
export function kitem(type: 'ip4', content: string, attr?: KAttrMap): any;
export function kitem(type: 'bool', content: boolean, attr?: KAttrMap): any;
export function kitem(type: KNumberType, content: number, attr?: KAttrMap): any;
export function kitem(type: KBigIntType, content: bigint, attr?: KAttrMap): any;
export function kitem(type: KNumberGroupType, content: number[], attr?: KAttrMap): any;
export function kitem(type: KBigIntGroupType, content: bigint[], attr?: KAttrMap): any;
export function kitem(
  type: KBinWriteableType,
  content: string | boolean | number | bigint | object,
  attr?: KAttrMap
): any {
  if (!attr) {
    attr = {};
  }

  let contentObj = content;

  if (type === 'ip4' && typeof contentObj === 'string') {
    contentObj = [ip2int(contentObj)];
  }

  if (typeof contentObj === 'number' || typeof contentObj === 'bigint') {
    contentObj = [contentObj];
  }

  if (typeof contentObj === 'boolean') {
    contentObj = [contentObj ? 1 : 0];
  }

  const attrObj = {
    __type: type,
    ...attr,
  };

  return {
    '@attr': attrObj,
    '@content': contentObj,
  };
}

export function kattr(attr: KAttrMap, inner?: any) {
  return {
    ...inner,
    '@attr': attr,
  };
}

export function karray(type: 'u8' | 's8', content: Buffer, attr?: KAttrMap): any;
export function karray(type: KNumberType, content: number[], attr?: KAttrMap): any;
export function karray(type: KBigIntType, content: bigint[], attr?: KAttrMap): any;
export function karray(
  type: KNumberType | KBigIntType,
  content: number[] | bigint[] | Buffer,
  attr?: KAttrMap
): any {
  let value = content as any;
  if (typeof value == 'bigint' || typeof value == 'number') {
    value = [content] as any;
  }

  const item = kitem(type as any, value, attr);

  const countObj: any = {};
  if (isArrayLike(item['@content'])) {
    const dataSize = dataSizeOf(type);
    countObj.__count = Math.ceil(item['@content'].length / dataSize);
  }

  item['@attr'] = {
    ...item['@attr'],
    ...countObj,
  };

  return item;
}

// export function simplify(data: any) {}

export const getNumber = (data: any, path?: string, def?: number): number => {
  let value = get(data, path ? `${path}.@content` : '@content');
  let result = NaN;
  if (typeof value == 'string') {
    result = Number(value);
  } else {
    result = Number(get(data, path ? `${path}.@content.0` : `@content.0`, def));
  }

  if (isNaN(result)) {
    return def;
  }
  return result;
};

export const getBool = (data: any, path?: string): boolean => {
  return getNumber(data, path, 0) > 0;
};

export const getBigInt = (data: any, path?: string, def?: bigint): bigint => {
  let value = get(data, path ? `${path}.@content` : '@content', def);
  try {
    if (typeof value == 'string') {
      return BigInt(value);
    }
    return BigInt(get(data, path ? `${path}.@content.0` : `@content.0`, def));
  } catch (_) {
    return def;
  }
};

export const getContent = (data: any, path?: string, def?: any): any => {
  return get(data, path ? `${path}.@content` : `@content`, def);
};

export const getNumbers = (data: any, path?: string, def?: number[]): number[] => {
  const type = get(data, path ? `${path}.@attr.__type` : `@attr.__type`, 'void');
  if (!NUMBER_TYPES[type]) {
    return def;
  }
  return getContent(data, path, def);
};
export const getBigInts = (data: any, path?: string, def?: bigint[]): bigint[] => {
  const type = get(data, path ? `${path}.@attr.__type` : `@attr.__type`, 'void');
  if (!BIGINT_TYPES[type]) {
    return def;
  }
  return getContent(data, path, def);
};
export const getStr = (data: any, path?: string, def?: string): string => {
  const type = get(data, path ? `${path}.@attr.__type` : `@attr.__type`, 'void');
  if (type !== 'string' && type !== 'str') {
    return def;
  }
  return getContent(data, path, def);
};

export const getBuffer = (data: any, path?: string, def?: Buffer): Buffer => {
  const type = get(data, path ? `${path}.@attr.__type` : `@attr.__type`, 'void');
  if (type !== 'bin' && type !== 'binary') {
    return def;
  }
  return getContent(data, path, def);
};

export const getAttr = (data: any, path?: string): { [key: string]: string } => {
  if (!path) {
    return get(data, `@attr`, {});
  }
  return get(data, `${path}.@attr`, {});
};

export const getElement = (data: any, path: string): any => {
  const item: any = get(data, `${path}`);
  if (isNil(item)) return item;
  if (isArray(item)) {
    return item[0];
  }
  return item;
};

export const getElements = (data: any, path: string): any[] => {
  const item: any = get(data, `${path}`);
  if (isNil(item)) return [];
  if (isArray(item)) {
    return item;
  } else {
    return [item];
  }
};
