import { Router } from 'express';
import { VERSION } from '../utils/Consts';
import { LOADED_PLUGINS } from '../eamuse/ExternalPluginLoader';

export const webui = Router();
function data(title: string, attr?: any) {
  return {
    title,
    version: VERSION,
    plugins: Array.from(LOADED_PLUGINS.keys()),
    ...attr,
  };
}

webui.get('/favicon.ico', async (req, res) => {
  res.redirect('/static/favicon.ico');
});

webui.get('/', async (req, res) => {
  const memory = `${(process.memoryUsage().rss / 1048576).toFixed(2)}MB`;
  res.render('index', data('Dashboard', { memory }));
});

webui.get('/profiles', async (req, res) => {
  res.render('index', data('Profiles'));
});

webui.get('/settings', async (req, res) => {
  res.render('index', data('Settings'));
});

webui.get('/about', async (req, res) => {
  const contributors = new Map<string, { name: string; link?: string }>();
  for (const [, plugin] of LOADED_PLUGINS) {
    for (const c of plugin.contributors) {
      contributors.set(c.name, c);
    }
  }
  res.render('about', data('About', { contributors: Array.from(contributors.values()) }));
});

webui.get('/plugin/:plugin', async (req, res) => {
  const pluginName = req.params['plugin'].toUpperCase();

  res.render('index', data(pluginName));
});
