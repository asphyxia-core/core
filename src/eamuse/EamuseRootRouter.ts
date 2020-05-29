import { EamuseRouteContainer, EamuseRouteHandler } from './EamuseRouteContainer';
import { EamusePlugin } from './EamusePlugin';
import { EamuseInfo } from '../middlewares/EamuseMiddleware';
import { EamuseSend } from './EamuseSend';
import { Logger } from '../utils/Logger';

export class EamuseRootRouter {
  private core: EamuseRouteContainer;
  private pluginMap: {
    [gameCode: string]: EamusePlugin;
  };
  private pluginMapID: {
    [name: string]: EamusePlugin;
  };
  private plugins: EamusePlugin[];

  constructor() {
    this.core = new EamuseRouteContainer();
    this.pluginMap = {};
    this.pluginMapID = {};
  }

  public add(method: string): void;
  public add(method: string, handler: EamuseRouteHandler | boolean): void;
  public add(method: EamuseRouteContainer): void;
  public add(method: string | EamuseRouteContainer, handler?: EamuseRouteHandler | boolean): void {
    this.core.add(method, handler);
  }

  public plugin(plugins: EamusePlugin[]) {
    this.plugins = plugins;
    for (const plugin of plugins) {
      for (const code of plugin.GameCodes) {
        if (this.pluginMap[code]) {
          Logger.warn(
            `can not register game code "${code}" which has already been registered by "${this.pluginMap[code].Identifier}"`,
            { plugin: plugin.Identifier }
          );
        } else {
          this.pluginMap[code] = plugin;
        }
      }
      this.pluginMapID[plugin.Identifier] = plugin;
    }
  }

  public async run(
    gameCode: string,
    moduleName: string,
    method: string,
    info: EamuseInfo,
    data: any,
    send: EamuseSend
  ) {
    if (await this.core.run(moduleName, method, info, data, send)) return;
    if (
      this.pluginMap[gameCode] &&
      (await this.pluginMap[gameCode].run(moduleName, method, info, data, send))
    )
      return;

    send.deny();
    return;
  }

  public getPluginByCode(gameCode: string) {
    return this.pluginMap[gameCode];
  }

  public getPluginByID(identifier: string) {
    return this.pluginMapID[identifier];
  }

  public get Plugins() {
    return this.plugins;
  }
}
