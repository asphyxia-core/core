import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

import { Logger } from './Logger';
import path from 'path';
import nedb from 'nedb';
import { nfc2card } from './CardCipher';
import { compress, decompress } from './SMAZ';
import hashids from 'hashids/cjs';
import { NAMES } from './Consts';
import { CONFIG } from './ArgConfig';

const pkg: boolean = (process as any).pkg;
export const EXEC_PATH = pkg ? path.dirname(process.argv0) : process.cwd();
export const PLUGIN_PATH = path.join(EXEC_PATH, 'plugins');
export const SAVE_PATH = path.join(EXEC_PATH, 'savedata.db');
export const ASSETS_PATH = path.join(pkg ? __dirname : `../build-env`, 'assets');
export const CONFIG_PATH = path.join(EXEC_PATH, 'config.ini');

const DB = new nedb({
  filename: SAVE_PATH,
  timestampData: true,
  afterSerialization: compress,
  beforeDeserialization: decompress,
});

DB.loadDatabase(err => {
  if (err) {
    Logger.error(err);
    process.exit(1);
  }

  GetProfileCount().then(value => {
    if (value < 0) {
      Logger.error('Profile indexes is corrupted. Can not start NeDB.');
      process.exit(1);
    }

    if (value > 16) {
      Logger.error('Profile table is corrupted. Can not start NeDB.');
      process.exit(1);
    }

    DB.ensureIndex({ fieldName: '__reserved_field' }, function (err) {
      if (err) {
        Logger.error(err);
      }
    });

    DB.ensureIndex({ fieldName: 'cid' }, function (err) {
      if (err) {
        Logger.error(err);
      }
    });

    DB.ensureIndex({ fieldName: '__refid' }, function (err) {
      if (err) {
        Logger.error(err);
      }
    });
  });
});

const ID_GEN = new hashids('AsphyxiaCORE', 15, '0123456789ABCDEF');

export function GetCallerPlugin(): { name: string; identifier: string } {
  const oldPrepareStackTrace = Error.prepareStackTrace;
  Error.prepareStackTrace = (_, stack) => stack;
  const stack = new Error().stack as any;
  Error.prepareStackTrace = oldPrepareStackTrace;
  if (stack !== null && typeof stack === 'object') {
    let inPlugin = false;
    let entryFile = null;
    for (const file of stack) {
      const filename: string = file.getFileName();
      if (filename.startsWith(PLUGIN_PATH)) {
        entryFile = path.relative(PLUGIN_PATH, filename);
        inPlugin = true;
      } else {
        if (inPlugin) {
          break;
        }
      }
    }

    if (entryFile !== null) {
      const plugin = entryFile.split(path.sep)[0];
      return { name: plugin.split('@')[0], identifier: plugin };
    } else {
      return null;
    }
  }
  return null;
}

export function PrepareDirectory(dir: string = ''): string {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  return dir;
}

export function WriteFile(file: string, data: string) {
  const plugin = GetCallerPlugin();
  if (!plugin) return;

  let target = file;
  if (!path.isAbsolute(file)) {
    target = path.resolve(PLUGIN_PATH, plugin.identifier, file);
  }

  try {
    PrepareDirectory(path.dirname(target));
    writeFileSync(target, data);
  } catch (err) {
    Logger.error(`file writing failed: ${err}`, { plugin: plugin.identifier });
  }
}

export function ReadAssets(file: string): any {
  let fullFile = path.join(ASSETS_PATH, `${file}`);

  try {
    if (!existsSync(fullFile)) {
      return null;
    }
    const data = readFileSync(fullFile, {
      encoding: 'utf-8',
    });
    return data;
  } catch (err) {
    return null;
  }
}

// =========================================
//                DB Wrapper
// =========================================

export async function GetUniqueInt() {
  return new Promise<number>(resolve => {
    DB.findOne(
      {
        __reserved_field: 'counter',
      },
      (err, doc) => {
        if (err) return resolve(-1);
        const result = doc ? doc.value : 0;
        DB.update(
          {
            __reserved_field: 'counter',
          },
          { $inc: { value: 1 } },
          { upsert: true },
          err => {
            if (err) resolve(-1);
            else resolve(result);
          }
        );
      }
    );
  });
}

export async function Count(doc: any) {
  return new Promise<number>(resolve => {
    DB.count(doc, (err, n) => {
      if (err) resolve(-1);
      else resolve(n);
    });
  });
}

export async function GetProfileCount() {
  return new Promise<number>(resolve => {
    DB.count(
      {
        __reserved_field: 'profile',
      },
      (err, n) => {
        if (err) resolve(-1);
        else resolve(n);
      }
    );
  });
}

export async function FindCard(cid: string) {
  return new Promise<any>(resolve => {
    DB.findOne(
      {
        __reserved_field: 'card',
        cid,
      },
      (err, res) => {
        if (err) resolve(false);
        else resolve(res);
      }
    );
  });
}

export async function FindCardsByRefid(refid: string) {
  return new Promise<any>(resolve => {
    DB.find(
      {
        __reserved_field: 'card',
        __refid: refid,
      },
      {}
    )
      .sort({ createdAt: 1 })
      .exec((err, res) => {
        if (err) resolve(false);
        else resolve(res);
      });
  });
}

export async function CreateCard(cid: string, refid: string, forceprint?: string) {
  let print = '<Invalid Card>';

  if (forceprint) {
    print = forceprint;
  } else {
    try {
      print = nfc2card(cid);
    } catch (err) {
      print = '<Invalid Card>';
    }
  }

  return new Promise<any>(resolve => {
    DB.insert({ __reserved_field: 'card', __refid: refid, print, cid }, (err, doc) => {
      if (err) resolve(false);
      else resolve(doc);
    });
  });
}

export async function DeleteCard(cid: string) {
  return new Promise<boolean>(resolve => {
    DB.remove({ __reserved_field: 'card', cid }, { multi: true }, err => {
      if (err) resolve(false);
      else resolve(true);
    });
  });
}

export async function FindProfile(refid: string) {
  return new Promise<any>(resolve => {
    DB.findOne(
      {
        __reserved_field: 'profile',
        __refid: refid,
      },
      (err, res) => {
        if (err) resolve(false);
        else resolve(res);
      }
    );
  });
}

export async function CreateProfile(pin: string, gameCode: string) {
  if (!CONFIG.allow_register) return false;

  const count = await GetUniqueInt();
  if (count < 0) return false;

  const refid = 'A' + ID_GEN.encode(count * 16 + Math.floor(Math.random() * 16));

  const name = NAMES[Math.floor(Math.random() * NAMES.length)];
  return new Promise<any>(resolve => {
    DB.insert(
      {
        __reserved_field: 'profile',
        __refid: refid,
        pin,
        name,
        models: [gameCode],
      },
      (err, doc) => {
        if (err) resolve(false);
        else resolve(doc);
      }
    );
  });
}

export async function UpdateProfile(refid: string, update: any, upsert: boolean = false) {
  return new Promise<boolean>(resolve => {
    DB.update(
      {
        __reserved_field: 'profile',
        __refid: refid,
      },
      {
        $set: update,
      },
      { upsert },
      err => {
        if (err) resolve(false);
        else resolve(true);
      }
    );
  });
}

export async function PurgeProfile(refid: string) {
  return new Promise<boolean>(resolve => {
    DB.remove({ __refid: refid }, { multi: true }, err => {
      if (err) resolve(false);
      else resolve(true);
    });
  });
}

export async function BindProfile(refid: string, gameCode: string) {
  return new Promise<any>(resolve => {
    DB.update(
      {
        __reserved_field: 'profile',
        __refid: refid,
      },
      { $addToSet: { models: gameCode } },
      {},
      (err, doc) => {
        if (err) resolve(false);
        else resolve(doc);
      }
    );
  });
}

export async function GetProfiles() {
  return new Promise<any>(resolve => {
    DB.find(
      {
        __reserved_field: 'profile',
      },
      {}
    )
      .sort({ createdAt: 1 })
      .exec((err, doc) => {
        if (err) resolve(false);
        else resolve(doc);
      });
  });
}
