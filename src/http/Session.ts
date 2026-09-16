/**
 * Session + flash middleware compatible with the express-session /
 * memorystore / connect-flash behavior used by the WebUI:
 * signed `connect.sid` cookies, a 5 minute rolling in-memory store and
 * `req.flash(type, ...messages)` backed by the session.
 */
import { createHmac, randomBytes } from 'crypto';
import { Handler, HttpRequest, HttpResponse, NextFunction } from './Engine';

export interface SessionOptions {
  secret: string;
  cookie?: {
    maxAge?: number;
    sameSite?: boolean | 'lax' | 'strict' | 'none';
    path?: string;
    httpOnly?: boolean;
    secure?: boolean;
  };
  resave?: boolean;
  saveUninitialized?: boolean;
}

interface StoredSession {
  id: string;
  data: any;
  expires: number;
}

/** Equivalent to the `cookie-signature` package. */
function sign(value: string, secret: string): string {
  const mac = createHmac('sha256', secret).update(value).digest('base64').replace(/=+$/, '');
  return `${value}.${mac}`;
}

function unsign(input: string, secret: string): string | false {
  const index = input.lastIndexOf('.');
  if (index === -1) return false;
  const value = input.slice(0, index);
  return sign(value, secret) === input ? value : false;
}

function serializeCookie(
  name: string,
  value: string,
  options: SessionOptions['cookie'] = {}
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];

  parts.push(`Path=${options.path ?? '/'}`);

  if (options.maxAge != null) {
    parts.push(`Max-Age=${Math.floor(options.maxAge / 1000)}`);
    parts.push(`Expires=${new Date(Date.now() + options.maxAge).toUTCString()}`);
  }

  if (options.httpOnly !== false) {
    parts.push('HttpOnly');
  }

  if (options.secure) {
    parts.push('Secure');
  }

  if (options.sameSite === true) {
    parts.push('SameSite=Strict');
  } else if (options.sameSite === 'strict') {
    parts.push('SameSite=Strict');
  } else if (options.sameSite === 'lax') {
    parts.push('SameSite=Lax');
  } else if (options.sameSite === 'none') {
    parts.push('SameSite=None');
  }

  return parts.join('; ');
}

export function session(options: SessionOptions): Handler {
  const store = new Map<string, StoredSession>();
  const maxAge = options.cookie?.maxAge ?? 300000;
  const cookieName = 'connect.sid';

  return (req: HttpRequest, res: HttpResponse, next: NextFunction) => {
    let sessionId: string | null = null;
    let record: StoredSession | null = null;

    const raw = req.cookies[cookieName];
    if (raw && raw.startsWith('s:')) {
      const unsigned = unsign(raw.slice(2), options.secret);
      if (unsigned) {
        const stored = store.get(unsigned);
        if (stored && stored.expires > Date.now()) {
          sessionId = unsigned;
          record = stored;
        } else if (stored) {
          store.delete(unsigned);
        }
      }
    }

    const isNew = record === null;
    if (!record) {
      sessionId = randomBytes(24).toString('base64').replace(/=+$/, '');
      record = { id: sessionId, data: {}, expires: Date.now() + maxAge };
    }

    const recordRef = record;
    req.session = recordRef.data;
    req.sessionID = recordRef.id;

    let touched = false;
    req.flash = (type: string, ...messages: any[]) => {
      const data = recordRef.data;
      if (!data.flash) data.flash = {};

      if (messages.length === 0) {
        const msgs = data.flash[type] || [];
        if (msgs.length > 0) {
          delete data.flash[type];
          touched = true;
        }
        return msgs;
      }

      data.flash[type] = data.flash[type] || [];
      for (const message of messages) {
        data.flash[type].push(message);
      }
      touched = true;
      return req.flash;
    };

    res.onFinish(() => {
      // resave: true - always persist while the session is alive
      if (touched || options.resave) {
        recordRef.expires = Date.now() + maxAge;
        store.set(recordRef.id, recordRef);
      }

      if (isNew && (touched || options.saveUninitialized)) {
        res.set(
          'Set-Cookie',
          serializeCookie(cookieName, `s:${sign(recordRef.id, options.secret)}`, {
            ...options.cookie,
            maxAge,
          })
        );
      }
    });

    next();
  };
}

/** Parses cookies for every request (equivalent to `cookie-parser()`). */
export const cookies = (): Handler => {
  return (req: HttpRequest, res: HttpResponse, next: NextFunction) => {
    next();
  };
};
