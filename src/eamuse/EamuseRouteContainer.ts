import { isNil } from 'lodash';

import { EamuseInfo } from '../middlewares/EamuseMiddleware';
import { EamuseSend } from './EamuseSend';

export type EamuseRouteHandler = (info: EamuseInfo, data: any, send: EamuseSend) => Promise<any>;

export class EamuseRouteContainer {
  private routes: {
    [key: string]: boolean | EamuseRouteHandler;
  };

  constructor() {
    this.routes = {};
  }

  public add(method: string): void;
  public add(method: string, handler: EamuseRouteHandler | boolean): void;
  public add(method: EamuseRouteContainer): void;
  public add(method: string | EamuseRouteContainer, handler?: EamuseRouteHandler | boolean): void;
  public add(method: string | EamuseRouteContainer, handler?: EamuseRouteHandler | boolean): void {
    if (typeof method === 'string') {
      if (handler) {
        this.routes[method] = handler;
      } else {
        this.routes[method] = false;
      }
    }

    if (method instanceof EamuseRouteContainer) {
      this.routes = { ...method.routes, ...this.routes };
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
    if (isNil(handler)) {
      return false;
    }

    if (typeof handler === 'boolean') {
      handler ? await send.success() : await send.deny();
      return true;
    }

    await handler(info, data, send);
    return true;
  }
}
