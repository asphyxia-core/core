import { ArgumentParser } from 'argparse';
import { VERSION } from './Consts';

import { Logger } from './Logger';
import { readFileSync, writeFileSync, accessSync } from 'fs';
import { parse, stringify } from 'ini';
import path from 'path';

const EXEC_PATH = path.resolve((process as any).pkg ? path.dirname(process.argv0) : process.cwd());
const CONFIG_PATH = path.join(EXEC_PATH, 'config.ini');

const parser = new ArgumentParser({
  version: VERSION,
  addHelp: true,
  description: 'AsphyxiaCore: A Rhythm Game Helper',
  prog: 'asphyxia_core',
});

parser.addArgument(['-p', '--port'], {
  help: 'Set listening port. (default: 8083)',
  type: 'int',
  metavar: 'PORT',
  dest: 'port',
});

parser.addArgument(['-b', '--bind'], {
  help: 'Hostname binding. In case you need to access it through LAN. (default: "localhost")',
  metavar: 'HOST',
  dest: 'bind',
});

parser.addArgument(['-m', '--matching-port'], {
  help: 'Set matching port. (default: 5700)',
  type: 'int',
  dest: 'matching_port',
  metavar: 'PORT',
});

parser.addArgument(['--dev', '--console'], {
  help: 'Developer mode: Enable console for plugins and data management features',
  defaultValue: false,
  dest: 'dev',
  action: 'storeTrue',
});

parser.addArgument(['-pa', '--ping-addr'], {
  help: 'Use an ICMP pingable target to make your games think they are online',
  metavar: 'IP',
  dest: 'ping_addr',
});

parser.addArgument(['--force-load-db'], {
  help: 'Force load savedata and discard corrupted messages',
  defaultValue: false,
  dest: 'fixdb',
  action: 'storeTrue',
});

parser.addArgument(['-d', '--savedata-dir'], {
  help: 'Change savedata directory',
  defaultValue: 'savedata',
  dest: 'savedata',
});

export const ARGS = parser.parseArgs();

export interface CONFIG_OPTIONS {
  name?: string;
  desc?: string;
  type: 'string' | 'integer' | 'float' | 'boolean';
  range?: [number, number];
  validator?: (data: string) => true | string;
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

  CONFIG_MAP['core'].set('ping_ip', {
    type: 'string',
    default: '127.0.0.1',
    needRestart: true,
    desc: 'Use an ICMP pingable target to make your games think they are online',
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

export function PluginRegisterConfig(plugin: string, key: string, options: CONFIG_OPTIONS) {
  if (!options) {
    Logger.error(`Failed to register config entry ${key}: config options not specified`, {
      plugin,
    });
    return;
  }

  if (options.default == null) {
    Logger.error(`Failed to register config entry ${key}: default value not specified`, {
      plugin,
    });
    return;
  }

  if (!options.type == null) {
    Logger.error(`Failed to register config entry ${key}: value type not specified`, {
      plugin,
    });
    return;
  }

  if (!CONFIG_MAP[plugin]) {
    CONFIG_MAP[plugin] = new Map();
  }

  CONFIG_MAP[plugin].set(key, { ...options });
  NormalizeConfig(plugin, key, options);
}

export interface FILE_OPTIONS {
  name?: string;
  desc?: string;
  accept?: string;
  required?: boolean;
}

export type FILE_CHECK = FILE_OPTIONS & { path: string; filename: string; uploaded: boolean };

export const DATAFILE_MAP: {
  [key: string]: Map<string, FILE_OPTIONS>;
} = {};

export function PluginRegisterFile(plugin: string, path: string, options?: FILE_OPTIONS) {
  if (!DATAFILE_MAP[plugin]) {
    DATAFILE_MAP[plugin] = new Map();
  }

  if (!options) {
    options = {};
  }

  DATAFILE_MAP[plugin].set(path, { ...options });
}

export function NormalizeConfig(plugin: string, key: string, option: CONFIG_OPTIONS) {
  let section = INI;
  if (plugin != 'core') {
    if (!INI[plugin]) {
      INI[plugin] = {};
    }
    section = INI[plugin];
  }

  if (section[key] == null) {
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

export function ReadConfig() {
  try {
    const file = readFileSync(CONFIG_PATH, { encoding: 'utf-8' });
    INI = parse(file);
  } catch (err) {
    INI = {};
  }

  for (const [key, option] of CONFIG_MAP['core']) {
    NormalizeConfig('core', key, option);
  }
}

export function SaveConfig() {
  try {
    writeFileSync(CONFIG_PATH, stringify(INI));
  } catch (err) {
    Logger.error(`Failed to write config: ${err}`);
  }
}

export const CONFIG: any = new Proxy(
  {},
  {
    get: (_, prop) => {
      return ARGS[prop] || INI[prop];
    },
    set: (_, prop, value) => {
      INI[prop] = value;
      return true;
    },
  }
);
