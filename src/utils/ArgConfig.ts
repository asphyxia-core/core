import { ArgumentParser } from 'argparse';
import { VERSION } from './Consts';
import { GetCallerPlugin, CONFIG_PATH } from './EamuseIO';
import { Logger } from './Logger';
import { readFileSync, writeFileSync } from 'fs';
import { parse, stringify } from 'ini';

const parser = new ArgumentParser({
  version: VERSION,
  addHelp: true,
  description: 'AsphyxiaCore: A Rhythm Game Helper',
  prog: 'asphyxia_core',
});

parser.addArgument(['-p', '--port'], {
  help: 'Set listening port. (default: 8083)',
  defaultValue: 8083,
  type: 'int',
  metavar: 'PORT',
  dest: 'port',
});

parser.addArgument(['-b', '--bind'], {
  help: 'Hostname binding. In case you need to access it through LAN. (default: "localhost")',
  defaultValue: 'localhost',
  metavar: 'HOST',
  dest: 'bind',
});

// parser.addArgument(['-uip', '--webui-port'], {
//   help: 'Set WebUI port. (default: 8084)',
//   defaultValue: 8084,
//   type: 'int',
//   metavar: 'PORT',
//   dest: 'ui_port',
// });

// parser.addArgument(['-uib', '--webui-bind'], {
//   help: 'WebUI Hostname binding. (default: "localhost")',
//   defaultValue: 'localhost',
//   metavar: 'HOST',
//   dest: 'ui_bind',
// });

parser.addArgument(['-m', '--matching-port'], {
  help: 'Set matching port. (default: 5700)',
  defaultValue: 5700,
  type: 'int',
  dest: 'matching_port',
  metavar: 'PORT',
});

// parser.addArgument(['-s', '--save-path'], {
//   help: 'Set custom savedata directory',
//   dest: 'save_path',
//   metavar: 'PATH',
// });

parser.addArgument(['--console'], {
  help: 'Enable console for plugins.',
  defaultValue: false,
  dest: 'dev',
  action: 'storeTrue',
});

parser.addArgument(['--no-tray'], {
  help: 'Disable system tray icon',
  defaultValue: false,
  dest: 'no-tray',
  action: 'storeTrue',
});

export const ARGS = parser.parseArgs();

export interface CONFIG_OPTIONS {
  name?: string;
  desc?: string;
  type: 'string' | 'integer' | 'float' | 'boolean';
  range?: [number, number];
  validator?: (data: string) => true | string;
  onchange?: (key: string, value: string) => Promise<void>;
  options?: string[];
  needRestart?: boolean;
  default: any;
}

export type CONFIG_DATA = CONFIG_OPTIONS & { key: string; current: any; error?: string };

let INI: any = null;

export const CONFIG_MAP: {
  [key: string]: Map<string, CONFIG_OPTIONS>;
} = {
  core: new Map(),
};

function CoreConfig() {
  CONFIG_MAP['core'].set('port', {
    type: 'integer',
    range: [0, 65535],
    default: 8083,
    needRestart: true,
  });

  CONFIG_MAP['core'].set('bind', {
    type: 'string',
    default: 'localhost',
    needRestart: true,
  });

  CONFIG_MAP['core'].set('matching_port', {
    type: 'integer',
    range: [0, 65535],
    default: 5700,
    desc: 'Matchmaking port (if plugin supports it)',
  });

  CONFIG_MAP['core'].set('allow_register', {
    type: 'boolean',
    default: true,
    desc: 'Allow registering new profile.',
  });

  CONFIG_MAP['core'].set('maintenance_mode', {
    type: 'boolean',
    default: false,
  });

  CONFIG_MAP['core'].set('enable_paseli', {
    type: 'boolean',
    default: true,
  });

  if (process.platform == 'win32') {
    CONFIG_MAP['core'].set('webui_on_startup', {
      name: 'WebUI on startup',
      type: 'boolean',
      default: true,
      desc: 'Open WebUI when you launch Asphyxia CORE',
    });
  }
}
CoreConfig();

export function PluginRegisterConfig(key: string, options: CONFIG_OPTIONS) {
  const plugin = GetCallerPlugin();
  if (!plugin) {
    Logger.error('failed to register config entry: unknown plugin');
    return;
  }

  if (!options) {
    Logger.error(`failed to register config entry ${key}: config options not specified`, {
      plugin: plugin.identifier,
    });
  }

  if (options.default == null) {
    Logger.error(`failed to register config entry ${key}: default value not specified`, {
      plugin: plugin.identifier,
    });
  }

  if (!options.type == null) {
    Logger.error(`failed to register config entry ${key}: value type not specified`, {
      plugin: plugin.identifier,
    });
  }

  if (!CONFIG_MAP[plugin.identifier]) {
    CONFIG_MAP[plugin.identifier] = new Map();
  }

  CONFIG_MAP[plugin.identifier].set(key, options);
}

export function ReadConfig() {
  try {
    const file = readFileSync(CONFIG_PATH, { encoding: 'utf-8' });
    INI = parse(file);
  } catch (err) {
    INI = {};
  }

  for (const mod in CONFIG_MAP) {
    let section = INI;
    if (mod != 'core') {
      if (!INI[mod]) {
        INI[mod] = {};
      }
      section = INI[mod];
    }

    for (const [key, option] of CONFIG_MAP[mod]) {
      if (!section[key]) {
        section[key] = option.default;
      } else {
        if (option.type == 'boolean') {
          section[key] = section[key].toString() == 'true';
        } else if (option.type == 'integer') {
          section[key] = parseInt(section[key]);
          if (isNaN(section[key])) {
            section[key] = option.default;
          }
        } else if (option.type == 'float') {
          section[key] = parseFloat(section[key]);
          if (isNaN(section[key])) {
            section[key] = option.default;
          }
        } else {
          section[key] = section[key].toString();
        }
      }
    }
  }
}

export function SaveConfig() {
  try {
    writeFileSync(CONFIG_PATH, stringify(INI));
  } catch (err) {
    Logger.error(`failed to write config: ${err}`);
  }
}

export const CONFIG: any = new Proxy(
  {},
  {
    get: (_, prop) => {
      return ARGS.prop || INI[prop];
    },
    set: (_, prop, value) => {
      INI[prop] = value;
      return true;
    },
  }
);
