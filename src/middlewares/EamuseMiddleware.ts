import path from 'path';
import { render as ejs, renderFile as ejsFile } from 'ejs';
import { render as pug, renderFile as pugFile } from 'pug';

import { RequestHandler } from 'express';
import { findKey, get, has, defaultTo, set } from 'lodash';

import { isKBin, kdecode, kencode, xmlToData } from '../utils/KBinJSON';
import { KonmaiEncrypt } from '../utils/KonmaiEncrypt';
import LzKN from '../utils/LzKN';
import { Logger } from '../utils/Logger';
import { EamuseModuleContainer } from '../eamuse/EamuseModuleContainer';
import { GetCallerModule, MODULE_PATH } from '../utils/EamuseIO';
import { ARGS } from '../utils/ArgParser';
import { toHiraganaCase } from 'encoding-japanese';
import { EamuseSend } from '../eamuse/EamuseSend';

// const ACCEPT_AGENTS = ['EAMUSE.XRPC/1.0', 'EAMUSE.Httpac/1.0'];

export interface EABody {
  data: object;
  buffer: Buffer;
  module: string;
  method: string;
  encrypted: boolean;
  compress: 'none' | 'lz77' | 'forcenone';
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
    res.redirect(`http://${ARGS.ui_bind}:${ARGS.ui_port}`);
    return;
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
      Logger.debug(`EAM: No Data`);
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
      Logger.debug(`EAM: Failed Data Processing`);
      res.sendStatus(404);
      return;
    }

    let xml;
    if (!isKBin(body)) {
      xml = xmlToData(body);
    } else {
      xml = kdecode(body);
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
      compress,
      encrypted,
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
