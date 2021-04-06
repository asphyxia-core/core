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
import { ASSETS_PATH, LoadCoreDB } from './utils/EamuseIO';
import open from 'open';
import { Migrate } from './utils/migration';

function isIPv6(ip: string) {
  return !!/(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))/.test(
    ip
  );
}

function cleanIP(ip: string) {
  if (ip.startsWith('[') && ip.endsWith(']')) {
    return ip.substr(1, ip.length - 2);
  }
  return ip;
}

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
  Logger.info(chalk.cyanBright(pad(`CORE ${VERSION}`, 60)));
  Logger.info(pad(`Brought you by Team Asphyxia`, 60));
  Logger.info(` `);
  Logger.info(chalk.redBright(pad(`FREE SOFTWARE. BEWARE OF SCAMMERS.`, 60)));
  Logger.info(pad(`If you bought this software, request refund immediately.`, 60));
  Logger.info(` `);

  const EAMUSE = express();

  EAMUSE.disable('etag');
  EAMUSE.disable('x-powered-by');

  if (ARGS.dev) {
    Logger.info(` [Developer Mode] Console Output Enabled`);
    Logger.info(``);
  }

  ReadConfig();
  const external = LoadExternalPlugins();
  SaveConfig();

  process.title = `Asphyxia CORE ${VERSION} | Plugins: ${external.length}`;
  if (external.length <= 0) {
    Logger.warn(chalk.yellowBright('no plugins are installed.'));
    Logger.info('');
  }

  // ========== EAMUSE ============
  EAMUSE.set('views', path.join(ASSETS_PATH, 'views'));
  EAMUSE.set('view engine', 'pug');
  EAMUSE.use('*', services(CONFIG.port, external));
  EAMUSE.use('/static', express.static(path.join(ASSETS_PATH, 'static')));
  EAMUSE.use(webui);

  // ========== LISTEN ============
  const server = EAMUSE.listen(CONFIG.port, CONFIG.bind, () => {
    const cleaned = cleanIP(CONFIG.bind);
    const isV6 = isIPv6(cleaned);
    const printAddr = isV6 ? `[${cleaned}]` : cleaned;
    const removeNIC = cleaned.split('%')[0];
    const openAddr =
      cleaned == '0.0.0.0' || cleaned == '::' || cleaned == '0:0:0:0:0:0:0:0'
        ? 'localhost'
        : isV6
        ? `[${removeNIC}]`
        : removeNIC;

    Logger.info(``);
    const serverInfo = `${printAddr} at ${CONFIG.port}`;
    const httpInfo = `http://${openAddr}:${CONFIG.port}`;
    Logger.info(`   +=============== Server Started ===============+`);
    Logger.info(`   | - Listening - - - - - - - - - - - - - - - - -|`);
    Logger.info(`   |${pad(serverInfo, 46)}|`);
    Logger.info(`   | - WebUI - - - - - - - - - - - - - - - - - - -|`);
    Logger.info(`   |${pad(httpInfo, 46)}|`);
    Logger.info(`   +==============================================+`);
    Logger.info('');

    if (CONFIG.webui_on_startup) {
      try {
        open(`http://${openAddr}:${CONFIG.port}`);
      } catch {}
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

Migrate().then(() => {
  LoadCoreDB().then(Main);
});
