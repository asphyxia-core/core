import { Response } from 'express';
import { defaultTo, set, get, isArray } from 'lodash';
import { kencode, xmlToData, KBinEncoding, dataToXMLBuffer } from '../utils/KBinJSON';
import { KonmaiEncrypt } from '../utils/KonmaiEncrypt';
import LzKN from '../utils/LzKN';
import { PLUGIN_PATH } from '../utils/EamuseIO';
import { Logger } from '../utils/Logger';

import { render as ejs, compile as ejsCompile } from 'ejs';
import { compile as pugCompile, compileFile as pugCompileFile } from 'pug';
import path from 'path';
import { EABody } from '../middlewares/EamuseMiddleware';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { GetCallerPlugin } from './ExternalPluginLoader';

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

  private _safe_xml(
    result: any,
    options: EamuseSendOption = {},
    plugin?: ReturnType<typeof GetCallerPlugin>
  ) {
    if (result != null) {
      const keys = Object.keys(result);
      if (keys.length <= 0) return this.object({}, options);
      const rootName = keys[0];
      return this.object(result[rootName], { rootName, ...options }, plugin);
    }
    return this.object({}, { status: 1 });
  }

  object(
    content: any = {},
    options: EamuseSendOption = {},
    plugin?: ReturnType<typeof GetCallerPlugin>
  ) {
    if (!plugin) {
      plugin = GetCallerPlugin();
    }

    if (this.sent) {
      Logger.warn(
        `duplicated send operation from ${chalk.yellowBright(
          `${this.body.module}.${this.body.method}`
        )}`
      );
      return;
    }

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
      try {
        data = kencode(result, encoding, true);
      } catch (err) {
        if (err && err.path && isArray(err.path)) {
          Logger.error(
            new Error(`kencode failed: parsing error at '${err.path.join('.')}'`) as any,
            { plugin }
          );
        } else {
          Logger.error(new Error('kencode failed: unknown error') as any, { plugin });
        }
        this.object({}, { status: 1 }, plugin);
        return;
      }
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

    if (plugin) {
      this.res.setHeader('X-CORE-Plugin', plugin);
    }

    this.res.send(data);
    this.sent = true;
  }

  xml(template: string, data?: any, options?: EamuseSendOption) {
    const plugin = GetCallerPlugin();
    if (!plugin) {
      Logger.error(`Unexpected error during send`);
      return this.object({}, { status: 1 });
    }

    let result = null;
    try {
      result = xmlToData(ejs(template, data));
    } catch (err) {
      Logger.error(err, { plugin });
    } finally {
      return this._safe_xml(result, options, plugin);
    }
  }

  pug(template: string, data?: any, options?: EamuseSendOption) {
    const plugin = GetCallerPlugin();
    if (!plugin) {
      Logger.error(`Unexpected error during send`);
      return this.object({}, { status: 1 });
    }

    let result = null;
    try {
      const fn = pugCompile(template, { doctype: 'xml' });
      result = xmlToData(fn(data));
    } catch (err) {
      Logger.error(err, { plugin });
    } finally {
      return this._safe_xml(result, options, plugin);
    }
  }

  xmlFile(template: string, data?: any, options?: EamuseSendOption) {
    const plugin = GetCallerPlugin();
    if (!plugin) {
      Logger.error(`Unexpected error during send`);
      return this.object({}, { status: 1 });
    }

    let result = null;
    try {
      const filePath = path.join(PLUGIN_PATH, plugin, template);
      const fn = ejsCompile(readFileSync(filePath, { encoding: 'utf8' }));
      result = xmlToData(fn(data));
    } catch (err) {
      Logger.error(err, { plugin });
    } finally {
      return this._safe_xml(result, options, plugin);
    }
  }

  pugFile(template: string, data?: any, options?: EamuseSendOption) {
    const plugin = GetCallerPlugin();
    if (!plugin) {
      Logger.error(`Unexpected error during send`);
      return this.object({}, { status: 1 });
    }

    let result = null;
    try {
      const filePath = path.join(PLUGIN_PATH, plugin, template);
      const fn = pugCompileFile(filePath, { doctype: 'xml' });
      result = xmlToData(fn(data));
    } catch (err) {
      Logger.error(err, { plugin });
    } finally {
      return this._safe_xml(result, options, plugin);
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
