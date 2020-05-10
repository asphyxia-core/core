import { RequestHandler } from 'express';
import { findKey, get, has } from 'lodash';

import { isKBin, kdecode, xmlToData } from '../utils/KBinJSON';
import { KonmaiEncrypt } from '../utils/KonmaiEncrypt';
import LzKN from '../utils/LzKN';
import { Logger } from '../utils/Logger';
import { EamuseModuleContainer } from '../eamuse/EamuseModuleContainer';
import { EamuseSend } from '../eamuse/EamuseSend';

// const ACCEPT_AGENTS = ['EAMUSE.XRPC/1.0', 'EAMUSE.Httpac/1.0'];

export interface EABody {
  data: object;
  buffer: Buffer;
  module: string;
  method: string;
  encrypted: boolean;
  compress: boolean;
  kencoded: boolean;
  model: string;
}

export interface EamuseInfo {
  module: string;
  method: string;
  model: string;
}

export const EamuseMiddleware: RequestHandler = async (req, res, next) => {
  res.set('X-Powered-By', 'Asphyxia');

  const agent = req.headers['user-agent'];

  if (agent.indexOf('Mozilla') >= 0) {
    // Skip browser
    // res.redirect(`http://${ARGS.ui_bind}:${ARGS.ui_port}`);
    return res.sendStatus(404);
  }

  // if (ACCEPT_AGENTS.indexOf(agent) < 0) {
  //   Logger.debug(`EAM: Unsupported agent: ${agent}`);
  //   res.sendStatus(404);
  //   return;
  // }

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
      Logger.error(`failed to decompress message by ${agent}`);
      res.sendStatus(404);
      return;
    }

    let xml = null;
    let kencoded = false;
    try {
      if (!isKBin(body)) {
        xml = xmlToData(body);
      } else {
        xml = kdecode(body);
        kencoded = true;
      }
    } catch (err) {
      Logger.error(`failed to parse message by ${agent}`);
    }

    if (xml == null) {
      res.sendStatus(404);
      return;
    }

    const eaModule = findKey(get(xml, 'call'), x => has(x, '@attr.method'));
    const eaMethod = get(xml, `call.${eaModule}.@attr.method`);
    const model = get(xml, 'call.@attr.model');

    if (!eaModule || !eaMethod) {
      res.sendStatus(404);
      return;
    }

    Logger.debug(`${eaModule}.${eaMethod}`);

    req.body = {
      data: xml,
      buffer: data,
      module: eaModule as string,
      method: eaMethod as string,
      compress: compress == 'lz77',
      encrypted,
      kencoded,
      model,
    } as EABody;
    next();
  });
};

export const EamuseRoute = (container: EamuseModuleContainer): RequestHandler => {
  const route: RequestHandler = async (req, res) => {
    const body = req.body as EABody;

    const gameCode = body.model.split(':')[0];

    const send = new EamuseSend(body, res);
    try {
      await container.run(
        gameCode,
        body.module,
        body.method,
        { module: body.module, method: body.method, model: body.model },
        get(body.data, `call.${body.module}`),
        send
      );
    } catch (err) {
      Logger.error(err);
      await send.object({}, { status: 1 });
    }
  };

  return route;
};
