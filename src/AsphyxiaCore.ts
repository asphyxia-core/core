import { Logger } from './utils/Logger';
import { ARGS } from './utils/ArgParser';
import { services } from './eamuse/Services';
import { VERSION } from './utils/Consts';
import { pad } from 'lodash';
import express from 'express';
import chalk from 'chalk';
import { LoadExternalModules } from './eamuse/ExternalModuleLoader';
// import { CreateTray } from './utils/Systray';

process.title = `Asphyxia CORE ${VERSION}`;
// CreateTray();

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
const external = LoadExternalModules();
process.title = `Asphyxia CORE ${VERSION} | Modules: ${external.modules.length}`;
if (external.modules.length <= 0) {
  Logger.warn(chalk.yellowBright('no modules are installed.'));
  Logger.info('');
}

// ========== EAMUSE ============
EAMUSE.use('*', services(`http://${ARGS.bind}:${ARGS.port}`, external.router));

// // ========== WEB_UI ============
// WEBUI.get('/', async (req, res) => {
//   res.send('hi');
// });

// ========== LISTEN ============
const server = EAMUSE.listen(ARGS.port, ARGS.bind, () => {
  Logger.info(`  [core] Server started:`);
  const serverInfo = `http://${ARGS.bind}:${ARGS.port}`;
  Logger.info(`       +==================== EA ==================+`);
  Logger.info(`       |${pad(serverInfo, 42)}|`);
  Logger.info(`       +==========================================+`);
  Logger.info('');

  // const uiServer = WEBUI.listen(ARGS.ui_port, ARGS.ui_bind, () => {
  //   Logger.info(`  [core] Server started:`);
  //   const serverInfo = `http://${ARGS.bind}:${ARGS.port}`;
  //   Logger.info(`       +==================== EA ==================+`);
  //   Logger.info(`       |${pad(serverInfo, 42)}|`);
  //   Logger.info(`       +==========================================+`);
  //   Logger.info('');
  //   const webuiInfo = `http://${ARGS.ui_bind}:${ARGS.ui_port}`;
  //   Logger.info(`       +================== WEB_UI ================+`);
  //   Logger.info(`       |${pad(webuiInfo, 42)}|`);
  //   Logger.info(`       +==========================================+`);
  // });

  // uiServer.on('error', (err: any) => {
  //   if (err && err.code == 'EADDRINUSE') {
  //     Logger.info('WebUI failed to start: port might be in use.');
  //     Logger.info('Use -uip argument to change port.');
  //   }
  //   Logger.info(' ');
  //   Logger.error(`     ${err.message}`);
  //   Logger.info(' ');
  //   Logger.info('Press any key to exit.');
  //   process.stdin.resume();
  //   process.stdin.on('data', process.exit.bind(process, 0));
  // });
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
