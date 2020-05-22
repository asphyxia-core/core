if ((process as any).pkg) process.env.NODE_ENV = 'production';

import { Logger } from './utils/Logger';
import { ARGS, CONFIG, ReadConfig, SaveConfig } from './utils/ArgConfig';
import { services } from './eamuse';
import { VERSION } from './utils/Consts';
import { pad } from 'lodash';
import express from 'express';
import chalk from 'chalk';
import { LoadExternalPlugins } from './eamuse/ExternalPluginLoader';
import { webui } from './webui/index';
import path from 'path';
import { ASSETS_PATH } from './utils/EamuseIO';
import open from 'open';

function Main() {
  process.title = `Asphyxia CORE ${VERSION}`;

  Logger.info('                        _                _        ');
  Logger.info('        /\\             | |              (_)      ');
  Logger.info('       /  \\   ___ _ __ | |__  _   ___  ___  __ _ ');
  Logger.info("      / /\\ \\ / __| '_ \\| '_ \\| | | \\ \\/ / |/ _` |");
  Logger.info('     / ____ \\\\__ \\ |_) | | | | |_| |>  <| | (_| |');
  Logger.info('    /_/    \\_\\___/ .__/|_| |_|\\__, /_/\\_\\_|\\__,_|');
  Logger.info('                 | |           __/ |     __   __   __   ___ ');
  Logger.info('                 |_|          |___/     /  ` /  \\ |__) |__  ');
  Logger.info('                                        \\__, \\__/ |  \\ |___ ');
  Logger.info('');
  Logger.info(chalk.cyanBright(pad(`Asphyxia ${VERSION}`, 60)));
  Logger.info(pad(`Brought you by TsFreddie`, 60));
  Logger.info(` `);
  Logger.info(chalk.redBright(pad(`FREE SOFTWARE. BEWARE OF SCAMMERS.`, 60)));
  Logger.info(pad(`If you bought this software, request refund immediately.`, 60));
  Logger.info(` `);

  const EAMUSE = express();
  // const WEBUI = express();

  EAMUSE.disable('etag');
  EAMUSE.disable('x-powered-by');

  if (ARGS.dev) {
    Logger.info(` [Console Output Enabled]`);
  }
  const external = LoadExternalPlugins();
  process.title = `Asphyxia CORE ${VERSION} | Plugins: ${external.length}`;
  if (external.length <= 0) {
    Logger.warn(chalk.yellowBright('no plugins are installed.'));
    Logger.info('');
  }

  // ========== READCONFIG ===========
  ReadConfig();
  SaveConfig();

  // ========== EAMUSE ============
  EAMUSE.set('views', path.join(ASSETS_PATH, 'views'));
  EAMUSE.set('view engine', 'pug');
  EAMUSE.use('*', services(`http://${CONFIG.bind}:${CONFIG.port}`, external));
  EAMUSE.use('/static', express.static(path.join(ASSETS_PATH, 'static')));
  EAMUSE.use(webui);

  // ========== LISTEN ============
  const server = EAMUSE.listen(CONFIG.port, CONFIG.bind, () => {
    Logger.info(`  [core] Server started:`);
    const serverInfo = `http://${CONFIG.bind}:${CONFIG.port}`;
    Logger.info(`       +============= Service & WebUI ============+`);
    Logger.info(`       |${pad(serverInfo, 42)}|`);
    Logger.info(`       +==========================================+`);
    Logger.info('');

    if (CONFIG.webui_on_startup) {
      open(`http://${CONFIG.bind}:${CONFIG.port}`);
    }
  });

  server.on('error', (err: any) => {
    if (err && err.code == 'EADDRINUSE') {
      Logger.info('Server failed to start: port might be in use.');
      Logger.info('Use -p argument to change port.');
    }
    Logger.info(' ');
    Logger.error(`     ${err.message}`);
    Logger.info(' ');
    Logger.info('Press any key to exit.');
    process.stdin.resume();
    process.stdin.on('data', process.exit.bind(process, 0));
  });
}

Main();
