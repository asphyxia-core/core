import { RequestHandler } from 'express';
import { findKey, get, has, isArray } from 'lodash';

import {
  isKBin,
  kdecode,
  xmlToData,
  detectXMLEncoding,
  KBinEncoding,
  kgetEncoding,
} from '../utils/KBinJSON';
import { KonmaiEncrypt } from '../utils/KonmaiEncrypt';
import LzKN from '../utils/LzKN';
import { Logger } from '../utils/Logger';
import { EamuseSend } from '../eamuse/EamuseSend';
import { dataToXML } from '../utils/KBinJSON';
import { EamuseRootRouter } from '../eamuse/EamuseRootRouter';

// const ACCEPT_AGENTS = ['EAMUSE.XRPC/1.0', 'EAMUSE.Httpac/1.0'];

export interface EABody {
  data: object;
  buffer: Buffer;
  module: string;
  method: string;
  encrypted: boolean;
  compress: boolean;
  kencoded: boolean;
  encoding: KBinEncoding;
  model: string;
}

export interface EamuseInfo {
  gameCode: string;
  module: string;
  method: string;
  model: string;
}

export const EamuseMiddleware: RequestHandler = async (req, res, next) => {
  res.set('X-Powered-By', 'Asphyxia');

  const agent = req.headers['user-agent'] || '';

  if (agent.indexOf('Mozilla') >= 0) {
    (req as any).skip = true;
    return next();
  }

  const eamuseInfo = req.headers['x-eamuse-info'];

  let compress = req.headers['x-compress'];

  if (!compress) {
    compress = 'none';
  }

  const chunks: Buffer[] = [];

  req.on('data', chunk => {
    chunks.push(Buffer.from(chunk));
  });

  req.on('end', () => {
    // Logger.debug(req.url);
    const data = Buffer.concat(chunks);
    if (!data) {
      Logger.warn(`message by ${agent} is empty`);
      res.sendStatus(404);
      return;
    }

    let body = data;
    let encrypted = false;

    if (eamuseInfo) {
      encrypted = true;
      const key = new KonmaiEncrypt(eamuseInfo.toString());
      const decrypted = key.encrypt(body);
      body = decrypted;
    }

    if (body && compress === 'lz77') {
      body = LzKN.inflate(body);
    }

    if (!body) {
      Logger.error(`Failed to decompress message by ${agent}`);
      res.sendStatus(404);
      return;
    }

    let xml = null;
    let kencoded = false;

    let encoding: KBinEncoding = 'utf8';

    try {
      if (!isKBin(body)) {
        encoding = detectXMLEncoding(body);
        xml = xmlToData(body, encoding);
      } else {
        encoding = kgetEncoding(body);
        xml = kdecode(body);
        kencoded = true;
      }
    } catch (err) {
      Logger.error(`Failed to parse message by ${agent}`);
    }

    if (xml == null) {
      res.sendStatus(404);
      return;
    }

    const eaModule = findKey(
      get(xml, 'call'),
      x => has(x, '@attr.method') || has(x, '0.@attr.method')
    );

    if (!eaModule) {
      res.sendStatus(404);
      return;
    }

    let moduleObj: any[] = get(xml, `call.${eaModule}`, null);
    if (!isArray(moduleObj)) moduleObj = [moduleObj];

    const eaMethods: string[] = moduleObj.map(x => get(x, `@attr.method`));
    const eaMethod = eaMethods.join('.');
    const model = get(xml, 'call.@attr.model');

    if (!(process as any).pkg) {
      Logger.debug(`${eaModule}.${eaMethod}\n${dataToXML(xml, false)}`);
    }

    req.body = {
      data: xml,
      buffer: data,
      module: eaModule as string,
      method: eaMethod as string,
      compress: compress == 'lz77',
      encrypted,
      encoding,
      kencoded,
      model,
    } as EABody;
    next();
  });
};

export const EamuseRoute = (router: EamuseRootRouter): RequestHandler => {
  const route: RequestHandler = async (req, res, next) => {
    if ((req as any).skip) {
      next();
      return;
    }

    const body = req.body as EABody;

    const gameCode = body.model.split(':')[0];

    const send = new EamuseSend(body, res);
    const data = get(body.data, `call.${body.module}`);
    const info = { gameCode, module: body.module, method: body.method, model: body.model };

    // HACK: give facility ip
    if (body.module == 'facility' && body.method == 'get') {
      (info as any).ip = req.ip.includes(':') ? '127.0.0.1' : req.ip;
    }

    // HACK: give services host
    if (body.module == 'services' && body.method == 'get') {
      (info as any).host = req.hostname;
    }

    try {
      await router.run(gameCode, body.module, body.method, info, data, send);
    } catch (err) {
      Logger.error(err);
      send.object({}, { status: 1 });
    }
  };

  return route;
};
