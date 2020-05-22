import { EamuseRouteHandler } from './EamuseRouteContainer';
import { EamuseInfo } from '../middlewares/EamuseMiddleware';
import { EamuseSend } from './EamuseSend';
import { isNil } from 'lodash';
import { Logger } from '../utils/Logger';
import {
  FindCard,
  CreateProfile,
  CreateCard,
  BindProfile,
  GetProfileCount,
} from '../utils/EamuseIO';

async function cardToRef(gameCode: string, str: string, refMap: any): Promise<string> {
  const regex = /(^|\s*)([0|E][A-F|a-f|0-9]{15})($|\s+)/g;
  for (const match of str.matchAll(regex)) {
    const cid = match[2];

    if (refMap[cid]) break;

    const card = await FindCard(cid);
    if (!card) {
      const profileCount = await GetProfileCount();
      if (profileCount < 0 || profileCount >= 16) return null;
      const newProfile = await CreateProfile('unset', gameCode);
      if (!newProfile) return null;
      const newCard = await CreateCard(cid, newProfile.refid);
      if (!newCard) return null;
      refMap[cid] = newCard.refid;
    } else {
      refMap[cid] = card.refid;
      await BindProfile(card.refid, gameCode);
    }
  }
  return str.replace(regex, (_, start, card, end) => {
    return `${start}${refMap[card]}${end}`;
  });
}

async function removeCardID(gameCode: string, data: any, refMap: any = {}) {
  if (typeof data !== 'object') return undefined;

  if (Array.isArray(data)) {
    for (const element of data) {
      await removeCardID(gameCode, element, refMap);
    }
  } else {
    for (const prop in data) {
      if (prop == '@attr') {
        for (const attr in data[prop]) {
          const refid = await cardToRef(gameCode, data[prop][attr], refMap);
          if (!refid) return null;
          data['@attr'][attr] = refid;
        }
      } else if (prop == '@content') {
        const content = data['@content'];
        if (typeof content == 'string') {
          const refid = await cardToRef(gameCode, content, refMap);
          if (!refid) return null;
          data['@content'] = refid;
        }
      } else {
        await removeCardID(gameCode, data[prop], refMap);
      }
    }
  }
  return data;
}

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

  constructor(folderName: string) {
    this.pluginName = folderName.split('@')[0];
    this.pluginIdentifier = folderName;
    this.gameCodes = [];
    this.routes = {};
    this.unhandled = false;
    this.contributors = [];
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

  public RegisterUnhandled(handler?: EamuseRouteHandler) {
    if (handler) {
      this.unhandled = handler;
    } else {
      this.unhandled = true;
    }
  }

  public async run(
    moduleName: string,
    method: string,
    info: EamuseInfo,
    data: any,
    send: EamuseSend
  ): Promise<boolean> {
    let handler = this.routes[`${moduleName}.${method}`];

    const sanitized = await removeCardID(info.gameCode, data);
    if (!sanitized) {
      return false;
    }

    if (isNil(handler)) {
      if (this.unhandled) {
        if (typeof this.unhandled == 'function') {
          this.unhandled(info, sanitized, send);
        } else {
          Logger.warn(`unhandled method ${info.module}.${info.method}`, {
            plugin: this.pluginName,
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

    handler(info, sanitized, send);
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
