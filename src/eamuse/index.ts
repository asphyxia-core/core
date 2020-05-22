import { Router } from 'express';

import { EamuseMiddleware, EamuseRoute } from '../middlewares/EamuseMiddleware';
import { core } from './Core';
import { EamusePlugin } from './EamusePlugin';
import { EamuseRootRouter } from './EamuseRootRouter';
import { Logger } from '../utils/Logger';

export const ROOT_CONTAINER = new EamuseRootRouter();
let initialized = false;

export const services = (url: string, plugins: EamusePlugin[]) => {
  if (initialized) {
    Logger.warn(`Only one service can be handled one at a time.`);
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
            url: `http://127.0.0.1/keepalive?pa=127.0.0.1&ia=127.0.0.1&ga=127.0.0.1&ma=127.0.0.1&t1=2&t2=10`,
          },
        },
      ],
    };

    for (const moduleName of coreModules) {
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
