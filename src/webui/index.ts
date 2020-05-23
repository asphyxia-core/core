import { Router, RequestHandler, Request } from 'express';
import { existsSync, readFileSync } from 'fs';
import session from 'express-session';
import createMemoryStore from 'memorystore';
import flash from 'connect-flash';
import { VERSION } from '../utils/Consts';
import { CONFIG_MAP, CONFIG_DATA, CONFIG, CONFIG_OPTIONS, SaveConfig } from '../utils/ArgConfig';
import { get } from 'lodash';
import { Converter } from 'showdown';
import {
  ReadAssets,
  PLUGIN_PATH,
  GetProfileCount,
  GetProfiles,
  FindCardsByRefid,
  Count,
  FindProfile,
  PurgeProfile,
  UpdateProfile,
  CreateCard,
  FindCard,
  DeleteCard,
} from '../utils/EamuseIO';
import { urlencoded, json } from 'body-parser';
import { Logger } from '../utils/Logger';
import humanize from 'humanize-string';
import path from 'path';
import { ROOT_CONTAINER } from '../eamuse/index';
import { fun } from './fun';
import { card2nfc, nfc2card, cardType } from '../utils/CardCipher';

const memorystore = createMemoryStore(session);

export const webui = Router();
const markdown = new Converter({
  headerLevelStart: 3,
  strikethrough: true,
  tables: true,
  tasklists: true,
});

function data(req: Request, title: string, attr?: any) {
  const formOk = req.flash('formOk');
  const formWarn = req.flash('formWarn');

  let formMessage = null;
  if (formOk.length > 0) {
    formMessage = { danger: false, message: formOk.join(' ') };
  } else if (formWarn.length > 0) {
    formMessage = { danger: true, message: formWarn.join(' ') };
  }

  return {
    title,
    local: req.ip == '127.0.0.1' || req.ip == '::1',
    version: VERSION,
    formMessage,
    plugins: ROOT_CONTAINER.Plugins.map(p => {
      return { name: p.Name, id: p.Identifier };
    }),
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
    cookie: { maxAge: 300000 },
    secret: 'c0dedeadc0debeef',
    resave: true,
    saveUninitialized: false,
    store: new memorystore({ checkPeriod: 300000 }),
  })
);

webui.use(flash());

let wrap = (fn: RequestHandler) => (...args: any[]) => (fn as any)(...args).catch(args[2]);

webui.get('/favicon.ico', async (req, res) => {
  res.redirect('/static/favicon.ico');
});

webui.get(
  '/',
  wrap(async (req, res) => {
    const memory = `${(process.memoryUsage().rss / 1048576).toFixed(2)}MB`;
    const config = configData('core');

    const changelog = markdown.makeHtml(ReadAssets('changelog.md'));

    const profiles = await GetProfileCount();
    res.render('index', data(req, 'Dashboard', { memory, config, changelog, profiles }));
  })
);

webui.get(
  '/profiles',
  wrap(async (req, res) => {
    const profiles = await GetProfiles();
    for (const profile of profiles) {
      profile.cards = await Count({ __reserved_field: 'card', refid: profile.refid });
    }
    res.render('profiles', data(req, 'Profiles', { profiles }));
  })
);

webui.delete(
  '/profile/:refid',
  wrap(async (req, res) => {
    const refid = req.params['refid'];

    if (await PurgeProfile(refid)) {
      return res.sendStatus(200);
    } else {
      return res.sendStatus(404);
    }
  })
);

webui.get(
  '/profile/:refid',
  wrap(async (req, res, next) => {
    const refid = req.params['refid'];

    const profile = await FindProfile(refid);
    if (!profile) {
      return next();
    }

    profile.cards = await FindCardsByRefid(refid);
    res.render('profiles_profile', data(req, 'Profiles', { profile, subtitle: profile.name }));
  })
);

webui.delete(
  '/card/:cid',
  wrap(async (req, res) => {
    const cid = req.params['cid'];

    if (await DeleteCard(cid)) {
      return res.sendStatus(200);
    } else {
      return res.sendStatus(404);
    }
  })
);

webui.post(
  '/profile/:refid/card',
  json(),
  wrap(async (req, res) => {
    const refid = req.params['refid'];
    const card = req.body.cid;

    try {
      const cid = card;
      const print = nfc2card(cid);

      if (!(await FindCard(cid))) {
        await CreateCard(cid, refid, print);
      }
    } catch {}

    try {
      const print = card
        .toUpperCase()
        .trim()
        .replace(/[\s\-]/g, '')
        .replace(/O/g, '0')
        .replace(/I/g, '1');
      const cid = card2nfc(print);
      if (cardType(cid) >= 0 && !(await FindCard(cid))) {
        await CreateCard(cid, refid, print);
      }
    } catch {}

    res.sendStatus(200);
  })
);

webui.post(
  '/profile/:refid',
  urlencoded({ extended: true }),
  wrap(async (req, res) => {
    const refid = req.params['refid'];
    const update: any = {};
    if (req.body.pin) {
      update.pin = req.body.pin;
    }
    if (req.body.name) {
      update.name = req.body.name;
    }

    await UpdateProfile(refid, update);
    req.flash('formOk', 'Updated');
    res.redirect(req.originalUrl);
  })
);

webui.get(
  '/data',
  wrap(async (req, res) => {
    const contributors = new Map<string, { name: string; link?: string }>();
    for (const plugin of ROOT_CONTAINER.Plugins) {
      for (const c of plugin.Contributors) {
        contributors.set(c.name, c);
      }
    }
    res.render(
      'data',
      data(req, 'Data Management', { contributors: Array.from(contributors.values()) })
    );
  })
);

webui.get(
  '/about',
  wrap(async (req, res) => {
    const contributors = new Map<string, { name: string; link?: string }>();
    for (const plugin of ROOT_CONTAINER.Plugins) {
      for (const c of plugin.Contributors) {
        contributors.set(c.name, c);
      }
    }
    res.render('about', data(req, 'About', { contributors: Array.from(contributors.values()) }));
  })
);

webui.get(
  '/plugin/:plugin',
  wrap(async (req, res, next) => {
    const pluginName = req.params['plugin'];
    const plugin = ROOT_CONTAINER.getPluginByName(pluginName);

    if (!plugin) {
      return next();
    }

    const readmePath = path.join(PLUGIN_PATH, pluginName, 'README.md');
    let readme = null;
    try {
      if (existsSync(readmePath)) {
        readme = markdown.makeHtml(readFileSync(readmePath, { encoding: 'utf-8' }));
      }
    } catch {
      readme = null;
    }

    const config = configData(pluginName);
    const contributors = plugin ? plugin.Contributors : [];
    const gameCodes = plugin ? plugin.GameCodes : [];

    const name = pluginName.split('@')[0].toUpperCase();
    res.render(
      'plugin',
      data(req, name, {
        plugin: pluginName,
        readme,
        config,
        contributors,
        gameCodes,
        subtitle: 'Overview',
      })
    );
  })
);

// General setting update
webui.post(
  '*',
  urlencoded({ extended: true }),
  wrap(async (req, res) => {
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
        req.flash('formWarn', 'Some settings require a restart to be applied.');
      } else {
        req.flash('formOk', 'Updated');
      }

      SaveConfig();
    }

    res.redirect(req.originalUrl);
  })
);

webui.use('/fun', fun);

// 404
webui.use(async (req, res, next) => {
  return res.status(404).render('404', data(req, '404 - Are you lost?'));
});

// 500 - Any server error
webui.use((err: any, req: any, res: any, next: any) => {
  return res.status(500).render('500', data(req, '500 - Oops', { err }));
});
