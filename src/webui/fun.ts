import { Router } from 'express';
import open from 'open';
import { PLUGIN_PATH } from '../utils/EamuseIO';

export const fun = Router();

fun.get('/open-plugins', async (req, res) => {
  if (req.ip == '127.0.0.1' || req.ip == '::1') {
    open(PLUGIN_PATH);
  }
  res.sendStatus(200);
});

fun.get('/ping', async (req, res) => {
  res.json('pong');
});

fun.get('/shutdown', async (req, res) => {
  process.exit(0);
});
