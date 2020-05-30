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
  GetCallerPlugin,
  APIFindOne,
  APIFind,
  APIInsert,
  APIRemove,
  APIUpdate,
  APIUpsert,
  APICount,
} from '../utils/EamuseIO';
import { readdirSync, existsSync } from 'fs';
import { ARGS, PluginRegisterConfig, CONFIG } from '../utils/ArgConfig';
import { EamusePlugin } from './EamusePlugin';
import { EamuseRouteHandler } from './EamuseRouteContainer';
import xml2json from 'fast-xml-parser';
import _ from 'lodash';
import { isPlainObject } from 'lodash';

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
  Resolve,
  WriteFile,
  ReadFile,
  ReadDir,
};

$.DB = {
  FindOne: async (arg1: any, arg2?: any) => {
    const plugin = GetCallerPlugin();
    if (!plugin) {
      Logger.error('DB unknown error');
      return null;
    }
    return APIFindOne({ name: plugin.identifier, core: false }, arg1, arg2);
  },
  Find: async (arg1: any, arg2?: any) => {
    const plugin = GetCallerPlugin();
    if (!plugin) {
      Logger.error('DB unknown error');
      return [];
    }
    return APIFind({ name: plugin.identifier, core: false }, arg1, arg2);
  },
  Insert: async (arg1: any, arg2?: any) => {
    const plugin = GetCallerPlugin();
    if (!plugin) {
      Logger.error('DB unknown error');
      return null;
    }
    return APIInsert({ name: plugin.identifier, core: false }, arg1, arg2);
  },
  Remove: async (arg1: any, arg2?: any) => {
    const plugin = GetCallerPlugin();
    if (!plugin) {
      Logger.error('DB unknown error');
      return 0;
    }
    return APIRemove({ name: plugin.identifier, core: false }, arg1, arg2);
  },
  Update: async (arg1: any, arg2: any, arg3?: any) => {
    const plugin = GetCallerPlugin();
    if (!plugin) {
      Logger.error('DB unknown error');
      return 0;
    }
    return APIUpdate({ name: plugin.identifier, core: false }, arg1, arg2, arg3);
  },
  Upsert: async (arg1: any, arg2: any, arg3?: any) => {
    const plugin = GetCallerPlugin();
    if (!plugin) {
      Logger.error('DB unknown error');
      return 0;
    }
    return APIUpsert({ name: plugin.identifier, core: false }, arg1, arg2, arg3);
  },
  Count: async (arg1: any, arg2?: any) => {
    const plugin = GetCallerPlugin();
    if (!plugin) {
      Logger.error('DB unknown error');
      return 0;
    }
    return APICount({ name: plugin.identifier, core: false }, arg1, arg2);
  },
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
    if (!CONFIG[plugin.identifier]) return undefined;
    return CONFIG[plugin.identifier][key];
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
  $.R.Config = PluginRegisterConfig;
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
      Logger.info(msgs.join(' '), { plugin: plugin.identifier });
    } else {
      Logger.info(msgs.join(' '));
    }
  };
  $.console.debug = $.console.log;
  $.console.info = $.console.log;
  $.console.warn = (...msgs: any[]) => {
    const plugin = GetCallerPlugin();
    if (plugin) {
      Logger.warn(msgs.join(' '), { plugin: plugin.identifier });
    } else {
      Logger.warn(msgs.join(' '));
    }
  };
}

$.console.error = (...msgs: any[]) => {
  const plugin = GetCallerPlugin();
  if (plugin) {
    Logger.error(msgs.join(' '), { plugin: plugin.identifier });
  } else {
    Logger.error(msgs.join(' '));
  }
};

export function LoadExternalPlugins() {
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
        Logger.error(`failed to load`, { plugin: name });
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
        Logger.error(`failed during register()`, { plugin: name });
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
