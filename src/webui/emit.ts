import { Router } from 'express';
import { urlencoded, json } from 'body-parser';
import { ROOT_CONTAINER } from '../eamuse/index';

export const emit = Router();

emit.post('/:event', urlencoded({ extended: true }), json(), async (req, res) => {
  if (!req.headers.referer) {
    res.sendStatus(400);
    return;
  }

  const match = req.headers.referer.match(/\/plugin\/([^\/]*)\//);
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
    res.status(500).send(err);
    return;
  }

  res.redirect(req.headers.referer);
});
