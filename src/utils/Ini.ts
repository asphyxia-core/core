/**
 * Dependency-free drop-in replacement for the `ini` package (ISC license)
 * used by Asphyxia CORE. Kept behaviorally identical, including quoting,
 * escaping, `key[]` arrays, dotted-section merging and `__proto__` guards,
 * so existing config.ini files parse exactly as before.
 */
const EOL = process.platform === 'win32' ? '\r\n' : '\n';

function isQuoted(val: string): boolean {
  return (
    (val.charAt(0) === '"' && val.slice(-1) === '"') ||
    (val.charAt(0) === "'" && val.slice(-1) === "'")
  );
}

function safe(val: any): string {
  return typeof val !== 'string' ||
    val.match(/[=\r\n]/) ||
    val.match(/^\[/) ||
    (val.length > 1 && isQuoted(val)) ||
    val !== val.trim()
    ? JSON.stringify(val)
    : val.replace(/;/g, '\\;').replace(/#/g, '\\#');
}

function unsafe(val: string, _doUnesc?: boolean): any {
  let value = (val || '').trim();
  if (isQuoted(value)) {
    if (value.charAt(0) === "'") {
      value = value.substr(1, value.length - 2);
    }

    try {
      value = JSON.parse(value);
    } catch (_) {}
  } else {
    let esc = false;
    let unesc = '';
    for (let i = 0, l = value.length; i < l; i++) {
      const c = value.charAt(i);
      if (esc) {
        if ('\\;#'.indexOf(c) !== -1) {
          unesc += c;
        } else {
          unesc += '\\' + c;
        }
        esc = false;
      } else if (';#'.indexOf(c) !== -1) {
        break;
      } else if (c === '\\') {
        esc = true;
      } else {
        unesc += c;
      }
    }
    if (esc) {
      unesc += '\\';
    }

    return unesc.trim();
  }
  return value;
}

function dotSplit(str: string): string[] {
  return str
    .replace(/\u0001/g, '\u0002LITERAL\\1LITERAL\u0002')
    .replace(/\\\./g, '\u0001')
    .split(/\./)
    .map(part =>
      part.replace(/\u0001/g, '\\.').replace(/\u0002LITERAL\\1LITERAL\u0002/g, '\u0001')
    );
}

export function parse(str: string): any {
  const out: any = {};
  let p = out;
  let section: string = null;
  const re = /^\[([^\]]*)\]$|^([^=]+)(=(.*))?$/i;
  const lines = str.split(/[\r\n]+/g);

  lines.forEach(line => {
    if (!line || line.match(/^\s*[;#]/)) {
      return;
    }
    const match = line.match(re);
    if (!match) {
      return;
    }
    if (match[1] !== undefined) {
      section = unsafe(match[1]);
      if (section === '__proto__') {
        p = {};
        return;
      }
      p = out[section] = out[section] || {};
      return;
    }
    let key = unsafe(match[2]);
    if (key === '__proto__') {
      return;
    }
    let value = match[3] ? unsafe(match[4]) : true;
    switch (value) {
      case 'true':
      case 'false':
      case 'null':
        value = JSON.parse(value);
    }

    // Convert keys with '[]' suffix to an array
    if (key.length > 2 && key.slice(-2) === '[]') {
      key = key.substring(0, key.length - 2);
      if (key === '__proto__') {
        return;
      }
      if (!p[key]) {
        p[key] = [];
      } else if (!Array.isArray(p[key])) {
        p[key] = [p[key]];
      }
    }

    // safeguard against resetting a previously defined
    // array by accidentally forgetting the brackets
    if (Array.isArray(p[key])) {
      p[key].push(value);
    } else {
      p[key] = value;
    }
  });

  Object.keys(out)
    .filter(k => {
      if (!out[k] || typeof out[k] !== 'object' || Array.isArray(out[k])) {
        return false;
      }

      const parts = dotSplit(k);
      let q = out;
      const l = parts.pop();
      const nl = l.replace(/\\\./g, '.');
      parts.forEach(part => {
        if (part === '__proto__') {
          return;
        }
        if (!q[part] || typeof q[part] !== 'object') {
          q[part] = {};
        }
        q = q[part];
      });
      if (q === out && nl === l) {
        return false;
      }

      q[nl] = out[k];
      return true;
    })
    .forEach(del => {
      delete out[del];
    });

  return out;
}

function encode(obj: any, opt?: any): string {
  const children: string[] = [];
  let out = '';

  if (typeof opt === 'string') {
    opt = { section: opt, whitespace: false };
  } else {
    opt = opt || {};
    opt.whitespace = opt.whitespace === true;
  }

  const separator = opt.whitespace ? ' = ' : '=';

  Object.keys(obj).forEach(k => {
    const val = obj[k];
    if (val && Array.isArray(val)) {
      val.forEach((item: any) => {
        out += safe(k + '[]') + separator + safe(item) + '\n';
      });
    } else if (val && typeof val === 'object') {
      children.push(k);
    } else {
      out += safe(k) + separator + safe(val) + EOL;
    }
  });

  if (opt.section && out.length) {
    out = '[' + safe(opt.section) + ']' + EOL + out;
  }

  children.forEach(k => {
    const nk = dotSplit(k).join('\\.');
    const section = (opt.section ? opt.section + '.' : '') + nk;
    const child = encode(obj[k], { section: section, whitespace: opt.whitespace });
    if (out.length && child.length) {
      out += EOL;
    }

    out += child;
  });

  return out;
}

export function stringify(obj: any, opt?: any): string {
  return encode(obj, opt);
}

export default { parse, stringify };
