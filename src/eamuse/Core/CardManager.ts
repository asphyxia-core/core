import { EamuseRouteContainer } from '../EamuseRouteContainer';
import { padStart, get, toSafeInteger, toString } from 'lodash';
import { Logger } from '../../utils/Logger';
import { SAFEHEX } from '../../utils/Consts';

export const cardmng = new EamuseRouteContainer();

const ProfileCheck: {
  [key: string]: () => boolean;
} = {};

const PROFILE_QUEUE = Array(1024).fill(-1);
let PROFILE_QUEUE_INDEX = 0;

function toRefID(id: number) {
  return SAFEHEX + padStart(id.toString(16).toUpperCase(), 8, '0');
}

function toQueueIndex(ref: string) {
  if (ref == null) return -1;
  const result = parseInt(ref.substr(8), 16);
  if (isNaN(result)) {
    return -1;
  } else {
    return result;
  }
}

export function getProfileFromRef(ref: string) {
  const index = toQueueIndex(ref);
  if (index < 0 || index >= 1024) return null;
  if (PROFILE_QUEUE[index] < 0) return null;
  return padStart(PROFILE_QUEUE[index].toString(), 4, '0');
}

export function AddProfileCheck(gameCode: string, handler: () => boolean): boolean {
  if (!ProfileCheck[gameCode]) {
    ProfileCheck[gameCode] = handler;
    return true;
  } else {
    return false;
  }
}

export function RemoveProfileCheck(gameCode: string) {
  delete ProfileCheck[gameCode];
}

cardmng.add('cardmng.inquire', async (info, data, send) => {
  const model: string = info.model;
  const modelCode = model.split(':')[0] || 'NUL';

  const refid = toRefID(PROFILE_QUEUE_INDEX++);
  if (PROFILE_QUEUE_INDEX >= 1024) {
    PROFILE_QUEUE_INDEX = 0;
  }

  await send.object({
    '@attr': {
      binded: (ProfileCheck[modelCode] || (() => false))() ? 1 : 0, // Has profile in game
      dataid: refid, // Player.dataID
      ecflag: 1, // Is currency card
      expired: 0, // Is expired, if true will treat as new card
      newflag: 0,
      refid: refid, // Player.dataID as well
    },
  });

  return;
});

cardmng.add('cardmng.getrefid', async (info, data, send) => {
  const refid = toRefID(PROFILE_QUEUE_INDEX++);
  if (PROFILE_QUEUE_INDEX >= 1024) {
    PROFILE_QUEUE_INDEX = 0;
  }

  await send.object({ '@attr': { dataid: refid, refid: refid } });
  return;
});

cardmng.add('cardmng.authpass', async (info, data, send) => {
  const refid = toQueueIndex(get(data, '@attr.refid', null));
  const pass = toSafeInteger(get(data, '@attr.pass', '0000'));

  if (refid >= 0) {
    PROFILE_QUEUE[refid] = pass;
  }
  Logger.debug(`profile mapped: ${refid} -> ${pass}`);
  // Right password
  await send.success();
});

cardmng.add('cardmng.bindmodel', async (info, data, send) => {
  const refid = get(data, '@attr.refid', 'DEADC0DEFEEDBEEF');
  await send.object({ '@attr': { dataid: refid } });
});
