import { existsSync, mkdirSync, readFileSync, writeFile, readFile, readdir, unlink } from 'fs';

import { Logger } from './Logger';
import path from 'path';
import nedb from 'nedb';
import { nfc2card } from './CardCipher';
import hashids from 'hashids/cjs';
import { NAMES } from './Consts';
import { CONFIG, ARGS } from './ArgConfig';
import { isArray, get, groupBy, isPlainObject } from 'lodash';
import { sizeof } from 'sizeof';
import { PluginDetect } from '../eamuse/ExternalPluginLoader';
import { ROOT_CONTAINER } from '../eamuse';

const pkg: boolean = (process as any).pkg;
const EXEC_PATH = path.resolve(pkg ? path.dirname(process.argv0) : process.cwd());

export const PLUGIN_PATH = path.join(EXEC_PATH, 'plugins');
export const ASSETS_PATH = path.join(pkg ? __dirname : `../build-env`, 'assets');

const SAVE_PATH = path.join(EXEC_PATH, 'savedata.db');

const DB = new nedb({
  filename: SAVE_PATH,
  timestampData: true,
  corruptAlertThreshold: ARGS.fixdb ? 0.2 : 0,
});

DB.loadDatabase(err => {
  if (err) {
    if (err.message && err.message.startsWith('More than')) {
      if (ARGS.fixdb) {
        Logger.error(
          'Savedata is more than 20% corrupted. Which means the savedata might be beyond repair.'
        );
      } else {
        Logger.error(
          'Savedata corruption detected. Run with "--force-load-db" argument to force load data, and corrupted portion will be discarded. It is recommended to backup savedata.db before force loading.'
        );
      }
    } else {
      Logger.error(err);
    }

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

    DB.ensureIndex({ fieldName: '__s' }, function (err) {
      if (err) {
        Logger.error(err);
      }
    });

    DB.ensureIndex({ fieldName: '__a' }, function (err) {
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

export function PrepareDirectory(dir: string = ''): string {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  return dir;
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
//                Public IO
// =========================================
export function Resolve(plugin: PluginDetect, file: string) {
  return path.resolve(PLUGIN_PATH, plugin.name, file);
}

export async function ReadDir(plugin: PluginDetect, file: string) {
  const target = path.resolve(PLUGIN_PATH, plugin.name, file);

  return new Promise<{ name: string; type: 'file' | 'dir' | 'unsupported' }[]>(resolve => {
    readdir(target, { encoding: 'utf8', withFileTypes: true }, (err, files) => {
      if (err) {
        Logger.error(`file writing failed: ${err}`, { plugin });
        return resolve([]);
      }
      resolve(
        files.map(file => ({
          name: file.name,
          type: file.isFile() ? 'file' : file.isDirectory() ? 'dir' : 'unsupported',
        }))
      );
    });
  });
}

export function Exists(plugin: PluginDetect, file: string) {
  const target = path.resolve(PLUGIN_PATH, plugin.name, file);
  return existsSync(target);
}

export async function WriteFile(
  plugin: PluginDetect,
  file: string,
  data: string | Buffer,
  options: { encoding?: string | null; mode?: number | string; flag?: string } | string | null
) {
  const target = path.resolve(PLUGIN_PATH, plugin.name, file);

  PrepareDirectory(path.dirname(target));

  return new Promise<void>(resolve => {
    if (options == null) {
      writeFile(target, data, err => {
        if (err) {
          Logger.error(`file writing failed: ${err}`, { plugin });
        }
        resolve();
      });
    } else {
      writeFile(target, data, options, err => {
        if (err) {
          Logger.error(`file writing failed: ${err}`, { plugin: plugin });
        }
        resolve();
      });
    }
  });
}

export async function DeleteFile(plugin: PluginDetect, file: string) {
  const target = path.resolve(PLUGIN_PATH, plugin.name, file);

  return new Promise<void>(resolve => {
    unlink(target, err => {
      if (err) {
        Logger.error(`file writing failed: ${err}`, { plugin });
      }
      resolve();
    });
  });
}

export async function ReadFile(
  plugin: PluginDetect,
  file: string,
  options: { encoding?: string | null; flag?: string } | string | undefined | null
) {
  const target = path.resolve(PLUGIN_PATH, plugin.name, file);

  return new Promise<string | Buffer>(resolve => {
    if (options == null) {
      readFile(target, (err, data) => {
        if (err) {
          Logger.error(`file reading failed: ${err}`, { plugin: plugin });
          return resolve(null);
        }
        return resolve(data);
      });
    } else {
      readFile(target, options, (err, data) => {
        if (err) {
          Logger.error(`file reading failed: ${err}`, { plugin: plugin });
          return resolve(null);
        }
        return resolve(data);
      });
    }
  });
}

// =========================================
//                DB Wrapper
// =========================================

export async function GetUniqueInt() {
  return new Promise<number>(resolve => {
    DB.findOne(
      {
        __s: 'counter',
      },
      (err, doc) => {
        if (err) return resolve(-1);
        const result = doc ? doc.value : 0;
        DB.update(
          {
            __s: 'counter',
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

export async function PluginStats() {
  return new Promise<
    {
      name: string;
      id: string;
      dataSize: string;
    }[]
  >(resolve => {
    DB.find({
      __s: { $in: ['plugins', 'plugins_profile'] },
    }).exec((err, res) => {
      if (err) {
        resolve([]);
        return;
      }

      const group = groupBy(res, '__a');
      const stats = [];
      for (const plugin of Object.keys(group).sort()) {
        stats.push({
          name: plugin.split('@')[0].toUpperCase(),
          id: plugin,
          dataSize: sizeof(group[plugin], true),
        });
      }

      for (const installed of ROOT_CONTAINER.Plugins.map(e => e.Identifier)) {
        if (!group[installed]) {
          stats.push({
            name: installed.split('@')[0].toUpperCase(),
            id: installed,
            dataSize: '0B',
          });
        }
      }
      resolve(stats);
    });
  });
}

export async function PurgePlugin(affiliation: string) {
  return new Promise<boolean>(resolve => {
    DB.remove(
      {
        __a: affiliation,
      },
      { multi: true },
      (err, res) => {
        if (err) resolve(false);
        else resolve(true);
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
        __s: 'profile',
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
        __s: 'card',
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
        __s: 'card',
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

export async function CreateCard(cid: string, refid: string, forcePrint?: string) {
  let print = '<Invalid Card>';

  if (forcePrint) {
    print = forcePrint;
  } else {
    try {
      print = nfc2card(cid);
    } catch (err) {
      print = '<Invalid Card>';
    }
  }

  return new Promise<any>(resolve => {
    DB.insert({ __s: 'card', __refid: refid, print, cid }, (err, doc) => {
      if (err) resolve(false);
      else resolve(doc);
    });
  });
}

export async function DeleteCard(cid: string) {
  return new Promise<boolean>(resolve => {
    DB.remove({ __s: 'card', cid }, { multi: true }, err => {
      if (err) resolve(false);
      else resolve(true);
    });
  });
}

export async function FindProfile(refid: string) {
  return new Promise<any>(resolve => {
    DB.findOne(
      {
        __s: 'profile',
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
        __s: 'profile',
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
        __s: 'profile',
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
        __s: 'profile',
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
        __s: 'profile',
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

// Public API
function CheckQuery(query: any): any {
  const sanitized: any = {};
  if (isPlainObject(query)) {
    for (const key in query) {
      if (key == '__refid') continue; // ignore __refid
      if (key.startsWith('__')) throw new Error('query or doc field can not starts with "__"');

      sanitized[key] = CheckQuery(query[key]);
    }
    return sanitized;
  } else {
    return query;
  }
}

function CleanDoc(doc: any) {
  for (const prop in doc) {
    if (prop.startsWith('__') && prop != '__refid') {
      delete doc[prop];
    }
  }
  return doc;
}

export async function APIFindOne(plugin: PluginDetect, arg1: string | any, arg2?: any) {
  let query: any = null;

  if (typeof arg1 == 'string' && typeof arg2 == 'object') {
    arg2 = CheckQuery(arg2);
    query = {
      ...arg2,
      __s: 'plugins_profile',
      __a: plugin.name,
      __refid: arg1,
    };
  } else if (arg1 == null && typeof arg2 == 'object') {
    arg2 = CheckQuery(arg2);
    query = {
      ...arg2,
      __s: 'plugins_profile',
      __a: plugin.name,
    };
  } else if (typeof arg1 == 'object') {
    arg1 = CheckQuery(arg1);
    query = {
      ...arg1,
      __s: 'plugins',
      __a: plugin.name,
    };
  } else {
    throw new Error('invalid FindOne query');
  }

  return new Promise<any>((resolve, reject) => {
    DB.findOne(
      query,
      plugin.core
        ? {}
        : {
            __s: 0,
            __a: 0,
            __collection: 0,
          },
      (err, doc) => {
        if (err) reject(err);
        else resolve(doc);
      }
    );
  });
}

export async function APIFind(plugin: PluginDetect, arg1: string | any, arg2?: any) {
  let query: any = null;
  if (typeof arg1 == 'string' && typeof arg2 == 'object') {
    arg2 = CheckQuery(arg2);
    query = {
      ...arg2,
      __s: 'plugins_profile',
      __a: plugin.name,
      __refid: arg1,
    };
  } else if (arg1 == null && typeof arg2 == 'object') {
    arg2 = CheckQuery(arg2);
    query = {
      ...arg2,
      __s: 'plugins_profile',
      __a: plugin.name,
    };
  } else if (typeof arg1 == 'object') {
    arg1 = CheckQuery(arg1);
    query = {
      ...arg1,
      __s: 'plugins',
      __a: plugin.name,
    };
  } else {
    throw new Error('invalid Find query');
  }

  return new Promise<any>((resolve, reject) => {
    DB.find(
      query,
      plugin.core
        ? {}
        : {
            __s: 0,
            __a: 0,
            __collection: 0,
          }
    )
      .sort({ createdAt: 1 })
      .exec((err, doc) => {
        if (err) reject(err);
        else resolve(doc);
      });
  });
}

export async function APIInsert(plugin: PluginDetect, arg1: string | any, arg2?: any) {
  let doc: any = null;
  if (typeof arg1 == 'string' && typeof arg2 == 'object') {
    arg2 = CheckQuery(arg2);
    if (!plugin.core) {
      const profile = await FindProfile(arg1);
      if (profile == null) {
        Logger.warn('refid does not exists, insert operation canceled', { plugin: plugin.name });
        return null;
      }
    }
    doc = {
      ...arg2,
      __s: 'plugins_profile',
      __a: plugin.name,
      __refid: arg1,
    };
  } else if (arg1 == null && typeof arg2 == 'object') {
    throw new Error('refid must be specified for Insert Query');
  } else if (typeof arg1 == 'object') {
    arg1 = CheckQuery(arg1);
    doc = {
      ...arg1,
      __s: 'plugins',
      __a: plugin.name,
    };
  } else {
    throw new Error('invalid Insert query');
  }

  return new Promise<any>((resolve, reject) => {
    DB.insert(doc, (err, doc) => {
      if (err) reject(err);
      else resolve(plugin.core ? doc : CleanDoc(doc));
    });
  });
}

export async function APIUpdate(plugin: PluginDetect, arg1: string | any, arg2: any, arg3?: any) {
  let query: any = null;
  let update: any = null;
  let signature: any = { __a: plugin.name };
  if (typeof arg1 == 'string' && typeof arg2 == 'object' && typeof arg3 == 'object') {
    arg2 = CheckQuery(arg2);
    arg3 = CheckQuery(arg3);
    query = arg2;
    update = arg3;
    signature.__s = 'plugins_profile';
    signature.__refid = arg1;
  } else if (arg1 == null && typeof arg2 == 'object' && typeof arg3 == 'object') {
    arg2 = CheckQuery(arg2);
    arg3 = CheckQuery(arg3);
    query = arg2;
    update = arg3;
    signature.__s = 'plugins_profile';
  } else if (typeof arg1 == 'object' && typeof arg2 == 'object') {
    arg1 = CheckQuery(arg1);
    arg2 = CheckQuery(arg2);
    query = arg1;
    update = arg2;
    signature.__s = 'plugins';
  } else {
    throw new Error('invalid Update query');
  }

  query = { ...query, ...signature };

  if (!get(Object.keys(update), '0', '').startsWith('$')) {
    update = {
      ...update,
      ...signature,
    };
  }

  return new Promise<any>((resolve, reject) => {
    DB.update(
      query,
      update,
      { upsert: false, multi: true, returnUpdatedDocs: true },
      (err, num, docs: any[]) => {
        if (err) reject(err);
        else
          resolve({
            updated: num,
            docs: isArray(docs)
              ? docs.map(d => (plugin.core ? d : CleanDoc(d)))
              : [plugin.core ? docs : CleanDoc(docs)],
          });
      }
    );
  });
}

export async function APIUpsert(plugin: PluginDetect, arg1: string | any, arg2: any, arg3?: any) {
  let query: any = null;
  let update: any = null;
  let signature: any = { __a: plugin.name };
  if (typeof arg1 == 'string' && typeof arg2 == 'object' && typeof arg3 == 'object') {
    arg2 = CheckQuery(arg2);
    arg3 = CheckQuery(arg3);
    if (!plugin.core) {
      const profile = await FindProfile(arg1);
      if (profile == null) {
        Logger.warn('refid does not exists, upsert operation canceled', { plugin: plugin.name });
        return { updated: 0, docs: [], upsert: false };
      }
    }
    query = arg2;
    update = arg3;
    signature.__s = 'plugins_profile';
    signature.__refid = arg1;
  } else if (arg1 == null && typeof arg2 == 'object' && typeof arg3 == 'object') {
    throw new Error('refid must be specified for Upsert Query');
  } else if (typeof arg1 == 'object' && typeof arg2 == 'object') {
    arg1 = CheckQuery(arg1);
    arg2 = CheckQuery(arg2);
    query = arg1;
    update = arg2;
    signature.__s = 'plugins';
  } else {
    throw new Error('invalid Upsert query');
  }

  query = { ...query, ...signature };

  if (!get(Object.keys(update), '0', '').startsWith('$')) {
    update = {
      ...update,
      ...signature,
    };
  }
  return new Promise<any>((resolve, reject) => {
    DB.update(
      query,
      update,
      { upsert: true, multi: true, returnUpdatedDocs: true },
      (err: Error, num: number, docs: any[], upsert: boolean = false) => {
        if (err) reject(err);
        else
          resolve({
            updated: num,
            docs: isArray(docs)
              ? docs.map(d => (plugin.core ? d : CleanDoc(d)))
              : [plugin.core ? docs : CleanDoc(docs)],
            upsert: upsert ? true : false,
          });
      }
    );
  });
}

export async function APIRemove(plugin: PluginDetect, arg1: string | any, arg2?: any) {
  let query: any = null;
  if (typeof arg1 == 'string' && typeof arg2 == 'object') {
    arg2 = CheckQuery(arg2);
    query = {
      ...arg2,
      __s: 'plugins_profile',
      __a: plugin.name,
      __refid: arg1,
    };
  } else if (arg1 == null && typeof arg2 == 'object') {
    arg2 = CheckQuery(arg2);
    query = {
      ...arg2,
      __s: 'plugins_profile',
      __a: plugin.name,
    };
  } else if (typeof arg1 == 'object') {
    arg1 = CheckQuery(arg1);
    query = {
      ...arg1,
      __s: 'plugins',
      __a: plugin.name,
    };
  } else {
    throw new Error('invalid Remove query');
  }

  return new Promise<any>((resolve, reject) => {
    DB.remove(query, { multi: true }, (err, num) => {
      if (err) reject(err);
      else resolve(num);
    });
  });
}

export async function APICount(plugin: PluginDetect, arg1: string | any, arg2?: any) {
  let query: any = null;
  if (typeof arg1 == 'string' && typeof arg2 == 'object') {
    arg2 = CheckQuery(arg2);
    query = {
      ...arg2,
      __s: 'plugins_profile',
      __a: plugin.name,
      __refid: arg1,
    };
  } else if (arg1 == null && typeof arg2 == 'object') {
    arg2 = CheckQuery(arg2);
    query = {
      ...arg2,
      __s: 'plugins_profile',
      __a: plugin.name,
    };
  } else if (typeof arg1 == 'object') {
    arg1 = CheckQuery(arg1);
    query = {
      ...arg1,
      __s: 'plugins',
      __a: plugin.name,
    };
  } else {
    throw new Error('invalid Count query');
  }

  return new Promise<any>((resolve, reject) => {
    DB.count(query, (err, num) => {
      if (err) reject(err);
      else resolve(num);
    });
  });
}
