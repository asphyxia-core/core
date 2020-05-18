import { EamuseRouteContainer, EamuseRouteHandler } from './EamuseRouteContainer';
import { EamusePlugin } from './EamusePlugin';
import { Logger } from '../utils/Logger';
import { EamuseInfo } from '../middlewares/EamuseMiddleware';
import { EamuseSend } from './EamuseSend';

export class EamuseRootRouter {
  private core: EamuseRouteContainer;
  private pluginMap: {
    [gameCode: string]: EamusePlugin;
  };
  private pluginMapName: {
    [name: string]: EamusePlugin;
  };
  private plugins: EamusePlugin[];

  constructor() {
    this.core = new EamuseRouteContainer();
    this.pluginMap = {};
    this.pluginMapName = {};
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
            `register failed - '${code}' is already registered by ${this.pluginMap[code].Name}`,
            { plugin: plugin.Name }
          );
        } else {
          this.pluginMap[code] = plugin;
        }
      }
      this.pluginMapName[plugin.Name] = plugin;
    }
  }

  public run(
    gameCode: string,
    moduleName: string,
    method: string,
    info: EamuseInfo,
    data: any,
    send: EamuseSend
  ): boolean {
    if (this.core.run(moduleName, method, info, data, send)) return;
    if (
      this.pluginMap[gameCode] &&
      this.pluginMap[gameCode].run(moduleName, method, info, data, send)
    )
      return;

    send.deny();
    return;
  }

  public getPluginByCode(gameCode: string) {
    return this.pluginMap[gameCode];
  }

  public getPluginByName(gameCode: string) {
    return this.pluginMapName[gameCode];
  }

  public get Plugins() {
    return this.plugins;
  }
}
