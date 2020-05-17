import { EamusePluginContainer, EamusePluginRoute } from './EamusePluginContainer';
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
import { AddProfileCheck } from './Core/CardManager';

/* Plugin Store */
export const LOADED_PLUGINS: Map<
  string,
  {
    instance: any;
    contributors: {
      name: string;
      link?: string;
    }[];
  }
> = new Map();

/* Exposing API */
const $: any = global;
const PLUGIN_ROUTER = new EamusePluginContainer();

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

function EnableRegisterNamespace() {
  $.R = {
    Route: (gameCode: string, method: string, handler: EamusePluginRoute | boolean) => {
      if (gameCode === '*') return;
      PLUGIN_ROUTER.add(gameCode, method, handler);
    },
    Unhandled: (gameCode: string, handler?: EamusePluginRoute) => {
      if (gameCode === '*') return;
      PLUGIN_ROUTER.unhandled(gameCode, handler);
    },
    ProfileCheck: (gameCode: string, handler: () => boolean) => {
      if (gameCode === '*') return;
      AddProfileCheck(gameCode, handler);
    },
    Contributor: (name: string, link?: string) => {
      const plugin = GetCallerPlugin();
      if (!plugin) return;
      LOADED_PLUGINS.get(plugin.name).contributors.push({ name, link });
    },
    Config: PluginRegisterConfig,
  };
}

function DisableRegisterNamespace() {
  for (const prop in $.R) {
    $.R[prop] = () => {};
  }
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
  try {
    const plugins = readdirSync(PLUGIN_PATH);
    for (const mod of plugins) {
      const name = path.basename(mod);
      const pluginPath = path.resolve(PLUGIN_PATH, mod);
      const pluginExt = path.extname(pluginPath);

      if (
        pluginPath.endsWith('.d.ts') ||
        mod.startsWith('_') ||
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

        LOADED_PLUGINS.set(name, { instance, contributors: [] });
      } catch (err) {
        Logger.error(`failed to load`, { plugin: name });
        Logger.error(err);
      }
    }

    EnableRegisterNamespace();
    for (const [name, plugin] of LOADED_PLUGINS) {
      try {
        plugin.instance.register();
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

  return {
    plugins: LOADED_PLUGINS,
    router: PLUGIN_ROUTER,
  };
}
