import { Logger } from '../Logger';
import { Migrator130 } from './130';
import { Migrator } from './Migrator';
import readline from 'readline';

const MIGRATORS: Migrator[] = [new Migrator130()];

export async function Migrate() {
  let startsFrom = -1;
  for (const migrator of MIGRATORS) {
    const prev = migrator.hasPrevious();
    if (prev) {
      startsFrom = MIGRATORS.indexOf(migrator);
      break;
    }
  }

  if (startsFrom < 0) {
    return;
  }

  const stream: string[] = [];
  for (let i = startsFrom; i < MIGRATORS.length; ++i) {
    const m = MIGRATORS[i];
    stream.push(m.previousVersion());
  }

  if (stream.length > 0) {
    stream.push(MIGRATORS[MIGRATORS.length - 1].thisVersion());
    Logger.warn('---Database Upgrade Migration---');
    Logger.warn('**WARNING**: Please backup your savefile before upgrading!');
    Logger.warn('Migration procedure: ');
    Logger.warn(` - ${stream.join(' -> ')}`);

    return new Promise<void>(resolve => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      rl.question('If you are ready to upgrade, enter YES: ', answer => {
        if (answer != 'YES') {
          Logger.error('Migration cancelled, quiting');
          process.exit(1);
        }

        for (let i = startsFrom; i < MIGRATORS.length; ++i) {
          const m = MIGRATORS[i];
          try {
            m.migrate();
          } catch (err) {
            Logger.error(`Migration failed (${m.previousVersion()} -> ${m.thisVersion()}): `);
            Logger.error(err);
            process.exit(1);
          }
        }
        rl.close();
        resolve();
      });
    });
  } else {
    return;
  }
}
