import { Router, RequestHandler, Request } from 'express';
import { existsSync, readFileSync } from 'fs';
import session from 'express-session';
import cookies from 'cookie-parser';
import createMemoryStore from 'memorystore';
import flash from 'connect-flash';
import { VERSION } from '../utils/Consts';
import {
  CONFIG_MAP,
  CONFIG_DATA,
  CONFIG,
  CONFIG_OPTIONS,
  SaveConfig,
  ARGS,
  DATAFILE_MAP,
  FILE_CHECK,
} from '../utils/ArgConfig';
import { get, isEmpty } from 'lodash';
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
  APIFind,
  APIRemove,
  PluginStats,
  PurgePlugin,
  APIFindOne,
  APIInsert,
  APIUpdate,
  APIUpsert,
  APICount,
} from '../utils/EamuseIO';
import { urlencoded, json } from 'body-parser';
import path from 'path';
import { ROOT_CONTAINER } from '../eamuse/index';
import { fun } from './fun';
import { card2nfc, nfc2card, cardType } from '../utils/CardCipher';
import { groupBy, startCase, lowerCase, upperFirst } from 'lodash';
import { sizeof } from 'sizeof';
import { ajax as emit } from './emit';
import { Logger } from '../utils/Logger';

const memorystore = createMemoryStore(session);

export const webui = Router();
webui.use(
  session({
    cookie: { maxAge: 300000, sameSite: true },
    secret: 'c0dedeadc0debeef',
    resave: true,
    saveUninitialized: false,
    store: new memorystore({ checkPeriod: 300000 }),
  })
);
webui.use(cookies());

webui.use(flash());
let wrap = (fn: RequestHandler) => (...args: any[]) => (fn as any)(...args).catch(args[2]);

webui.use('/fun', fun);
webui.use('/', emit);

const markdown = new Converter({
  headerLevelStart: 3,
  strikethrough: true,
  tables: true,
  tasklists: true,
});

function data(req: Request, title: string, plugin: string, attr?: any) {
  const formOk = req.flash('formOk');
  const formWarn = req.flash('formWarn');
  const aside = req.cookies.asidemenu == 'true';

  let formMessage = null;
  if (formOk.length > 0) {
    formMessage = { danger: false, message: formOk.join(' ') };
  } else if (formWarn.length > 0) {
    formMessage = { danger: true, message: formWarn.join(' ') };
  }

  return {
    title,
    aside,
    plugin,
    local: req.ip == '127.0.0.1' || req.ip == '::1',
    version: VERSION,
    formMessage,
    plugins: ROOT_CONTAINER.Plugins.map(p => {
      return {
        name: p.Name,
        id: p.Identifier,
        webOnly: p.GameCodes.length == 0,
        pages: p.Pages.map(f => ({ name: startCase(f), link: f })),
      };
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

function ConfigData(plugin: string) {
  const config: CONFIG_DATA[] = [];
  const configMap = CONFIG_MAP[plugin];
  const configData = plugin == 'core' ? CONFIG : CONFIG[plugin];

  if (!configMap || !configData) {
    return [];
  }

  if (configMap) {
    for (const [key, c] of configMap) {
      const name = get(c, 'name', upperFirst(lowerCase(key)));
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

function DataFileCheck(plugin: string) {
  const files: FILE_CHECK[] = [];
  const fileMap = DATAFILE_MAP[plugin];

  if (!fileMap) {
    return [];
  }

  for (const [filepath, c] of fileMap) {
    const target = path.resolve(PLUGIN_PATH, plugin, filepath);
    const filename = path.basename(target);
    const uploaded = existsSync(target);
    const config = { ...c };
    if (!c.name) {
      config.name = filename;
    }
    files.push({ ...config, path: filepath, uploaded, filename });
  }

  return files;
}

webui.get('/favicon.ico', async (req, res) => {
  res.redirect('/static/favicon.ico');
});

webui.get(
  '/',
  wrap(async (req, res) => {
    const memory = `${(process.memoryUsage().rss / 1048576).toFixed(2)}MB`;
    const config = ConfigData('core');

    const changelog = markdown.makeHtml(ReadAssets('changelog.md'));

    const profiles = await GetProfileCount();
    res.render('index', data(req, 'Dashboard', 'core', { memory, config, changelog, profiles }));
  })
);

webui.get(
  '/profiles',
  wrap(async (req, res) => {
    const profiles = (await GetProfiles()) || [];
    for (const profile of profiles) {
      profile.cards = await Count({ __s: 'card', __refid: profile.__refid });
    }
    res.render('profiles', data(req, 'Profiles', 'core', { profiles }));
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

    res.render(
      'profiles_profile',
      data(req, 'Profiles', 'core', { profile, subtitle: profile.name })
    );
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
  json({ limit: '50mb' }),
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
  urlencoded({ extended: true, limit: '50mb' }),
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

// Data Management
webui.get(
  '/data',
  wrap(async (req, res) => {
    const pluginStats = await PluginStats();
    const installed = ROOT_CONTAINER.Plugins.map(p => p.Identifier);
    res.render(
      'data',
      data(req, 'Data Management', 'core', { pluginStats, installed, dev: ARGS.dev })
    );
  })
);

webui.get(
  '/data/:plugin',
  wrap(async (req, res, next) => {
    if (!ARGS.dev) {
      next();
      return;
    }
    const pluginID = req.params['plugin'];

    res.render('data_plugin', data(req, 'Data Management', 'core', { subtitle: pluginID }));
  })
);

webui.post(
  '/data/db',
  json({ limit: '50mb' }),
  wrap(async (req, res, next) => {
    if (!ARGS.dev) {
      next();
      return;
    }
    const command = req.body.command;
    const args = req.body.args;
    const plugin = req.body.plugin;

    try {
      switch (command) {
        case 'FindOne':
          res.json(await (APIFindOne as any)({ name: plugin, core: false }, ...args));
          break;
        case 'Find':
          res.json(await (APIFind as any)({ name: plugin, core: false }, ...args));
          break;
        case 'Insert':
          res.json(await (APIInsert as any)({ name: plugin, core: false }, ...args));
          break;
        case 'Remove':
          res.json(await (APIRemove as any)({ name: plugin, core: false }, ...args));
          break;
        case 'Update':
          res.json(await (APIUpdate as any)({ name: plugin, core: false }, ...args));
          break;
        case 'Upsert':
          res.json(await (APIUpsert as any)({ name: plugin, core: false }, ...args));
          break;
        case 'Count':
          res.json(await (APICount as any)({ name: plugin, core: false }, ...args));
          break;
      }
    } catch (err) {
      res.json({ error: err.toString() });
    }
  })
);

webui.delete(
  '/data/:plugin',
  wrap(async (req, res) => {
    const pluginID = req.params['plugin'];
    if (pluginID && pluginID.length > 0) await PurgePlugin(pluginID);

    const plugin = ROOT_CONTAINER.getPluginByID(pluginID);
    if (plugin) {
      // Re-register for init data
      try {
        plugin.Register();
      } catch (err) {
        Logger.error(err, { plugin: pluginID });
      }
    }
    res.sendStatus(200);
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
    res.render(
      'about',
      data(req, 'About', 'core', { contributors: Array.from(contributors.values()) })
    );
  })
);

// Plugin Overview
webui.get(
  '/plugin/:plugin',
  wrap(async (req, res, next) => {
    const plugin = ROOT_CONTAINER.getPluginByID(req.params['plugin']);

    if (!plugin) {
      return next();
    }

    const readmePath = path.join(PLUGIN_PATH, plugin.Identifier, 'README.md');
    let readme = null;
    try {
      if (existsSync(readmePath)) {
        readme = markdown.makeHtml(readFileSync(readmePath, { encoding: 'utf-8' }));
      }
    } catch {
      readme = null;
    }

    const config = ConfigData(plugin.Identifier);
    const datafile = DataFileCheck(plugin.Identifier);
    const contributors = plugin ? plugin.Contributors : [];
    const gameCodes = plugin ? plugin.GameCodes : [];

    res.render(
      'plugin',
      data(req, plugin.Name, plugin.Identifier, {
        readme,
        config,
        datafile,
        contributors,
        gameCodes,
        subtitle: 'Overview',
        subidentifier: 'overview',
      })
    );
  })
);

webui.delete(
  '/plugin/:plugin/profile/:refid',
  wrap(async (req, res) => {
    const plugin = ROOT_CONTAINER.getPluginByID(req.params['plugin']);

    if (!plugin) {
      return res.sendStatus(404);
    }

    const refid = req.params['refid'];
    if (!refid || refid.length < 0) {
      return res.sendStatus(400);
    }

    if (await APIRemove({ name: plugin.Identifier, core: true }, refid, {})) {
      return res.sendStatus(200);
    } else {
      return res.sendStatus(404);
    }
  })
);

// Plugin statics
webui.get(
  '/plugin/:plugin/static/*',
  wrap(async (req, res, next) => {
    const data = req.params[0];

    if (data.startsWith('.')) {
      return next();
    }

    const plugin = ROOT_CONTAINER.getPluginByID(req.params['plugin']);

    if (!plugin) {
      return next();
    }

    const file = path.join(PLUGIN_PATH, plugin.Identifier, 'webui', data);

    res.sendFile(file, {}, err => {
      if (err) {
        next();
      }
    });
  })
);

// Plugin Profiles
webui.get(
  '/plugin/:plugin/profiles',
  wrap(async (req, res, next) => {
    const plugin = ROOT_CONTAINER.getPluginByID(req.params['plugin']);

    if (!plugin) {
      return next();
    }

    const profiles = groupBy(
      await APIFind({ name: plugin.Identifier, core: true }, null, {}),
      '__refid'
    );

    const profileData: any[] = [];
    for (const refid in profiles) {
      let name = undefined;
      for (const doc of profiles[refid]) {
        if (doc.__refid == null) {
          PurgeProfile(doc.__refid);
          break;
        }
        if (typeof doc.name == 'string') {
          name = doc.name;
          break;
        }
      }

      profileData.push({
        refid,
        name,
        dataSize: sizeof(profiles[refid], true),
        coreProfile: await FindProfile(refid),
      });
    }

    res.render(
      'plugin_profiles',
      data(req, plugin.Name, plugin.Identifier, {
        subtitle: 'Profiles',
        subidentifier: 'profiles',
        hasCustomPage: plugin.FirstProfilePage != null,
        profiles: profileData,
      })
    );
  })
);

// Plugin Profile Page
webui.get(
  '/plugin/:plugin/profile',
  wrap(async (req, res, next) => {
    const plugin = ROOT_CONTAINER.getPluginByID(req.params['plugin']);

    if (!plugin) {
      return next();
    }

    const refid = req.query['refid'];

    if (refid == null) {
      return next();
    }

    const pageName = req.query['page'];

    let page = null;
    if (pageName == null) {
      page = plugin.FirstProfilePage;
    } else {
      page = `profile_${pageName.toString()}`;
    }

    const content = await plugin.render(page, { query: req.query }, refid.toString());
    if (content == null) {
      return next();
    }

    const tabs = plugin.ProfilePages.map(p => ({
      name: startCase(p.substr(8)),
      link: p.substr(8),
    }));

    res.render(
      'custom_profile',
      data(req, plugin.Name, plugin.Identifier, {
        content,
        tabs,
        subtitle: 'Profiles',
        subidentifier: 'profiles',
        subsubtitle: startCase(page.substr(8)),
        subsubidentifier: page.substr(8),
        refid: refid.toString(),
      })
    );
  })
);

// Plugin Custom Pages
webui.get(
  '/plugin/:plugin/:page',
  wrap(async (req, res, next) => {
    const plugin = ROOT_CONTAINER.getPluginByID(req.params['plugin']);

    if (!plugin) {
      return next();
    }

    const pageName = req.params['page'];

    const content = await plugin.render(pageName, { query: req.query });
    if (content == null) {
      return next();
    }

    res.render(
      'custom',
      data(req, plugin.Name, plugin.Identifier, {
        content,
        subtitle: startCase(pageName),
        subidentifier: pageName,
      })
    );
  })
);

// General setting update
webui.post(
  '*',
  urlencoded({ extended: true, limit: '50mb' }),
  wrap(async (req, res) => {
    const page = req.query.page;

    if (isEmpty(req.body)) {
      res.sendStatus(400);
      return;
    }

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

// 404
webui.use(async (req, res, next) => {
  return res.status(404).render('404', data(req, '404 - Are you lost?', 'core'));
});

// 500 - Any server error
webui.use((err: any, req: any, res: any, next: any) => {
  return res.status(500).render('500', data(req, '500 - Oops', 'core', { err }));
});
