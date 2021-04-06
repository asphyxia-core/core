import { Migrator } from './Migrator';
import fs from 'fs';
import path from 'path';
import { ARGS } from '../ArgConfig';
import { PrepareDirectory } from '../EamuseIO';
import { Logger } from '../Logger';

const EXEC_PATH = path.resolve((process as any).pkg ? path.dirname(process.argv0) : process.cwd());
const OLD_SAVE_PATH = path.join(EXEC_PATH, 'savedata.db');
const NEW_SAVE_PATH = path.resolve(EXEC_PATH, ARGS.savedata);

export class Migrator130 implements Migrator {
  public thisVersion() {
    return 'v1.30';
  }
  public previousVersion() {
    return 'v1.20';
  }

  public hasPrevious() {
    try {
      const stat = fs.statSync(OLD_SAVE_PATH);
      if (stat.isFile()) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  public migrate() {
    PrepareDirectory(NEW_SAVE_PATH);

    const fileData = fs.readFileSync(OLD_SAVE_PATH, { encoding: 'utf-8' });
    const lines = fileData.split('\n');

    for (const line of lines) {
      if (line.trim()) {
        try {
          const obj = JSON.parse(line);
          if (obj.$$indexCreated) {
            continue;
          }
          if (obj.__a) {
            fs.appendFileSync(
              path.join(NEW_SAVE_PATH, `${obj.__a}.db`),
              `${JSON.stringify(obj)}\n`
            );
          } else {
            fs.appendFileSync(path.join(NEW_SAVE_PATH, 'core.db'), `${JSON.stringify(obj)}\n`);
          }
        } catch (err) {
          Logger.warn(`Corrupted data: ${line}`);
        }
      }
    }

    fs.renameSync(OLD_SAVE_PATH, `${OLD_SAVE_PATH}.bak`);

    return true;
  }
}
