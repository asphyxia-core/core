import { Response, Request } from 'express';
import { defaultTo, has, set } from 'lodash';
import { kencode, xmlToData, KBinEncoding, KAttrMap } from '../utils/KBinJSON';
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
  attr?: KAttrMap;
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

    const encoding = defaultTo(options.encoding, 'SHIFT_JIS');
    const attr = defaultTo(options.attr, {});
    const status = defaultTo(options.status, 0);
    const rootName = defaultTo(options.rootName, this.body.module);

    const resAttr = {
      ...attr,
    };
    const result = { response: { '@attr': resAttr } };
    if (!has(content, '@attr')) {
      content['@attr'] = { status };
    } else {
      set(content, '@attr.status', status);
    }

    set(result, `response.${rootName}`, content);

    let kBin = kencode(result, encoding, true);
    const key = new KonmaiEncrypt();
    const pubKey = key.getPublicKey();
    let compress = 'none';

    const kBinLen = kBin.length;
    if (this.body.compress !== 'none' && kBinLen > 500) {
      compress = 'lz77';
      kBin = LzKN.deflate(kBin);
    }

    this.res.setHeader('X-Compress', compress);
    if (this.body.encrypted) {
      this.res.setHeader('X-Eamuse-Info', pubKey);
      kBin = key.encrypt(kBin);
    }

    this.res.send(kBin);
  }

  async xml(template: string, data?: any, options?: EamuseSendOption) {
    const mod = GetCallerModule();
    if (!mod) {
      Logger.error(`unexpected error: unknown module`);
      return this.object({}, { status: 1 });
    }

    try {
      const result = xmlToData(ejs(template, data));
      return this.object(result, options);
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
      return this.object(result, options);
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
      return this.object(result, options);
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
      return this.object(result, options);
    } catch (err) {
      Logger.error(err, { module: mod.name });
      return this.object({}, { status: 1 });
    }
  }
  success(options?: EamuseSendOption) {
    this.object({}, { status: 0 });
  }

  deny(options?: EamuseSendOption) {
    this.object({}, { status: 1 });
  }

  status(code: number, options?: EamuseSendOption) {
    this.object({}, { status: code });
  }
}
