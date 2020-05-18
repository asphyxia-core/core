import { Router } from 'express';
import { existsSync, readFileSync } from 'fs';
import session from 'express-session';
import flash from 'connect-flash';
import { VERSION } from '../utils/Consts';
import { CONFIG_MAP, CONFIG_DATA, CONFIG, CONFIG_OPTIONS, SaveConfig } from '../utils/ArgConfig';
import { get } from 'lodash';
import { Converter } from 'showdown';
import { ReadAssets, PLUGIN_PATH } from '../utils/EamuseIO';
import { urlencoded } from 'body-parser';
import { Logger } from '../utils/Logger';
import humanize from 'humanize-string';
import path from 'path';
import { ROOT_CONTAINER } from '../eamuse/index';

export const webui = Router();
const md = new Converter({
  headerLevelStart: 3,
  strikethrough: true,
  tables: true,
  tasklists: true,
});

function data(title: string, attr?: any) {
  return {
    title,
    version: VERSION,
    plugins: ROOT_CONTAINER.Plugins.map(p => p.Name),
    ...attr,
  };
}

function validate(c: CONFIG_OPTIONS, current: any) {
  if (c.validator) {
    const msg = c.validator(current);
    if (typeof msg == 'string') {
      return msg.length == 0 ? 'Invalid value' : msg;
    }
  }

  if (c.range) {
    if (c.type == 'float' || c.type == 'integer') {
      if (current < c.range[0] || current > c.range[1]) {
        return `Value must be in between ${c.range[0]} and ${c.range[1]}.`;
      }
    }
  }

  if (c.options) {
    if (c.type == 'string') {
      if (c.options.indexOf(current) < 0) {
        return `Please select an option.`;
      }
    }
  }

  return null;
}

function configData(plugin: string) {
  const config: CONFIG_DATA[] = [];
  const configMap = CONFIG_MAP[plugin];
  const configData = plugin == 'core' ? CONFIG : CONFIG[plugin];

  if (!configMap || !configData) {
    return [];
  }

  if (configMap) {
    for (const [key, c] of configMap) {
      const name = get(c, 'name', humanize(key));
      const current = get(configData, key, c.default);
      let error = validate(c, current);

      config.push({
        key,
        ...c,
        current,
        name,
        error,
      });
    }
  }
  return config;
}

webui.use(
  session({
    secret: 'c0dedeadc0debeef',
    resave: true,
  })
);

webui.use(flash());

webui.get('/favicon.ico', async (req, res) => {
  res.redirect('/static/favicon.ico');
});

webui.get('/', async (req, res) => {
  const memory = `${(process.memoryUsage().rss / 1048576).toFixed(2)}MB`;
  const config = configData('core');

  const changelog = md.makeHtml(ReadAssets('changelog.md'));
  const formMessage = req.flash('form');
  res.render('index', data('Dashboard', { memory, config, changelog, formMessage }));
});

webui.post('*', urlencoded({ extended: true }), async (req, res) => {
  const page = req.query.page;
  let plugin: string = null;
  if (req.path == '/') {
    plugin = 'core';
  } else if (req.path.startsWith('/plugin/')) {
    plugin = path.basename(req.path);
  }

  if (plugin == null) {
    res.redirect(req.originalUrl);
    return;
  }

  if (page) {
    // Custom page form
  } else {
    const configMap = CONFIG_MAP[plugin];
    const configData = plugin == 'core' ? CONFIG : CONFIG[plugin];

    if (configMap == null || configData == null) {
      res.redirect(req.originalUrl);
      return;
    }

    let needRestart = false;

    for (const [key, config] of configMap) {
      const current = configData[key];
      if (config.type == 'boolean') {
        configData[key] = req.body[key] ? true : false;
      }
      if (config.type == 'float') {
        configData[key] = parseFloat(req.body[key]);
        if (isNaN(configData[key])) {
          configData[key] = config.default;
        }
      }
      if (config.type == 'integer') {
        configData[key] = parseInt(req.body[key]);
        if (isNaN(configData[key])) {
          configData[key] = config.default;
        }
      }
      if (config.type == 'string') {
        configData[key] = req.body[key];
      }

      if (current !== configData[key]) {
        if (!validate(config, configData[key])) {
          if (config.onchange) {
            config.onchange(key, configData[key]).catch(err => {
              Logger.error(err, { plugin });
            });
          }

          if (config.needRestart) {
            needRestart = true;
          }
        }
      }
    }

    if (needRestart) {
      req.flash('form', 'Some settings require a restart to be applied.');
    }

    SaveConfig();
  }

  res.redirect(req.originalUrl);
});

webui.get('/profiles', async (req, res) => {
  res.render('index', data('Profiles'));
});

webui.get('/about', async (req, res) => {
  const contributors = new Map<string, { name: string; link?: string }>();
  for (const plugin of ROOT_CONTAINER.Plugins) {
    for (const c of plugin.Contributors) {
      contributors.set(c.name, c);
    }
  }
  res.render('about', data('About', { contributors: Array.from(contributors.values()) }));
});

webui.get('/plugin/:plugin', async (req, res) => {
  const pluginName = req.params['plugin'];

  const readmePath = path.join(PLUGIN_PATH, pluginName, 'README.md');
  let readme = null;
  try {
    if (existsSync(readmePath)) {
      readme = md.makeHtml(readFileSync(readmePath, { encoding: 'utf-8' }));
    }
  } catch {
    readme = null;
  }

  const config = configData(pluginName);
  const plugin = ROOT_CONTAINER.getPluginByName(pluginName);
  const contributors = plugin ? plugin.Contributors : [];
  const gameCodes = plugin ? plugin.GameCodes : [];

  res.render('plugin', data(pluginName.toUpperCase(), { readme, config, contributors, gameCodes }));
});
