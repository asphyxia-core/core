/**
 * XML parsing (via Bun 1.4's built-in `Bun.XML`) and serialization
 * (a faithful port of fast-xml-parser 3's json2xml) matching the exact
 * shapes and byte output the rest of CORE expects.
 */
declare const Bun: any;

// ------------------------------------------------------------- strnum port

const HEX_REGEX = /^[-+]?0x[a-fA-F0-9]+$/;
const NUM_REGEX = /^([\-\+])?(0*)([0-9]*(\.[0-9]*)?)$/;

function trimZeros(numStr: string): string {
  if (numStr && numStr.indexOf('.') !== -1) {
    numStr = numStr.replace(/0+$/, '');
    if (numStr === '.') numStr = '0';
    else if (numStr[0] === '.') numStr = '0' + numStr;
    else if (numStr[numStr.length - 1] === '.') numStr = numStr.substr(0, numStr.length - 1);
    return numStr;
  }
  return numStr;
}

/** Port of the `strnum` package used by fast-xml-parser's parseNodeValue. */
function parseValue(value: any): any {
  if (!value || typeof value !== 'string') return value;

  const str = value;
  const trimmedStr = str.trim();

  if (trimmedStr === 'true') return true;
  if (trimmedStr === 'false') return false;
  if (str === '0') return 0;
  if (HEX_REGEX.test(trimmedStr)) {
    return parseInt(trimmedStr, 16);
  }
  if (trimmedStr.search(/[eE]/) !== -1) {
    const notation = trimmedStr.match(/^([-\+])?(0*)([0-9]*(\.[0-9]*)?[eE][-\+]?[0-9]+)$/);
    if (notation) {
      return Number((notation[1] || '') + notation[3]);
    }
    return str;
  }

  const match = NUM_REGEX.exec(trimmedStr);
  if (match) {
    const sign = match[1];
    const leadingZeros = match[2];
    const numTrimmedByZeros = trimZeros(match[3]);

    if (leadingZeros === str) return 0;

    const num = Number(trimmedStr);
    const numStr = '' + num;

    if (numStr.search(/[eE]/) !== -1) {
      return num;
    }
    if (trimmedStr.indexOf('.') !== -1) {
      if (numStr === '0' && numTrimmedByZeros === '') return num;
      else if (numStr === numTrimmedByZeros) return num;
      else if (sign && numStr === '-' + numTrimmedByZeros) return num;
      else return str;
    }

    if (leadingZeros) {
      return numTrimmedByZeros === numStr || sign + numTrimmedByZeros === numStr ? num : str;
    }
    return trimmedStr === numStr || trimmedStr === sign + numStr ? num : str;
  }

  return str;
}

// ------------------------------------------------------------- entities

const ENTITY_REGEX = /&(?:[a-zA-Z][a-zA-Z0-9]*|#\d+|#x[0-9a-fA-F]+);/g;

/**
 * fast-xml-parser leaves entity references as written while Bun.XML
 * expands them, and keeps CDATA content untrimmed. Mask both with
 * private-use placeholders before parsing and restore them afterwards.
 */
function hideEntities(xml: string): { xml: string; entities: string[] } {
  const entities: string[] = [];
  let out = '';
  let i = 0;

  const placeholder = (value: string) => {
    entities.push(value);
    return `\uE000${entities.length - 1}\uE001`;
  };

  while (i < xml.length) {
    if (xml.startsWith('<![CDATA[', i)) {
      const end = xml.indexOf(']]>', i + 9);
      if (end === -1) {
        out += xml.slice(i);
        break;
      }
      out += placeholder(xml.slice(i + 9, end));
      i = end + 3;
      continue;
    }

    if (xml[i] === '&') {
      ENTITY_REGEX.lastIndex = i;
      const match = ENTITY_REGEX.exec(xml);
      if (match && match.index === i) {
        out += placeholder(match[0]);
        i += match[0].length;
        continue;
      }
    }

    out += xml[i];
    i++;
  }

  return { xml: out, entities };
}

function restoreEntities(node: any, entities: string[]): any {
  if (typeof node === 'string') {
    return node.replace(/\uE000(\d+)\uE001/g, (_m, index) => entities[Number(index)] ?? _m);
  }
  if (Array.isArray(node)) {
    return node.map(item => restoreEntities(item, entities));
  }
  if (node && typeof node === 'object') {
    for (const key of Object.keys(node)) {
      node[key] = restoreEntities(node[key], entities);
    }
  }
  return node;
}

// ------------------------------------------------------------- parsing

function fromCompactInternal(node: any): any {
  if (typeof node === 'string') {
    return node.trim();
  }
  if (Array.isArray(node)) {
    return node.map(fromCompactInternal);
  }
  if (!node || typeof node !== 'object') {
    return node;
  }

  const attrs: any = {};
  let hasAttrs = false;
  let text: string | undefined;

  for (const key of Object.keys(node)) {
    if (key.startsWith('@')) {
      attrs[key.slice(1)] = typeof node[key] === 'string' ? node[key].trim() : node[key];
      hasAttrs = true;
    } else if (key === '#text') {
      text = String(node[key]).trim();
    }
  }

  // fast-xml-parser orders "@content" before "@attr", then children
  const out: any = {};
  if (text !== undefined) {
    out['@content'] = text;
  }
  if (hasAttrs) {
    out['@attr'] = attrs;
  }
  for (const key of Object.keys(node)) {
    if (!key.startsWith('@') && key !== '#text') {
      out[key] = fromCompactInternal(node[key]);
    }
  }
  return out;
}

/**
 * fast-xml-parser is lenient about stray text and malformed documents;
 * Bun.XML is strict. On failure, parse the input inside a synthetic root
 * (dropping text outside elements) or return '' like fast-xml-parser does
 * for documents with no elements at all.
 */
function parseLenient<T>(xml: string, convert: (node: any) => T): T | '' {
  const { xml: hidden, entities } = hideEntities(xml);
  try {
    return restoreEntities(convert(Bun.XML.parse(hidden)), entities);
  } catch {}

  if (!xml.includes('<')) {
    return '';
  }

  try {
    const wrapped = restoreEntities(convert(Bun.XML.parse('<root>' + hidden + '</root>')), entities);
    const inner = (wrapped as any).root;
    if (inner && typeof inner === 'object') {
      delete inner['@content'];
      delete inner['#text'];
      return inner;
    }
    return '';
  } catch {
    return '';
  }
}

/** Equivalent to `xml2json.parse(xml, internalOptions)`. */
export function parseXmlInternal(xml: string): any {
  return parseLenient(xml, fromCompactInternal);
}

function fromCompactSimple(node: any): any {
  if (typeof node === 'string') {
    return parseValue(node.trim());
  }
  if (Array.isArray(node)) {
    return node.map(fromCompactSimple);
  }
  if (!node || typeof node !== 'object') {
    return node;
  }

  const childKeys = Object.keys(node).filter(key => !key.startsWith('@') && key !== '#text');

  // attributes are ignored in the default (simple) mode; an element with
  // only text becomes its value, an empty element becomes ''
  if (childKeys.length === 0) {
    if (node['#text'] !== undefined) {
      return parseValue(String(node['#text']).trim());
    }
    return '';
  }

  const out: any = {};
  if (node['#text'] !== undefined) {
    const text = String(node['#text']).trim();
    if (text !== '') {
      out['#text'] = parseValue(text);
    }
  }
  for (const key of childKeys) {
    out[key] = fromCompactSimple(node[key]);
  }
  return out;
}

/** Equivalent to `xml2json.parse(xml)` with fast-xml-parser's defaults. */
export function parseXmlSimple(xml: string): any {
  return parseLenient(xml, fromCompactSimple);
}

// ------------------------------------------------------------- serializing

interface WriteOptions {
  attrNodeName: string;
  textNodeName: string;
  indentBy: string;
  format: boolean;
  supressEmptyNode: boolean;
}

const DEFAULT_WRITE_OPTIONS: WriteOptions = {
  attrNodeName: '@attr',
  textNodeName: '@content',
  indentBy: '  ',
  format: true,
  supressEmptyNode: true,
};

class XmlBuilder {
  private options: WriteOptions;

  constructor(options: Partial<WriteOptions> = {}) {
    this.options = { ...DEFAULT_WRITE_OPTIONS, ...options };
  }

  public parse(jObj: any): string {
    return this.j2x(jObj, 0).val;
  }

  private indentate(level: number): string {
    return this.options.format ? this.options.indentBy.repeat(level) : '';
  }

  private get tagEndChar(): string {
    return this.options.format ? '>\n' : '>';
  }

  private buildEmptyTextNode(val: any, key: string, attrStr: string, level: number): string {
    if (val !== '') {
      return this.buildTextValNode(val, key, attrStr, level);
    }
    return this.indentate(level) + '<' + key + attrStr + '/' + this.tagEndChar;
  }

  private buildEmptyObjNode(val: string, key: string, attrStr: string, level: number): string {
    if (val !== '') {
      return this.buildObjectNode(val, key, attrStr, level);
    }
    return this.indentate(level) + '<' + key + attrStr + '/' + this.tagEndChar;
  }

  private buildTextValNode(val: any, key: string, attrStr: string, level: number): string {
    return (
      this.indentate(level) +
      '<' +
      key +
      attrStr +
      '>' +
      val +
      '</' +
      key +
      this.tagEndChar
    );
  }

  private buildObjectNode(val: string, key: string, attrStr: string, level: number): string {
    if (attrStr && val.indexOf('<') === -1) {
      return (
        this.indentate(level) +
        '<' +
        key +
        attrStr +
        '>' +
        val +
        '</' +
        key +
        this.tagEndChar
      );
    }
    return (
      this.indentate(level) +
      '<' +
      key +
      attrStr +
      this.tagEndChar +
      val +
      this.indentate(level) +
      '</' +
      key +
      this.tagEndChar
    );
  }

  private processTextOrObjNode(object: any, key: string, level: number): string {
    const result = this.j2x(object, level + 1);
    if (
      object[this.options.textNodeName] !== undefined &&
      Object.keys(object).length === 1
    ) {
      return this.buildTextNode(result.val, key, result.attrStr, level);
    }
    return this.buildObjNode(result.val, key, result.attrStr, level);
  }

  private buildTextNode(val: any, key: string, attrStr: string, level: number): string {
    return this.options.supressEmptyNode
      ? this.buildEmptyTextNode(val, key, attrStr, level)
      : this.buildTextValNode(val, key, attrStr, level);
  }

  private buildObjNode(val: string, key: string, attrStr: string, level: number): string {
    return this.options.supressEmptyNode
      ? this.buildEmptyObjNode(val, key, attrStr, level)
      : this.buildObjectNode(val, key, attrStr, level);
  }

  private j2x(jObj: any, level: number): { attrStr: string; val: string } {
    let attrStr = '';
    let val = '';

    for (const key in jObj) {
      if (typeof jObj[key] === 'undefined') {
        // supress undefined node
      } else if (jObj[key] === null) {
        val += this.indentate(level) + '<' + key + '/' + this.tagEndChar;
      } else if (jObj[key] instanceof Date) {
        val += this.buildTextNode(jObj[key], key, '', level);
      } else if (typeof jObj[key] !== 'object') {
        if (key === this.options.textNodeName) {
          val += '' + jObj[key];
        } else {
          val += this.buildTextNode(jObj[key], key, '', level);
        }
      } else if (Array.isArray(jObj[key])) {
        const arrLen = jObj[key].length;
        for (let j = 0; j < arrLen; j++) {
          const item = jObj[key][j];
          if (typeof item === 'undefined') {
            // supress undefined node
          } else if (item === null) {
            val += this.indentate(level) + '<' + key + '/' + this.tagEndChar;
          } else if (typeof item === 'object') {
            val += this.processTextOrObjNode(item, key, level);
          } else {
            val += this.buildTextNode(item, key, '', level);
          }
        }
      } else if (key === this.options.attrNodeName) {
        const keys = Object.keys(jObj[key]);
        for (let j = 0; j < keys.length; j++) {
          attrStr += ' ' + keys[j] + '="' + jObj[key][keys[j]] + '"';
        }
      } else {
        val += this.processTextOrObjNode(jObj[key], key, level);
      }
    }

    return { attrStr, val };
  }
}

/** Equivalent to `new json2xml(options).parse(data)` for CORE's options. */
export function buildXml(data: any, format: boolean = true): string {
  const builder = new XmlBuilder({
    attrNodeName: '@attr',
    textNodeName: '@content',
    indentBy: '  ',
    format,
    supressEmptyNode: true,
  });
  return builder.parse(data);
}

export default { parseXmlInternal, parseXmlSimple, buildXml };
