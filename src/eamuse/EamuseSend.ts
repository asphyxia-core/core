import { Response } from 'express';
import { defaultTo, set, get } from 'lodash';
import { kencode, xmlToData, KBinEncoding, dataToXMLBuffer } from '../utils/KBinJSON';
import { KonmaiEncrypt } from '../utils/KonmaiEncrypt';
import LzKN from '../utils/LzKN';
import { GetCallerModule, MODULE_PATH } from '../utils/EamuseIO';
import { Logger } from '../utils/Logger';

import { render as ejs, renderFile as ejsFile } from 'ejs';
import { render as pug, renderFile as pugFile } from 'pug';
import path from 'path';
import { EABody } from '../middlewares/EamuseMiddleware';
import chalk from 'chalk';

export interface EamuseSendOption {
  status?: number;
  encoding?: KBinEncoding;
  rootName?: string;
  compress?: boolean;
  kencode?: boolean;
  encrypt?: boolean;
}

export class EamuseSend {
  private sent: boolean;
  private res: Response;
  private body: EABody;

  constructor(body: EABody, res: Response) {
    this.body = body;
    this.res = res;
  }

  async object(content: any = {}, options: EamuseSendOption = {}) {
    if (this.sent) {
      Logger.warn(
        `duplicated send operation from ${chalk.yellowBright(
          `${this.body.module}.${this.body.method}`
        )}`
      );
      return;
    }

    this.sent = true;

    const encoding = defaultTo(options.encoding, this.body.encoding);
    const status = defaultTo(options.status, get(content, '@attr.status', 0));
    const rootName = defaultTo(options.rootName, this.body.module);

    const kencoded = defaultTo(options.kencode, this.body.kencoded);
    const compress = defaultTo(options.compress, this.body.compress);
    const encrypted = defaultTo(options.encrypt, this.body.encrypted);

    const result = { response: {} };
    content['@attr'] = { ...content['@attr'], status };
    set(result, `response.${rootName}`, content);

    let data = null;

    if (kencoded) {
      data = kencode(result, encoding, true);
    } else {
      data = dataToXMLBuffer(result, encoding);
    }

    let xcompress = 'none';

    const kBinLen = data.length;
    if (compress && kBinLen > 500) {
      xcompress = 'lz77';
      data = LzKN.deflate(data);
    }
    this.res.setHeader('X-Compress', xcompress);

    if (encrypted) {
      const key = new KonmaiEncrypt();
      const pubKey = key.getPublicKey();

      this.res.setHeader('X-Eamuse-Info', pubKey);
      data = key.encrypt(data);
    }

    this.res.send(data);
  }

  async xml(template: string, data?: any, options?: EamuseSendOption) {
    const mod = GetCallerModule();
    if (!mod) {
      Logger.error(`unexpected error: unknown module`);
      return this.object({}, { status: 1 });
    }

    try {
      const result = xmlToData(ejs(template, data));

      const keys = Object.keys(result);
      if (keys.length <= 0) return this.object({}, options);
      const rootName = keys[0];
      return this.object(result[rootName], { rootName, ...options });
    } catch (err) {
      Logger.error(err, { module: mod.name });
      return this.object({}, { status: 1 });
    }
  }

  async pug(template: string, data?: any, options?: EamuseSendOption) {
    const mod = GetCallerModule();
    if (!mod) {
      Logger.error(`unexpected error: unknown module`);
      return this.object({}, { status: 1 });
    }

    try {
      const result = xmlToData(pug(template, data));

      const keys = Object.keys(result);
      if (keys.length <= 0) return this.object({}, options);
      const rootName = keys[0];
      return this.object(result[rootName], { rootName, ...options });
    } catch (err) {
      Logger.error(err, { module: mod.name });
      return this.object({}, { status: 1 });
    }
  }

  async xmlFile(template: string, data?: any, options?: EamuseSendOption) {
    const mod = GetCallerModule();
    if (!mod) {
      Logger.error(`unexpected error: unknown module`);
      return this.object({}, { status: 1 });
    }

    if (mod.single) {
      Logger.error(`cannot render file templates from single-file modules`, { module: mod.name });
      return this.object({}, { status: 1 });
    }

    try {
      const xml = await ejsFile(path.join(MODULE_PATH, mod.name, template), data, {});
      const result = xmlToData(xml);

      const keys = Object.keys(result);
      if (keys.length <= 0) return this.object({}, options);
      const rootName = keys[0];
      return this.object(result[rootName], { rootName, ...options });
    } catch (err) {
      Logger.error(err, { module: mod.name });
      return this.object({}, { status: 1 });
    }
  }

  async pugFile(template: string, data?: any, options?: EamuseSendOption) {
    const mod = GetCallerModule();
    if (!mod) {
      Logger.error(`unexpected error: unknown module`);
      return this.object({}, { status: 1 });
    }

    if (mod.single) {
      Logger.error(`cannot render file templates from single-file modules`, { module: mod.name });
      return this.object({}, { status: 1 });
    }

    try {
      const result = xmlToData(pugFile(path.join(MODULE_PATH, mod.name, template), data));

      const keys = Object.keys(result);
      if (keys.length <= 0) return this.object({}, options);
      const rootName = keys[0];
      return this.object(result[rootName], { rootName, ...options });
    } catch (err) {
      Logger.error(err, { module: mod.name });
      return this.object({}, { status: 1 });
    }
  }
  success(options?: EamuseSendOption) {
    return this.object({}, { ...options, status: 0 });
  }

  deny(options?: EamuseSendOption) {
    return this.object({}, { ...options, status: 1 });
  }

  status(code: number, options?: EamuseSendOption) {
    return this.object({}, { ...options, status: code });
  }
}
