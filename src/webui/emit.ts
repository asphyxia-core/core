import { Router } from 'express';
import { urlencoded, json } from 'body-parser';
import { ROOT_CONTAINER } from '../eamuse/index';
import { Logger } from '../utils/Logger';
import multer from 'multer';
import { WriteFile, DeleteFile } from '../utils/EamuseIO';
import { DATAFILE_MAP } from '../utils/ArgConfig';

export const ajax = Router();

ajax.post(
  '/emit/:event',
  urlencoded({ extended: true, limit: '50mb' }),
  json({ limit: '50mb' }),
  async (req, res) => {
    if (!req.headers.referer) {
      res.sendStatus(400);
      return;
    }

    const match = req.headers.referer.match(/\/plugin\/([^\/]*)(?:\/.*)*$/);
    if (!match) {
      res.sendStatus(400);
      return;
    }

    const plugin = ROOT_CONTAINER.getPluginByID(match[1]);
    if (!plugin) {
      res.sendStatus(404);
      return;
    }

    const event = req.params.event;

    try {
      await plugin.CallEvent(event, req.body);
    } catch (err) {
      Logger.error(`WebUIEvent Error: ${event}`);
      Logger.error(err, { plugin: plugin.Identifier });
      res.status(500).send(err);
      return;
    }

    res.redirect(req.headers.referer);
  }
);

var storage = multer.memoryStorage();
var upload = multer({ storage: storage });
// File upload
ajax.post('/upload/:path', upload.single('upload'), async (req, res) => {
  if (!req.headers.referer) {
    res.sendStatus(400);
    return;
  }

  const match = req.headers.referer.match(/\/plugin\/([^\/]*)(?:\/.*)*$/);
  if (!match) {
    res.sendStatus(400);
    return;
  }

  const plugin = ROOT_CONTAINER.getPluginByID(match[1]);
  if (!plugin) {
    res.sendStatus(404);
    return;
  }

  const path = req.params.path;
  if (DATAFILE_MAP[plugin.Identifier] && DATAFILE_MAP[plugin.Identifier].has(path)) {
    WriteFile({ name: plugin.Identifier, core: true }, path, req.file.buffer, { encoding: null });

    res.sendStatus(200);
  } else {
    res.sendStatus(400);
  }
});

ajax.delete('/upload/:path', upload.single('upload'), async (req, res) => {
  if (!req.headers.referer) {
    res.sendStatus(400);
    return;
  }

  const match = req.headers.referer.match(/\/plugin\/([^\/]*)(?:\/.*)*$/);
  if (!match) {
    res.sendStatus(400);
    return;
  }

  const plugin = ROOT_CONTAINER.getPluginByID(match[1]);
  if (!plugin) {
    res.sendStatus(404);
    return;
  }

  const path = req.params.path;
  if (DATAFILE_MAP[plugin.Identifier] && DATAFILE_MAP[plugin.Identifier].has(path)) {
    try {
      await DeleteFile({ name: plugin.Identifier, core: true }, path);
      res.sendStatus(200);
    } catch {
      res.sendStatus(500);
    }
  } else {
    res.sendStatus(400);
  }
});
