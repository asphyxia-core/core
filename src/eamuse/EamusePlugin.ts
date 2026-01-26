import { EamuseRouteHandler } from './EamuseRouteContainer';
import { EamuseInfo } from '../middlewares/EamuseMiddleware';
import { EamuseSend } from './EamuseSend';
import { isNil } from 'lodash';
import { Logger } from '../utils/Logger';
import { PLUGIN_PATH, APIFindOne, APIFind } from '../utils/EamuseIO';
import path from 'path';
import { readdirSync, readFileSync } from 'fs';
import { FindCard, CreateProfile, CreateCard, BindProfile } from '../utils/EamuseIO';

import { compile } from 'pug';
import { CONFIG } from '../utils/ArgConfig';
import { nfc2card } from '../utils/CardCipher';

async function cardSanitizer(gameCode: string, str: string, refMap: any): Promise<string> {
  const regex =
    /(^|[^A-Za-z0-9])((?:01[A-Fa-f0-9]{14})|(?:E004[A-Fa-f0-9]{12}))($|[^A-Za-z0-9=\-_,+\/])/g;
  const regexI =
    /(^|[^A-Za-z0-9])((?:01[A-Fa-f0-9]{14})|(?:E004[A-Fa-f0-9]{12}))($|[^A-Za-z0-9=\-_,+\/])/;
  if (typeof str !== 'string') {
    return str;
  }

  for (const match of str.match(regex) || []) {
    const parts = match.match(regexI);
    const cid = parts && parts[2];

    if (!cid) return str;

    if (refMap[cid]) break;

    try {
      const did = nfc2card(cid);
      const card = await FindCard(cid);
      if (!card) {
        const newProfile = await CreateProfile('unset', gameCode);
        if (!newProfile) return null;
        const newCard = await CreateCard(cid, newProfile.__refid);
        if (!newCard) return null;
        refMap[cid] = `${newCard.__refid}|${did}`;
      } else {
        refMap[cid] = `${card.__refid}|${did}`;
        await BindProfile(card.__refid, gameCode);
      }
    } catch (err) {
      // allow these through
      return str;
    }
  }
  return str.replace(regex, (_, start, card, end) => {
    return `${start}${refMap[card]}${end}`;
  });
}

async function sanitization(gameCode: string, data: any, refMap: any = {}) {
  if (typeof data !== 'object') return undefined;

  if (Array.isArray(data)) {
    for (const element of data) {
      await sanitization(gameCode, element, refMap);
    }
  } else {
    for (const prop in data) {
      if (prop == '@attr') {
        for (const attr in data[prop]) {
          if (typeof data[prop][attr] == 'string') {
            const refid = await cardSanitizer(gameCode, data[prop][attr], refMap);
            if (refid == null) return null;
            data['@attr'][attr] = refid;
          }
        }
      } else if (prop == '@content') {
        const content = data['@content'];
        if (typeof content == 'string') {
          const refid = await cardSanitizer(gameCode, content, refMap);
          if (refid == null) return null;
          data['@content'] = refid;
        }
      } else {
        await sanitization(gameCode, data[prop], refMap);
      }
    }
  }
  return data;
}

export type WebUISend = {
  json: (data: any) => void;
  text: (data: string) => void;
  file: (path: string) => void;
  buffer: (buffer: Buffer) => void;
  redirect: (url: string) => void;
  error: (code: number, message: string) => void;
};
export type WebUIEventHandler = (data: any, send: WebUISend) => Promise<void>;

export class EamusePlugin {
  private pluginName: string;
  private pluginIdentifier: string;
  private gameCodes: string[];
  private routes: {
    [method: string]: boolean | EamuseRouteHandler;
  };
  private unhandled: boolean | EamuseRouteHandler;
  private contributors: {
    name: string;
    link?: string;
  }[];

  private uiPages: string[];
  private uiProfiles: string[];
  private uiEvents: {
    [event: string]: WebUIEventHandler;
  };
  private uiCache: {
    [file: string]: {
      props: { [field: string]: string };
      fn: (local: any) => string;
    };
  };

  private instance: any;

  constructor(folderName: string, instance: any) {
    this.instance = instance;
    this.pluginName = folderName.split('@')[0].toUpperCase();
    this.pluginIdentifier = folderName;
    this.gameCodes = [];
    this.routes = {};
    this.unhandled = false;
    this.contributors = [];

    this.uiPages = [];
    this.uiProfiles = [];
    this.uiCache = {};
    this.uiEvents = {};
    const webuiPath = path.join(PLUGIN_PATH, folderName, 'webui');
    try {
      const files = readdirSync(webuiPath, { encoding: 'utf8', withFileTypes: true }).filter(
        file =>
          file.isFile() &&
          file.name.endsWith('.pug') &&
          !file.name.startsWith('_') &&
          file.name != 'profiles.pug' &&
          file.name != 'profile.pug' &&
          file.name != 'static.pug'
      );
      this.uiPages = files
        .filter(f => !f.name.startsWith('profile_'))
        .map(f => path.basename(f.name, '.pug'))
        .sort();
      this.uiProfiles = files
        .filter(f => f.name.startsWith('profile_'))
        .map(f => path.basename(f.name, '.pug'))
        .sort();
      this.CompilePages();
    } catch {}
  }

  public Register() {
    this.instance.register();
  }

  private ExpressionCheck(isProfile: boolean, expression: string) {
    const nothingFunc = () => {};

    const DB = {
      FindOne: nothingFunc,
      Find: nothingFunc,
    };
    const U = {
      GetConfig: nothingFunc,
    };

    if (isProfile) {
      const refid: any = undefined;
      eval(expression);
    } else {
      eval(expression);
    }
  }

  private CompilePages() {
    for (const page of this.uiPages.concat(this.uiProfiles)) {
      const filePath = path.join(PLUGIN_PATH, this.pluginIdentifier, 'webui', `${page}.pug`);
      try {
        const template = readFileSync(filePath, { encoding: 'utf8' });

        const dataBlock = template.match(
          /^\/\/DATA\/\/\s*$[\n|\r|\n\r]((?:^\s+[_a-z]\w*:\s*.+$[\n|\r|\n\r]?)+)/m
        );

        const fn = compile(template);
        const props: { [field: string]: string } = {};

        const lines = dataBlock ? dataBlock[1].split('\n') : [];
        for (const line of lines) {
          const parts = line.trim().match(/([_a-z]\w*):\s*(.*)/);
          if (parts) {
            const field = parts[1];
            const expression = parts[2].endsWith(',')
              ? parts[2].slice(0, parts.length - 1)
              : parts[2];

            this.ExpressionCheck(page.startsWith('profile_'), expression);
            props[field] = expression;
          }
        }

        this.uiCache[page] = { props, fn };
      } catch (err) {
        Logger.error(`Can not compile WebUI file "${page}.pug":`, {
          plugin: this.pluginIdentifier,
        });
        Logger.error(err, { plugin: this.pluginIdentifier });
      }
    }
  }

  public RegisterContributor(name: string, link?: string) {
    this.contributors.push({ name, link });
  }

  public RegisterGameCode(gameCode: string) {
    this.gameCodes.push(gameCode);
  }

  public RegisterRoute(method: string, route?: boolean | EamuseRouteHandler) {
    this.routes[method] = route;
  }

  public RegisterWebUIEvent(event: string, callback: WebUIEventHandler) {
    this.uiEvents[event] = callback;
  }

  public async CallEvent(event: string, data: any, send: WebUISend) {
    if (this.uiEvents[event]) {
      return await this.uiEvents[event](data, send);
    } else {
      Logger.warn(`event "${event}" does not exists`, { plugin: this.pluginIdentifier });
    }
  }

  public RegisterUnhandled(handler?: EamuseRouteHandler) {
    if (handler) {
      this.unhandled = handler;
    } else {
      this.unhandled = true;
    }
  }

  public get Pages() {
    return this.uiPages;
  }

  public get ProfilePages() {
    return this.uiProfiles;
  }

  public get FirstProfilePage() {
    if (this.uiProfiles.length > 0) {
      return this.uiProfiles[0];
    }
    return null;
  }

  public async render(page: string, data: any, refid?: string) {
    const cache = this.uiCache[page];
    if (!cache) return null;

    const DB = {
      FindOne: (arg1: any, arg2?: any) => {
        return APIFindOne({ identifier: this.pluginIdentifier, core: false }, arg1, arg2);
      },
      Find: (arg1: any, arg2?: any) => {
        return APIFind({ identifier: this.pluginIdentifier, core: false }, arg1, arg2);
      },
    };
    const U = {
      GetConfig: (key: string) => {
        if (!CONFIG[this.pluginIdentifier]) return undefined;
        return CONFIG[this.pluginIdentifier][key];
      },
    };

    const IO = {},
      $ = {},
      R = {},
      K = {};

    const local: any = { refid };
    for (const prop in cache.props) {
      local[prop] = await eval(cache.props[prop]);
    }

    return cache.fn({ ...data, ...local });
  }

  public async run(
    moduleName: string,
    method: string,
    info: EamuseInfo,
    data: any,
    send: EamuseSend
  ): Promise<boolean> {
    let handler = this.routes[`${moduleName}.${method}`];

    const sanitized = await sanitization(info.gameCode, data);
    if (sanitized == null) {
      return false;
    }

    if (isNil(handler)) {
      if (this.unhandled) {
        if (typeof this.unhandled == 'function') {
          this.unhandled(info, sanitized, send);
        } else {
          Logger.warn(`unhandled method ${info.module}.${info.method}`, {
            plugin: this.pluginIdentifier,
          });
          send.success();
        }
        return true;
      } else {
        return false;
      }
    }

    if (typeof handler === 'boolean') {
      handler ? send.success() : send.deny();
      return true;
    }

    try {
      await handler(info, sanitized, send);
    } catch (err) {
      Logger.error(err, { plugin: this.pluginIdentifier });
      return false;
    }

    return true;
  }

  public get GameCodes() {
    return this.gameCodes;
  }

  public get Name() {
    return this.pluginName;
  }

  public get Identifier() {
    return this.pluginIdentifier;
  }

  public get Contributors() {
    return this.contributors;
  }
}
