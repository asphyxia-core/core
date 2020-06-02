import winston from 'winston';
import chalk from 'chalk';

const isDebug = (process as any).pkg == null;

export const Logger = winston.createLogger({
  level: isDebug ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.printf(info => {
      let stack = '';
      if (info.stack) {
        stack += `\n${info.stack}`;
      } else if ((info.message as any).stack) {
        stack += `\n${(info.message as any).stack}`;
      }

      const plugin =
        info.plugin == 'core' ? chalk.cyanBright('core') : chalk.yellowBright(info.plugin);
      if (info.level.indexOf('info') < 0) {
        return `  [${plugin}] ${info.level}: ${info.message}` + stack;
      } else {
        if (info.plugin == 'core') {
          return `${info.message}`;
        }
        return `  [${plugin}] ${info.message}` + stack;
      }
    })
  ),
  defaultMeta: { plugin: 'core' },
  transports: [
    new winston.transports.Console({
      stderrLevels: ['error'],
      debugStdout: true,
    }),
  ],
});
