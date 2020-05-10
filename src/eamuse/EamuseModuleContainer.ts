import { isNil } from 'lodash';

import { EamuseInfo } from '../middlewares/EamuseMiddleware';
import { GetCallerModule } from '../utils/EamuseIO';
import { Logger } from '../utils/Logger';
import { EamuseSend } from './EamuseSend';

export type EamuseModuleRoute = (info: EamuseInfo, data: any, send: EamuseSend) => Promise<any>;

export class EamuseModuleContainer {
  private modules: {
    [key: string]: boolean | EamuseModuleRoute;
  };

  private fallback: {
    [key: string]: EamuseModuleRoute;
  };

  constructor() {
    this.modules = {};
    this.fallback = {};
  }

  public add(gameCode: string, method: string): void;
  public add(gameCode: string, method: string, handler: EamuseModuleRoute | boolean): void;
  public add(gameCode: EamuseModuleContainer): void;
  public add(
    gameCode: string | EamuseModuleContainer,
    method?: string,
    handler?: EamuseModuleRoute | boolean
  ): void {
    if (typeof gameCode === 'string' && method !== null && typeof method === 'string') {
      let key = `${gameCode}:${method}`;
      if (gameCode === '*') {
        key = `${method}`;
      }
      if (handler) {
        this.modules[key] = handler;
      } else {
        this.modules[key] = false;
      }
    }

    if (gameCode instanceof EamuseModuleContainer) {
      this.modules = { ...this.modules, ...gameCode.modules };
      this.fallback = { ...this.fallback, ...gameCode.fallback };
    }
  }

  public unhandled(gameCode: string, handler?: EamuseModuleRoute) {
    const mod = GetCallerModule();
    if (typeof handler === 'function') {
      this.fallback[gameCode] = handler;
    } else {
      this.fallback[gameCode] = async (info, data, send) => {
        Logger.warn(`unhandled method ${info.module}.${info.method}`, { module: mod.name });
        send.deny();
      };
    }
  }

  public async run(
    gameCode: string,
    moduleName: string,
    method: string,
    info: EamuseInfo,
    data: any,
    send: EamuseSend
  ): Promise<void> {
    let handler = this.modules[`${moduleName}.${method}`];
    if (isNil(handler)) handler = this.modules[`${gameCode}:${moduleName}.${method}`];
    if (isNil(handler)) {
      if (this.fallback[gameCode]) {
        return this.fallback[gameCode](info, data, send);
      } else {
        return send.deny();
      }
    }

    if (typeof handler === 'boolean') {
      if (handler) {
        return send.success();
      } else {
        return send.deny();
      }
    }

    handler(info, data, send);
    return;
  }
}
