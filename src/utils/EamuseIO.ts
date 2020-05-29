import { existsSync, mkdirSync, readFileSync, writeFile, readFile, readdir } from 'fs';

import { Logger } from './Logger';
import path from 'path';
import nedb from 'nedb';
import { nfc2card } from './CardCipher';
import { compress, decompress } from './SMAZ';
import hashids from 'hashids/cjs';
import { NAMES } from './Consts';
import { CONFIG } from './ArgConfig';
import { isArray, get, groupBy } from 'lodash';
import { sizeof } from 'sizeof';

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
      if (!filename) return null;
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
export function Resolve(file: string) {
  const plugin = GetCallerPlugin();
  if (!plugin) return;

  return path.resolve(PLUGIN_PATH, plugin.identifier, file);
}

export async function ReadDir(file: string) {
  const plugin = GetCallerPlugin();
  if (!plugin) return;

  const target = path.resolve(PLUGIN_PATH, plugin.identifier, file);

  return new Promise<{ name: string; type: 'file' | 'dir' | 'unsupported' }[]>(resolve => {
    readdir(target, { encoding: 'utf8', withFileTypes: true }, (err, files) => {
      if (err) {
        Logger.error(`file writing failed: ${err}`, { plugin: plugin.identifier });
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

export async function WriteFile(
  file: string,
  data: string,
  options: { encoding?: string | null; mode?: number | string; flag?: string } | string | null
) {
  const plugin = GetCallerPlugin();
  if (!plugin) return;

  const target = path.resolve(PLUGIN_PATH, plugin.identifier, file);

  PrepareDirectory(path.dirname(target));

  return new Promise<void>(resolve => {
    if (options == null) {
      writeFile(target, data, err => {
        if (err) {
          Logger.error(`file writing failed: ${err}`, { plugin: plugin.identifier });
        }
        resolve();
      });
    } else {
      writeFile(target, data, options, err => {
        if (err) {
          Logger.error(`file writing failed: ${err}`, { plugin: plugin.identifier });
        }
        resolve();
      });
    }
  });
}

export async function ReadFile(
  file: string,
  options: { encoding?: string | null; flag?: string } | string | undefined | null
) {
  const plugin = GetCallerPlugin();
  if (!plugin) return;

  const target = path.resolve(PLUGIN_PATH, plugin.identifier, file);

  return new Promise<string | Buffer>(resolve => {
    if (options == null) {
      readFile(target, (err, data) => {
        if (err) {
          Logger.error(`file reading failed: ${err}`, { plugin: plugin.identifier });
          return resolve(null);
        }
        return resolve(data);
      });
    } else {
      readFile(target, options, (err, data) => {
        if (err) {
          Logger.error(`file reading failed: ${err}`, { plugin: plugin.identifier });
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

export async function PluginStats() {
  return new Promise<
    {
      name: string;
      id: string;
      dataSize: string;
    }[]
  >(resolve => {
    DB.find({
      __reserved_field: { $in: ['plugins', 'plugins_profile'] },
    }).exec((err, res) => {
      if (err) {
        resolve([]);
        return;
      }

      const group = groupBy(res, '__affiliation');
      const stats = [];
      for (const plugin of Object.keys(group).sort()) {
        stats.push({
          name: plugin.split('@')[0].toUpperCase(),
          id: plugin,
          dataSize: sizeof(group[plugin], true),
        });
      }
      resolve(stats);
    });
  });
}

export async function PurgePlugin(affiliation: string) {
  return new Promise<boolean>(resolve => {
    DB.remove(
      {
        __affiliation: affiliation,
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

// Public API
function CheckQuery(query: any) {
  for (const key in query) {
    if (key.startsWith('__')) {
      throw new Error('query or doc field can not starts with "__"');
    }

    if (typeof query[key] == 'object') {
      CheckQuery(query[key]);
    }
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

export async function APIFindOne(
  plugin: { name: string; core: boolean },
  arg1: string | any,
  arg2?: any
) {
  let query: any = null;

  if (typeof arg1 == 'string' && typeof arg2 == 'object') {
    CheckQuery(arg2);
    query = {
      ...arg2,
      __reserved_field: 'plugins_profile',
      __affiliation: plugin.name,
      __refid: arg1,
    };
  } else if (typeof arg1 == 'object') {
    CheckQuery(arg1);
    query = {
      ...arg1,
      __reserved_field: 'plugins',
      __affiliation: plugin.name,
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
            __reserved_field: 0,
            __affiliation: 0,
            __collection: 0,
            __refid: 0,
          },
      (err, doc) => {
        if (err) reject(err);
        else resolve(doc);
      }
    );
  });
}

export async function APIFind(
  plugin: { name: string; core: boolean },
  arg1: string | any,
  arg2?: any
) {
  let query: any = null;
  if (typeof arg1 == 'string' && typeof arg2 == 'object') {
    CheckQuery(arg2);
    query = {
      ...arg2,
      __reserved_field: 'plugins_profile',
      __affiliation: plugin.name,
      __refid: arg1,
    };
  } else if (arg1 == null && typeof arg2 == 'object') {
    CheckQuery(arg2);
    query = {
      ...arg2,
      __reserved_field: 'plugins_profile',
      __affiliation: plugin.name,
    };
  } else if (typeof arg1 == 'object') {
    CheckQuery(arg1);
    query = {
      ...arg1,
      __reserved_field: 'plugins',
      __affiliation: plugin.name,
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
            __reserved_field: 0,
            __affiliation: 0,
            __collection: 0,
            __refid: 0,
          }
    )
      .sort({ createdAt: 1 })
      .exec((err, doc) => {
        if (err) reject(err);
        else resolve(doc);
      });
  });
}

export async function APIInsert(
  plugin: { name: string; core: boolean },
  arg1: string | any,
  arg2?: any
) {
  let doc: any = null;
  if (typeof arg1 == 'string' && typeof arg2 == 'object') {
    CheckQuery(arg2);
    if (!plugin.core) {
      const profile = await FindProfile(arg1);
      if (profile == null) {
        Logger.warn('refid does not exists, insert operation canceled', { plugin: plugin.name });
        return null;
      }
    }
    doc = {
      ...arg2,
      __reserved_field: 'plugins_profile',
      __affiliation: plugin.name,
      __refid: arg1,
    };
  } else if (typeof arg1 == 'object') {
    CheckQuery(arg1);
    doc = {
      ...arg1,
      __reserved_field: 'plugins',
      __affiliation: plugin.name,
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

export async function APIUpdate(
  plugin: { name: string; core: boolean },
  arg1: string | any,
  arg2: any,
  arg3?: any
) {
  let query: any = null;
  let update: any = null;
  let signiture: any = { __affiliation: plugin.name };
  if (typeof arg1 == 'string' && typeof arg2 == 'object' && typeof arg3 == 'object') {
    CheckQuery(arg2);
    CheckQuery(arg3);
    query = arg2;
    update = arg3;
    signiture.__reserved_field = 'plugins_profile';
    signiture.__refid = arg1;
  } else if (arg1 == null && typeof arg2 == 'object' && typeof arg3 == 'object') {
    CheckQuery(arg2);
    CheckQuery(arg3);
    query = arg2;
    update = arg3;
    signiture.__reserved_field = 'plugins_profile';
  } else if (typeof arg1 == 'object' && typeof arg2 == 'object') {
    CheckQuery(arg1);
    CheckQuery(arg2);
    query = arg1;
    update = arg2;
    signiture.__reserved_field = 'plugins';
  } else {
    throw new Error('invalid Update query');
  }

  query = { ...query, ...signiture };

  if (!get(Object.keys(update), '0', '').startsWith('$')) {
    update = {
      ...update,
      ...signiture,
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

export async function APIUpsert(
  plugin: { name: string; core: boolean },
  arg1: string | any,
  arg2: any,
  arg3?: any
) {
  let query: any = null;
  let update: any = null;
  let signiture: any = { __affiliation: plugin.name };
  if (typeof arg1 == 'string' && typeof arg2 == 'object' && typeof arg3 == 'object') {
    CheckQuery(arg2);
    CheckQuery(arg3);
    if (!plugin.core) {
      const profile = await FindProfile(arg1);
      if (profile == null) {
        Logger.warn('refid does not exists, insert operation canceled', { plugin: plugin.name });
        return null;
      }
    }
    query = arg2;
    update = arg3;
    signiture.__reserved_field = 'plugins_profile';
    signiture.__refid = arg1;
  } else if (arg1 == null && typeof arg2 == 'object' && typeof arg3 == 'object') {
    CheckQuery(arg2);
    CheckQuery(arg3);
    query = arg2;
    update = arg3;
    signiture.__reserved_field = 'plugins_profile';
  } else if (typeof arg1 == 'object' && typeof arg2 == 'object') {
    CheckQuery(arg1);
    CheckQuery(arg2);
    query = arg1;
    update = arg2;
    signiture.__reserved_field = 'plugins';
  } else {
    throw new Error('invalid Upsert query');
  }

  query = { ...query, ...signiture };

  if (!get(Object.keys(update), '0', '').startsWith('$')) {
    update = {
      ...update,
      ...signiture,
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

export async function APIRemove(
  plugin: { name: string; core: boolean },
  arg1: string | any,
  arg2?: any
) {
  let query: any = null;
  if (typeof arg1 == 'string' && typeof arg2 == 'object') {
    CheckQuery(arg2);
    query = {
      ...arg2,
      __reserved_field: 'plugins_profile',
      __affiliation: plugin.name,
      __refid: arg1,
    };
  } else if (arg1 == null && typeof arg2 == 'object') {
    CheckQuery(arg2);
    query = {
      ...arg2,
      __reserved_field: 'plugins_profile',
      __affiliation: plugin.name,
    };
  } else if (typeof arg1 == 'object') {
    CheckQuery(arg1);
    query = {
      ...arg1,
      __reserved_field: 'plugins',
      __affiliation: plugin.name,
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

export async function APICount(
  plugin: { name: string; core: boolean },
  arg1: string | any,
  arg2?: any
) {
  let query: any = null;
  if (typeof arg1 == 'string' && typeof arg2 == 'object') {
    CheckQuery(arg2);
    query = {
      ...arg2,
      __reserved_field: 'plugins_profile',
      __affiliation: plugin.name,
      __refid: arg1,
    };
  } else if (arg1 == null && typeof arg2 == 'object') {
    CheckQuery(arg2);
    query = {
      ...arg2,
      __reserved_field: 'plugins_profile',
      __affiliation: plugin.name,
    };
  } else if (typeof arg1 == 'object') {
    CheckQuery(arg1);
    query = {
      ...arg1,
      __reserved_field: 'plugins',
      __affiliation: plugin.name,
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
