import { set } from 'lodash';

import { kitem } from '../../utils/KBinJSON';
import { EamusePluginContainer } from '../EamusePluginContainer';

export const eacoin = new EamusePluginContainer();

eacoin.add('*', 'eacoin.checkout', async (info, data, send) => {
  await send.success();
  return;
});

eacoin.add('*', 'eacoin.checkin', async (info, data, send) => {
  const result = {};

  set(result, 'balance', kitem('s32', 88410));
  set(result, 'sessid', kitem('str', 'DEADC0DEFEEDBEEF'));
  set(result, 'acstatus', kitem('u8', 0));
  set(result, 'sequence', kitem('s16', 1));
  set(result, 'acid', kitem('str', 'DEADC0DEFEEDBEEF'));
  set(result, 'acname', kitem('str', 'DEADC0DEFEEDBEEF'));

  await send.object(result);
  return;
});

eacoin.add('*', 'eacoin.consume', async (info, data, send) => {
  const result = {};

  set(result, 'autocharge', kitem('u8', 0));
  set(result, 'acstatus', kitem('u8', 0));
  set(result, 'balance', kitem('s32', 88410));

  await send.object(result);
  return;
});
