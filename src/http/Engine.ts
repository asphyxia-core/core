/**
 * Minimal express-compatible HTTP layer built directly on Bun.serve.
 *
 * Provides just the API surface Asphyxia CORE (and its WebUI) uses:
 * routing with params/splats, middleware chains, error handlers,
 * body parsers, cookie parsing, static files and pug view rendering.
 */
import { statSync, existsSync, readFileSync } from 'fs';
import path from 'path';
import { compileFile } from 'pug';
import { Logger } from '../utils/Logger';

declare const Bun: any;
export type Server = any;
export type RequestHandler = Handler;

// ---------------------------------------------------------------- types

export type NextFunction = (err?: any) => void;
export type Handler = (req: HttpRequest, res: HttpResponse, next: NextFunction) => any;
export type ErrorHandler = (
  err: any,
  req: HttpRequest,
  res: HttpResponse,
  next: NextFunction
) => any;
export type Middleware = Handler | ErrorHandler;

interface Layer {
  isUse: boolean;
  method?: string;
  regex: RegExp;
  keys: string[];
  handlers: (Middleware | RouterClass)[];
  originalPath: string;
  mount: string;
}

// ---------------------------------------------------------------- request

export class HttpRequest {
  public raw: Request;
  public server: Server;
  public method: string;
  public headers: Record<string, string> = {};
  public cookies: Record<string, string> = {};
  public params: Record<string, string> = {};
  public query: Record<string, any> = {};
  public path: string;
  public url: string;
  public originalUrl: string;
  public protocol: string;
  public hostname: string;
  public ip: string;
  public body: any;
  public session: any;
  public sessionID: string;
  public skip: boolean;
  public flash: (type: string, ...msgs: string[]) => any;

  private bodyPromise?: Promise<Buffer>;

  constructor(raw: Request, server: Server) {
    this.raw = raw;
    this.server = server;
    this.method = raw.method.toUpperCase();

    raw.headers.forEach((value, key) => {
      this.headers[key] = value;
    });

    this.cookies = parseCookies(raw.headers.get('cookie') || '');

    const parsed = new URL(raw.url);
    this.path = decodeURIComponent(parsed.pathname);
    this.url = parsed.pathname + parsed.search;
    this.originalUrl = this.url;
    this.query = parseQuery(parsed.search);

    this.protocol = 'http';
    const host = this.headers['host'] || '';
    const offset = host[0] === '[' ? host.indexOf(']') + 1 : 0;
    const index = host.indexOf(':', offset);
    this.hostname = index !== -1 ? host.substring(0, index) : host;

    const ipInfo = server.requestIP(raw);
    this.ip = ipInfo ? ipInfo.address : '127.0.0.1';
  }

  public get(name: string): string {
    return this.headers[name.toLowerCase()];
  }

  public header(name: string): string {
    return this.get(name);
  }

  public bytes(): Promise<Buffer> {
    if (!this.bodyPromise) {
      this.bodyPromise = this.raw
        .arrayBuffer()
        .then(buf => Buffer.from(buf))
        .catch(() => Buffer.alloc(0));
    }
    return this.bodyPromise;
  }

  public text(): Promise<string> {
    return this.bytes().then(buf => buf.toString('utf8'));
  }

  public json(): Promise<any> {
    return this.text().then(text => JSON.parse(text));
  }

  public formData(): Promise<FormData> {
    return this.raw.formData();
  }
}

// ---------------------------------------------------------------- response

function statusMessage(code: number): string {
  const messages: { [key: number]: string } = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    301: 'Moved Permanently',
    302: 'Found',
    304: 'Not Modified',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    409: 'Conflict',
    413: 'Payload Too Large',
    415: 'Unsupported Media Type',
    500: 'Internal Server Error',
    501: 'Not Implemented',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
  };
  return messages[code] || String(code);
}

export class HttpResponse {
  public statusCode = 200;
  public headers: Record<string, string> = {};
  public body: Buffer | string | null = null;
  public finished = false;

  private app: App;
  private finishHooks: (() => void)[] = [];

  constructor(app: App) {
    this.app = app;
  }

  public set(name: string, value: any): this {
    this.headers[name.toLowerCase()] = String(value);
    return this;
  }

  public setHeader(name: string, value: any): this {
    return this.set(name, value);
  }

  public getHeader(name: string): string | undefined {
    return this.headers[name.toLowerCase()];
  }

  public status(code: number): this {
    this.statusCode = code;
    return this;
  }

  public type(contentType: string): this {
    if (!this.headers['content-type']) {
      this.set('Content-Type', contentType);
    }
    return this;
  }

  public onFinish(callback: () => void): void {
    this.finishHooks.push(callback);
  }

  public json(data: any): this {
    const body = JSON.stringify(data);
    this.set('Content-Type', 'application/json; charset=utf-8');
    return this.send(body);
  }

  public send(data?: any): this {
    if (this.finished) return this;

    if (data === undefined || data === null) {
      this.body = null;
    } else if (Buffer.isBuffer(data)) {
      if (!this.headers['content-type']) {
        this.set('Content-Type', 'application/octet-stream');
      }
      this.body = data;
    } else if (typeof data === 'string') {
      if (!this.headers['content-type']) {
        this.set('Content-Type', 'text/html; charset=utf-8');
      }
      this.body = data;
    } else if (typeof data === 'object') {
      return this.json(data);
    } else {
      if (!this.headers['content-type']) {
        this.set('Content-Type', 'text/html; charset=utf-8');
      }
      this.body = String(data);
    }

    if (this.body != null && !this.headers['content-length']) {
      this.set('Content-Length', Buffer.byteLength(this.body as any));
    }

    this.finish();
    return this;
  }

  public sendStatus(code: number): this {
    this.statusCode = code;
    this.type('text/plain; charset=utf-8');
    return this.send(statusMessage(code));
  }

  public redirect(url: string): this {
    this.statusCode = 302;
    this.set('Location', url);
    this.set('Vary', 'Accept');
    this.type('text/plain; charset=utf-8');
    return this.send(`Found. Redirecting to ${url}`);
  }

  public render(view: string, locals: any = {}): this {
    const views = this.app.get('views');
    const engine = this.app.get('view engine') || 'pug';
    const file = path.join(views, `${view}.${engine}`);

    if (engine !== 'pug') {
      throw new Error(`Unsupported view engine: ${engine}`);
    }

    let fn = this.app.viewCache[file];
    if (!fn) {
      fn = compileFile(file);
      this.app.viewCache[file] = fn;
    }

    const html = fn({ ...locals });
    this.set('Content-Type', 'text/html; charset=utf-8');
    return this.send(html);
  }

  public sendFile(file: string, options?: any, callback?: (err?: any) => void): this {
    try {
      if (!existsSync(file)) {
        const err: any = new Error(`ENOENT: no such file or directory, stat '${file}'`);
        err.code = 'ENOENT';
        err.status = 404;
        throw err;
      }
      const stat = statSync(file);
      if (stat.isDirectory()) {
        const err: any = new Error(`EISDIR: illegal operation on a directory, read`);
        err.code = 'EISDIR';
        throw err;
      }

      serveFile(this, file, stat);
      if (callback) callback();
    } catch (err) {
      if (callback) {
        callback(err);
      } else {
        throw err;
      }
    }
    return this;
  }

  public end(data?: any): this {
    return this.send(data);
  }

  /** Runs registered finish hooks (session cookie, etc). */
  public finish(): void {
    if (this.finished) return;
    this.finished = true;
    for (const hook of this.finishHooks) {
      try {
        hook();
      } catch {}
    }
  }

  public toResponse(req?: HttpRequest): Response {
    if (!this.finished) this.finish();

    const headers = { ...this.headers };
    const body = req && req.method === 'HEAD' ? null : this.body;

    if (body === null) {
      return new Response(null, { status: this.statusCode, headers });
    }
    return new Response(body as any, { status: this.statusCode, headers });
  }
}

// ---------------------------------------------------------------- helpers

export function parseCookies(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    const key = part.slice(0, index).trim();
    if (!key) continue;
    const value = part.slice(index + 1).trim();
    try {
      out[key] = decodeURIComponent(value);
    } catch {
      out[key] = value;
    }
  }
  return out;
}

function setNested(target: any, key: string, value: string): void {
  const match = key.match(/^([^[\]]+)((?:\[[^\]]*\])*)$/);
  if (!match) {
    if (key in target) {
      target[key] = ([] as any[]).concat(target[key], value);
    } else {
      target[key] = value;
    }
    return;
  }

  const [, root, brackets] = match;
  const parts = (brackets.match(/\[[^\]]*\]/g) || []).map(p => p.slice(1, -1));

  let cursor = target;
  if (parts.length === 0) {
    if (root in cursor) {
      cursor[root] = ([] as any[]).concat(cursor[root], value);
    } else {
      cursor[root] = value;
    }
    return;
  }

  if (!(root in cursor) || typeof cursor[root] !== 'object' || cursor[root] === null) {
    cursor[root] = {};
  }
  cursor = cursor[root];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const isLast = i === parts.length - 1;
    const keyName = part === '' ? String(Array.isArray(cursor) ? cursor.length : 0) : part;

    if (isLast) {
      if (keyName in cursor) {
        cursor[keyName] = ([] as any[]).concat(cursor[keyName], value);
      } else {
        cursor[keyName] = value;
      }
    } else {
      if (!(keyName in cursor) || typeof cursor[keyName] !== 'object' || cursor[keyName] === null) {
        cursor[keyName] = {};
      }
      cursor = cursor[keyName];
    }
  }
}

export function parseQuery(search: string): Record<string, any> {
  const out: Record<string, any> = {};
  if (!search) return out;
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  for (const [key, value] of params) {
    if (key.includes('[')) {
      setNested(out, key, value);
    } else if (key in out) {
      out[key] = ([] as any[]).concat(out[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

const MIME_TYPES: { [ext: string]: string } = {
  '.html': 'text/html; charset=UTF-8',
  '.htm': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.mjs': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.map': 'application/json; charset=UTF-8',
  '.txt': 'text/plain; charset=UTF-8',
  '.md': 'text/markdown; charset=UTF-8',
  '.xml': 'application/xml; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml; charset=UTF-8',
  '.ico': 'image/x-icon',
  '.bmp': 'image/bmp',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
};

function serveFile(res: HttpResponse, file: string, stat: any): void {
  const ext = path.extname(file).toLowerCase();
  const mime = MIME_TYPES[ext] || 'application/octet-stream';
  const size = stat.size;
  const mtime = stat.mtimeMs;

  res.set('Content-Type', mime);
  res.set('Content-Length', size);
  res.set('Accept-Ranges', 'bytes');
  res.set('Cache-Control', 'public, max-age=0');
  res.set('ETag', `W/"${size.toString(16)}-${Math.floor(mtime).toString(16)}"`);
  res.set('Last-Modified', new Date(mtime).toUTCString());

  res.body = readFileSync(file);
  res.finish();
}

export function staticHandler(root: string): Handler {
  const resolvedRoot = path.resolve(root);

  return (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next();
    }

    let filePath: string;
    try {
      filePath = path.resolve(resolvedRoot, '.' + req.path);
    } catch {
      return next();
    }

    if (filePath !== resolvedRoot && !filePath.startsWith(resolvedRoot + path.sep)) {
      return next();
    }

    let stat: any;
    try {
      stat = statSync(filePath);
    } catch {
      return next();
    }

    if (stat.isDirectory()) {
      const index = path.join(filePath, 'index.html');
      try {
        stat = statSync(index);
        filePath = index;
      } catch {
        return next();
      }
    }

    serveFile(res, filePath, stat);
  };
}

// ---------------------------------------------------------------- body parsers

function contentIs(req: HttpRequest, type: string): boolean {
  const contentType = req.headers['content-type'] || '';
  return contentType.split(';')[0].trim().toLowerCase() === type;
}

function parseLimit(limit?: string): number {
  if (!limit) return 0;
  const match = /^(\d+(?:\.\d+)?)\s*(kb|mb|gb)?$/i.exec(limit.trim());
  if (!match) return 0;
  const value = parseFloat(match[1]);
  const unit = (match[2] || 'b').toLowerCase();
  const multiplier =
    unit === 'kb' ? 1024 : unit === 'mb' ? 1024 * 1024 : unit === 'gb' ? 1024 * 1024 * 1024 : 1;
  return Math.floor(value * multiplier);
}

export function json(options: { limit?: string } = {}): Handler {
  const limit = parseLimit(options.limit);
  return async (req, res, next) => {
    if (req.body !== undefined || !contentIs(req, 'application/json')) {
      return next();
    }

    try {
      const buf = await req.bytes();
      if (limit && buf.length > limit) {
        res.status(413).send('Payload Too Large');
        return;
      }
      req.body = buf.length === 0 ? {} : JSON.parse(buf.toString('utf8'));
      next();
    } catch (err) {
      res.status(400).send('Bad Request');
    }
  };
}

export function urlencoded(options: { extended?: boolean; limit?: string } = {}): Handler {
  const limit = parseLimit(options.limit);
  return async (req, res, next) => {
    if (req.body !== undefined || !contentIs(req, 'application/x-www-form-urlencoded')) {
      return next();
    }

    try {
      const buf = await req.bytes();
      if (limit && buf.length > limit) {
        res.status(413).send('Payload Too Large');
        return;
      }
      req.body = parseQuery(buf.toString('utf8'));
      next();
    } catch (err) {
      res.status(400).send('Bad Request');
    }
  };
}

// ---------------------------------------------------------------- router

function pathToRegex(pathname: string, isUse: boolean): { regex: RegExp; keys: string[] } {
  if (pathname === '*' || pathname === '/*') {
    return { regex: /^(.*)$/, keys: ['0'] };
  }

  if (isUse && (pathname === '' || pathname === '/')) {
    return { regex: /^/, keys: [] };
  }

  const keys: string[] = [];
  let pattern = '';

  const parts = pathname.split('/');
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (i > 0) pattern += '/';
    if (part === '*') {
      keys.push(String(keys.length));
      pattern += '(.*)';
    } else if (part.startsWith(':')) {
      keys.push(part.slice(1));
      pattern += '([^/]+)';
    } else {
      pattern += part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
  }

  if (!pattern.startsWith('/')) pattern = '/' + pattern;
  if (isUse) {
    pattern = '^' + pattern + '(?=/|$)';
  } else {
    pattern = '^' + pattern + '/?$';
  }

  return { regex: new RegExp(pattern), keys };
}

function combinePaths(mount: string, child: string): string {
  if (mount === '' || mount === '/' || mount === '*') {
    if (child === '' || child === '/') return mount === '*' ? '*' : '/';
    return child;
  }
  if (child === '' || child === '/') {
    return mount;
  }
  if (child === '*') {
    return mount + '/*';
  }
  return mount + child;
}

export class RouterClass {
  public stack: Layer[] = [];

  public use(...handlers: Handler[]): this;
  public use(...handlers: ErrorHandler[]): this;
  public use(router: RouterClass): this;
  public use(path: string, ...handlers: Handler[]): this;
  public use(path: string, ...handlers: ErrorHandler[]): this;
  public use(path: string, router: RouterClass): this;
  public use(...args: any[]): this {
    let mount = '/';
    if (typeof args[0] === 'string') {
      mount = args.shift();
    }
    this.addLayer(true, mount, undefined, args.flat());
    return this;
  }

  public all(pathname: string, ...handlers: Handler[]): this {
    this.addLayer(false, pathname, '*', handlers.flat());
    return this;
  }

  public get(pathname: string, ...handlers: Handler[]): this {
    this.addLayer(false, pathname, 'GET', handlers.flat());
    return this;
  }

  public post(pathname: string, ...handlers: Handler[]): this {
    this.addLayer(false, pathname, 'POST', handlers.flat());
    return this;
  }

  public put(pathname: string, ...handlers: Handler[]): this {
    this.addLayer(false, pathname, 'PUT', handlers.flat());
    return this;
  }

  public delete(pathname: string, ...handlers: Handler[]): this {
    this.addLayer(false, pathname, 'DELETE', handlers.flat());
    return this;
  }

  private addLayer(isUse: boolean, pathname: string, method: string | undefined, handlers: any[]): void {
    const expanded: Layer[] = [];

    for (const handler of handlers.flat()) {
      if (handler instanceof RouterClass) {
        for (const layer of handler.stack) {
          const combined = combinePaths(pathname, layer.originalPath);
          const layerIsUse = layer.isUse;
          const { regex, keys } = pathToRegex(combined, layerIsUse);
          expanded.push({
            isUse: layerIsUse,
            method: layer.method,
            regex,
            keys,
            handlers: layer.handlers,
            originalPath: combined,
            mount: combined,
          });
        }
      } else {
        const { regex, keys } = pathToRegex(pathname, isUse);
        expanded.push({
          isUse,
          method,
          regex,
          keys,
          handlers: [handler],
          originalPath: pathname,
          mount: pathname,
        });
      }
    }

    this.stack.push(...expanded);
  }

  public async handle(req: HttpRequest, res: HttpResponse): Promise<void> {
    return this.dispatch(req, res);
  }

  protected dispatch(req: HttpRequest, res: HttpResponse): Promise<void> {
    const stack = this.stack;

    return new Promise<void>(resolve => {
      let index = 0;
      let error: any = null;
      let settled = false;

      const settle = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };

      // Any response that completes the chain settles the dispatch.
      res.onFinish(settle);

      const next: NextFunction = (err?: any) => {
        if (err) error = err;

        while (index < stack.length) {
          const layer = stack[index++];
          if (layer.method && layer.method !== '*' && layer.method !== req.method) continue;

          const match = layer.regex.exec(req.path);
          if (!match) continue;

          const params: Record<string, string> = {};
          for (let i = 0; i < layer.keys.length; i++) {
            const value = match[i + 1];
            if (value !== undefined) params[layer.keys[i]] = value;
          }
          req.params = params;

          const handlers = layer.handlers;
          const isError = !!error;
          const currentError = error;
          error = null;

          // express-style mount stripping (e.g. app.use('/static', ...))
          const strip =
            layer.isUse && layer.mount !== '/' && layer.mount !== '*' && layer.mount !== '';
          const savedPath = req.path;
          const savedUrl = req.url;
          const restore = () => {
            req.path = savedPath;
            req.url = savedUrl;
          };
          if (strip) {
            req.path = req.path.slice(layer.mount.length) || '/';
            const qIndex = req.originalUrl.indexOf('?');
            req.url = req.path + (qIndex >= 0 ? req.originalUrl.slice(qIndex) : '');
          }

          if (isError) {
            const errorHandler = handlers.find(h => (h as any).length === 4) as
              | ErrorHandler
              | undefined;
            if (!errorHandler) {
              error = currentError;
              continue;
            }
            try {
              const result = (errorHandler as any)(currentError, req, res, next);
              if (result && typeof result.then === 'function') {
                result.catch((e: any) => next(e));
              }
            } catch (e) {
              next(e);
            }
            return;
          }

          let handlerIndex = 0;
          const runNext: NextFunction = (handlerError?: any) => {
            if (handlerError) {
              restore();
              return next(handlerError);
            }
            const handler = handlers[handlerIndex++];
            if (!handler) {
              restore();
              return next();
            }
            try {
              const result = (handler as any)(req, res, runNext);
              if (result && typeof result.then === 'function') {
                result.catch((e: any) => {
                  restore();
                  next(e);
                });
              }
            } catch (e) {
              restore();
              next(e);
            }
          };

          runNext();
          return;
        }

        if (error) {
          Logger.error(error);
          if (!res.finished) {
            res.status(500);
            res.set('Content-Type', 'text/plain; charset=utf-8');
            res.send('Internal Server Error');
          }
        }

        settle();
      };

      next();
    });
  }
}

// ---------------------------------------------------------------- app

export type Router = RouterClass;

export function Router(): RouterClass {
  return new RouterClass();
}

export class App extends RouterClass {
  public settings: Record<string, any> = {};
  public viewCache: { [file: string]: (locals: any) => string } = {};

  public set(key: string, value: any): this {
    this.settings[key] = value;
    return this;
  }

  public get(key: string): any;
  public get(pathname: string, ...handlers: Handler[]): this;
  public get(key: string, ...handlers: Handler[]): any {
    if (handlers.length > 0) {
      return super.get(key, ...handlers);
    }
    return this.settings[key];
  }

  public enable(key: string): this {
    return this.set(key, true);
  }

  public disable(key: string): this {
    return this.set(key, false);
  }

  public enabled(key: string): boolean {
    return Boolean(this.settings[key]);
  }

  public listen(
    port: number,
    hostname: string,
    callback?: () => void
  ): { stop: () => void; server: Server } {
    const server = Bun.serve({
      port,
      hostname,
      fetch: async (request: Request, srv: any) => {
        const req = new HttpRequest(request, srv);
        const res = new HttpResponse(this);

        try {
          await this.handle(req, res);
        } catch (err) {
          Logger.error(err as any);
          if (!res.finished) {
            res.status(500);
            res.set('Content-Type', 'text/plain; charset=utf-8');
            res.body = 'Internal Server Error';
          }
        }

        if (!res.finished) {
          res.status(404);
          res.type('text/html; charset=utf-8');
          res.send(`Cannot ${req.method} ${req.originalUrl}`);
        }

        return res.toResponse(req);
      },
    });

    if (callback) callback();

    return {
      server,
      stop: () => server.stop(true),
    };
  }
}
