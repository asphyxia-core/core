import { EamuseRouteHandler } from './EamuseRouteContainer';
import { EamuseInfo } from '../middlewares/EamuseMiddleware';
import { EamuseSend } from './EamuseSend';
import { isNil } from 'lodash';
import { Logger } from '../utils/Logger';

export class EamusePlugin {
  private pluginName: string;
  private gameCodes: string[];
  private routes: {
    [method: string]: boolean | EamuseRouteHandler;
  };
  private unhandled: boolean | EamuseRouteHandler;
  private contributors: {
    name: string;
    link?: string;
  }[];

  constructor(pluginName: string) {
    this.pluginName = pluginName;
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

  public run(
    moduleName: string,
    method: string,
    info: EamuseInfo,
    data: any,
    send: EamuseSend
  ): boolean {
    let handler = this.routes[`${moduleName}.${method}`];

    if (isNil(handler)) {
      if (this.unhandled) {
        if (typeof this.unhandled == 'function') {
          this.unhandled(info, data, send);
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

    handler(info, data, send);
    return true;
  }

  public get GameCodes() {
    return this.gameCodes;
  }

  public get Name() {
    return this.pluginName;
  }

  public get Contributors() {
    return this.contributors;
  }
}
