import { Router } from 'express';

import { EamuseMiddleware, EamuseRoute } from '../middlewares/EamuseMiddleware';
import { core } from './Core';
import { EamusePlugin } from './EamusePlugin';
import { EamuseRootRouter } from './EamuseRootRouter';
import { Logger } from '../utils/Logger';
import { CONFIG } from '../utils/ArgConfig';

export const ROOT_CONTAINER = new EamuseRootRouter();
let initialized = false;

const MODULE_HANDLERS: {
  [key: string]: (code: string) => Promise<string[] | string>;
} = {};

export function PluginRegisterModules(
  plugin: string,
  moduleHandler: (code: string) => Promise<string[] | string>
) {
  MODULE_HANDLERS[plugin] = moduleHandler;
}

export const services = (port: number, plugins: EamusePlugin[]) => {
  if (initialized) {
    Logger.warn(`Only one service can be handled.`);
    return;
  }
  const routeEamuse = Router();

  const coreModules = [
    'cardmng',
    'facility',
    'message',
    'numbering',
    'package',
    'pcbevent',
    'pcbtracker',
    'pkglist',
    'posevent',
    'userdata',
    'userid',
    'eacoin',
    'local',
    'local2',
    'lobby',
    'lobby2',
    'dlstatus',
    'netlog',
    'sidmgr',
    'globby',
  ];

  /* General Information */
  routeEamuse.use(EamuseMiddleware).all('*', EamuseRoute(ROOT_CONTAINER));

  /* - Service */
  ROOT_CONTAINER.add('services.get', async (info, data, send) => {
    const ping_ip = CONFIG.ping_ip;

    const plugin = plugins.find(value => value.GameCodes.indexOf(info.gameCode) >= 0);

    let extraModules: string[] = [];
    if (plugin) {
      const modules = await MODULE_HANDLERS[plugin.Identifier](info.model);
      if (typeof modules === 'string') {
        extraModules = [modules];
      } else {
        extraModules = modules;
      }
    }

    const services = {
      '@attr': {
        expire: 10800,
        method: 'get',
        mode: 'operation',
      },
      'item': [
        {
          '@attr': {
            name: 'ntp',
            url: 'ntp://pool.ntp.org/',
          },
        },
        {
          '@attr': {
            name: 'keepalive',
            url: `http://${ping_ip}/core/keepalive?pa=${ping_ip}&ia=${ping_ip}&ga=${ping_ip}&ma=${ping_ip}&t1=2&t2=10`,
          },
        },
      ],
    };

    const url =
      port == 80 ? `http://${(info as any).host}` : `http://${(info as any).host}:${port}`;

    for (const moduleName of coreModules) {
      services.item.push({ '@attr': { name: moduleName, url } });
    }

    for (const moduleName of extraModules) {
      services.item.push({ '@attr': { name: moduleName, url } });
    }

    send.object(services);
    return;
  });

  /* Core */
  ROOT_CONTAINER.add(core);
  ROOT_CONTAINER.plugin(plugins);

  return routeEamuse;
};
