import { kitem, karray, kattr, dataToXML } from '../utils/KBinJSON';
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
import { PLUGIN_PATH, WriteFile, GetCallerPlugin } from '../utils/EamuseIO';
import { readdirSync, existsSync } from 'fs';
import { ARGS, PluginRegisterConfig } from '../utils/ArgConfig';
import { EamusePlugin } from './EamusePlugin';
import { EamuseRouteHandler } from './EamuseRouteContainer';

/* Exposing API */
const $: any = global;

const tsconfig = path.join(PLUGIN_PATH, 'tsconfig.json');
/* ncc/pkg hack */
// require('typescript');
const ts_node = require('ts-node');
if (existsSync(tsconfig)) {
  /* Inject ts-node */
  ts_node.register({ project: tsconfig });
} else {
  ts_node.register();
}

$.$ = (data: any) => {
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

$.K = {
  ATTR: kattr,
  ITEM: kitem,
  ARRAY: karray,
};

$.DB = {};

$.U = {
  toXML: dataToXML,
  WriteFile,
};

$.R = {
  GameCode: () => {},
  Route: () => {},
  Unhandled: () => {},
  Contributor: () => {},
  Config: () => {},
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
  $.R.Config = PluginRegisterConfig;
}

function DisableRegisterNamespace() {
  $.R.GameCode = () => {};
  $.R.Route = () => {};
  $.R.Unhandled = () => {};
  $.R.Contributor = () => {};
  $.R.Config = () => {};
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
      Logger.info(msgs.join(' '), { plugin: plugin.name });
    } else {
      Logger.info(msgs.join(' '));
    }
  };
  $.console.debug = $.console.log;
  $.console.info = $.console.log;
  $.console.warn = (...msgs: any[]) => {
    const plugin = GetCallerPlugin();
    if (plugin) {
      Logger.warn(msgs.join(' '), { plugin: plugin.name });
    } else {
      Logger.warn(msgs.join(' '));
    }
  };
}

$.console.error = (...msgs: any[]) => {
  const plugin = GetCallerPlugin();
  if (plugin) {
    Logger.error(msgs.join(' '), { plugin: plugin.name });
  } else {
    Logger.error(msgs.join(' '));
  }
};

export function LoadExternalPlugins() {
  const loaded: EamusePlugin[] = [];

  try {
    const plugins = readdirSync(PLUGIN_PATH);

    const instances: { instance: any; name: string }[] = [];

    for (const mod of plugins) {
      const name = path.basename(mod);
      const pluginPath = path.resolve(PLUGIN_PATH, mod);
      const pluginExt = path.extname(pluginPath);

      if (
        pluginPath.endsWith('.d.ts') ||
        mod.startsWith('_') ||
        mod.startsWith('.') ||
        mod.startsWith('core') ||
        mod == 'node_modules' ||
        (pluginExt !== '' && pluginExt !== '.ts' && pluginExt !== '.js')
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
      const plugin = new EamusePlugin(name);
      EnableRegisterNamespace(plugin);
      try {
        instance.register();
        loaded.push(plugin);
      } catch (err) {
        Logger.error(`failed during register()`, { plugin: name });
        Logger.error(err);
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
