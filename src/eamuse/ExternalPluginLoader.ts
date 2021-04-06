import { kitem, karray, kattr, dataToXML, xmlToData } from '../utils/KBinJSON';
import path from 'path';
import {
  getAttr,
  getBigInt,
  getBigInts,
  getBool,
  getBuffer,
  getContent,
  getElement,
  getElements,
  getNumber,
  getNumbers,
  getStr,
} from '../utils/KBinJSON';
import { Logger } from '../utils/Logger';
import { KDataReader } from '../utils/KDataReader';
import {
  PLUGIN_PATH,
  Resolve,
  WriteFile,
  ReadFile,
  ReadDir,
  APIFindOne,
  APIFind,
  APIInsert,
  APIRemove,
  APIUpdate,
  APIUpsert,
  APICount,
  Exists,
} from '../utils/EamuseIO';
import { readdirSync, existsSync } from 'fs';
import {
  ARGS,
  PluginRegisterConfig,
  CONFIG,
  CONFIG_OPTIONS,
  FILE_OPTIONS,
  PluginRegisterFile,
} from '../utils/ArgConfig';
import { EamusePlugin } from './EamusePlugin';
import { EamuseRouteHandler } from './EamuseRouteContainer';
import xml2json from 'fast-xml-parser';
import _ from 'lodash';
import { isPlainObject } from 'lodash';
import { VERSION } from '../utils/Consts';
import { card2nfc, nfc2card } from '../utils/CardCipher';
import LzKN from '../utils/LzKN';

/** Caller Detection */
export function GetCallerPlugin(): string {
  const trace: any = {};

  const oldPrepareStackTrace = Error.prepareStackTrace;
  Error.prepareStackTrace = (_, stack) => stack;
  Error.captureStackTrace(trace, GetCallerPlugin);

  const stack = trace.stack;

  Error.prepareStackTrace = oldPrepareStackTrace;

  if (stack && typeof stack === 'object') {
    for (const file of trace.stack) {
      const filename: string = file.getFileName();
      if (filename && filename.startsWith(PLUGIN_PATH)) {
        return path.relative(PLUGIN_PATH, filename).split(path.sep)[0];
      }
    }
  }

  return null;
}

const WrapCall = (methodName: string, func: any, def: any) => {
  return (...args: any) => {
    const plugin = GetCallerPlugin();
    if (!plugin) {
      Logger.error(`${methodName} unexpected error`);
      return def;
    }
    return func({ name: plugin, core: false }, ...args);
  };
};

const Pro = (res: any) => {
  return new Promise(resolve => resolve(res));
};

export type PluginDetect = {
  name: string;
  core: boolean;
};

export function LoadExternalPlugins() {
  /* Exposing API */
  const $: any = global;

  const tsconfig = path.join(PLUGIN_PATH, 'tsconfig.json');
  /* ncc/pkg hack */
  // require('typescript');
  const ts_node = require('ts-node');
  if (existsSync(tsconfig)) {
    /* Inject ts-node */
    ts_node.register({ project: tsconfig, transpileOnly: ARGS.dev ? false : true });
  } else {
    ts_node.register({ transpileOnly: ARGS.dev ? false : true });
  }

  $.$ = (data: any) => {
    if (!isPlainObject(data)) {
      throw new Error('data is not a plain object. (Did you pass a KDataReader as data?)');
    }
    return new KDataReader(data);
  };

  $.$.ATTR = getAttr;
  $.$.BIGINT = getBigInt;
  $.$.BIGINTS = getBigInts;
  $.$.BOOL = getBool;
  $.$.BUFFER = getBuffer;
  $.$.CONTENT = getContent;
  $.$.ELEMENT = getElement;
  $.$.ELEMENTS = getElements;
  $.$.NUMBER = getNumber;
  $.$.NUMBERS = getNumbers;
  $.$.STR = getStr;

  $._ = _;
  $.K = {
    ATTR: kattr,
    ITEM: kitem,
    ARRAY: karray,
  };

  $.IO = {
    Resolve: WrapCall('IO.Resolve', Resolve, ''),
    WriteFile: WrapCall('IO.WriteFile', WriteFile, Pro(void 0)),
    ReadFile: WrapCall('IO.ReadFile', ReadFile, Pro(null)),
    ReadDir: WrapCall('IO.ReadDir', ReadDir, Pro([])),
    Exists: WrapCall('IO.Exists', Exists, false),
  };

  $.DB = {
    FindOne: WrapCall('DB.FindOne', APIFindOne, Pro(null)),
    Find: WrapCall('DB.Find', APIFind, Pro([])),
    Insert: WrapCall('DB.Insert', APIInsert, Pro(null)),
    Remove: WrapCall('DB.Remove', APIRemove, Pro(0)),
    Update: WrapCall('DB.Update', APIUpdate, Pro({ updated: 0, docs: [] })),
    Upsert: WrapCall('DB.Upsert', APIUpsert, Pro({ updated: 0, docs: [], upsert: false })),
    Count: WrapCall('DB.Count', APICount, Pro(0)),
  };

  $.U = {
    toXML: dataToXML,
    parseXML: (xml: string, simplify: boolean = true) => {
      if (simplify) {
        return xml2json.parse(xml);
      } else {
        return xmlToData(xml);
      }
    },
    GetConfig: (key: string) => {
      const plugin = GetCallerPlugin();
      if (!plugin) return undefined;

      if (!CONFIG[plugin]) return undefined;
      return CONFIG[plugin][key];
    },
    NFC2Card: (nfc: string) => {
      try {
        return nfc2card(nfc);
      } catch {
        return null;
      }
    },
    Card2NFC: (card: string) => {
      try {
        return card2nfc(card);
      } catch {
        return null;
      }
    },
  };

  $.R = {
    GameCode: () => {},
    Route: () => {},
    Unhandled: () => {},
    Contributor: () => {},
    Config: () => {},
    WebUIEvent: () => {},
  };

  $.CORE_VERSION = VERSION;
  $.CORE_VERSION_MAJOR = parseInt(VERSION.split('.')[0].substr(1));
  $.CORE_VERSION_MINOR = parseInt(VERSION.split('.')[1]);

  function EnableRegisterNamespace(plugin: EamusePlugin) {
    $.R.GameCode = (gameCode: string) => {
      plugin.RegisterGameCode(gameCode);
    };
    $.R.Route = (method: string, handler?: boolean | EamuseRouteHandler) => {
      plugin.RegisterRoute(method, handler);
    };
    $.R.Unhandled = (handler?: EamuseRouteHandler) => {
      plugin.RegisterUnhandled(handler);
    };
    $.R.Contributor = (name: string, link?: string) => {
      plugin.RegisterContributor(name, link);
    };
    $.R.WebUIEvent = (event: string, callback: (data: any) => void | Promise<void>) => {
      plugin.RegisterWebUIEvent(event, callback);
    };
    $.R.Config = (key: string, options: CONFIG_OPTIONS) => {
      PluginRegisterConfig(plugin.Identifier, key, options);
    };
    $.R.DataFile = (path: string, options?: FILE_OPTIONS) => {
      PluginRegisterFile(plugin.Identifier, path, options);
    };
  }

  function DisableRegisterNamespace() {
    $.R.GameCode = () => {};
    $.R.Route = () => {};
    $.R.Unhandled = () => {};
    $.R.Contributor = () => {};
    $.R.Config = () => {};
    $.R.WebUIEvent = () => {};
  }

  if (!ARGS.dev) {
    $.console.log = () => {};
    $.console.warn = () => {};
    $.console.debug = () => {};
    $.console.info = () => {};
  } else {
    $.console.log = (...msgs: any[]) => {
      const plugin = GetCallerPlugin();
      if (plugin) {
        Logger.info(msgs.join(' '), { plugin: plugin });
      } else {
        Logger.info(msgs.join(' '), { plugin: 'unknown' });
      }
    };
    $.console.debug = $.console.log;
    $.console.info = $.console.log;
    $.console.warn = (...msgs: any[]) => {
      const plugin = GetCallerPlugin();
      if (plugin) {
        Logger.warn(msgs.join(' '), { plugin: plugin });
      } else {
        Logger.warn(msgs.join(' '), { plugin: 'unknown' });
      }
    };
  }

  $.console.error = (...msgs: any[]) => {
    const plugin = GetCallerPlugin();
    if (plugin) {
      Logger.error(msgs.join(' '), { plugin: plugin });
    } else {
      Logger.error(msgs.join(' '), { plugin: 'unknown' });
    }
  };

  const loaded: EamusePlugin[] = [];

  try {
    const plugins = readdirSync(PLUGIN_PATH, {
      encoding: 'utf8',
      withFileTypes: true,
    }).filter(fileName => fileName.isDirectory());

    const instances: { instance: any; name: string }[] = [];

    for (const dir of plugins) {
      const name = path.basename(dir.name);
      const pluginPath = path.resolve(PLUGIN_PATH, dir.name);

      if (
        dir.name.startsWith('_') ||
        dir.name.startsWith('.') ||
        dir.name.startsWith('core') ||
        dir.name == 'node_modules'
      )
        continue;

      try {
        let instance = require(pluginPath);
        if (instance && instance.default != null) {
          instance = instance.default;
        }

        instances.push({ instance, name });
      } catch (err) {
        Logger.error(`Failed to load`, { plugin: name });
        Logger.error(err);
      }
    }

    for (const { instance, name } of instances) {
      const plugin = new EamusePlugin(name, instance);
      EnableRegisterNamespace(plugin);
      try {
        plugin.Register();
        loaded.push(plugin);
      } catch (err) {
        Logger.error(`Failed during register()`, { plugin: name });
        Logger.error(err, { plugin: name });
      }
    }

    /* Disable route registering after external module has been loaded */
    DisableRegisterNamespace();
  } catch (err) {
    Logger.warn(`can not find "plugins" directory.`);
    Logger.warn(`make sure your plugins are installed under: ${PLUGIN_PATH}`);
  }

  return loaded;
}
