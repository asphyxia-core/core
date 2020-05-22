import { EamuseRouteContainer } from '../EamuseRouteContainer';
import { get } from 'lodash';
import {
  FindCard,
  GetProfileCount,
  FindProfile,
  CreateProfile,
  BindProfile,
  DeleteCard,
  CreateCard,
  UpdateProfile,
} from '../../utils/EamuseIO';

export const cardmng = new EamuseRouteContainer();

// const CARD_CACHE: {
//   [cid: string]: string;
// } = {};

cardmng.add('cardmng.inquire', async (info, data, send) => {
  const cid: string = get(data, '@attr.cardid');

  // let refid = CARD_CACHE[cid];

  const card = await FindCard(cid);

  if (!card) {
    const profileCount = await GetProfileCount();
    if (profileCount < 0 || profileCount >= 16) {
      // Refuse to create new account
      return send.status(110);
    }

    // Create new account
    return send.status(112);
  }

  const profile = await FindProfile(card.refid);
  if (!profile) {
    await DeleteCard(cid);
    return send.status(112);
  }

  if (profile.pin === 'unset') {
    // need update pin
    return send.status(112);
  }

  send.object({
    '@attr': {
      binded: profile.models.indexOf(info.gameCode) >= 0,
      dataid: card.refid,
      ecflag: 1,
      expired: 0,
      newflag: 0,
      refid: card.refid,
    },
  });

  return;
});

cardmng.add('cardmng.getrefid', async (info, data, send) => {
  const cid: string = get(data, '@attr.cardid');
  const pin: string = get(data, '@attr.passwd');

  const card = await FindCard(cid);
  if (card) {
    // Card exists, update profile pin
    const updated = await UpdateProfile(card.refid, { pin }, true);
    if (updated) {
      await BindProfile(card.refid, info.gameCode);
      return send.object({ '@attr': { dataid: card.refid, refid: card.refid } });
    } else {
      return send.deny();
    }
  }

  const newProfile = await CreateProfile(pin, info.gameCode);
  if (!newProfile) {
    // Creation Failed
    return send.deny();
  }

  const refid = newProfile.refid;

  const newCard = await CreateCard(cid, refid);
  if (!newCard) {
    // Creation Failed
    return send.deny();
  }

  send.object({ '@attr': { dataid: refid, refid } });
  return;
});

cardmng.add('cardmng.authpass', async (info, data, send) => {
  const refid = get(data, '@attr.refid', null);
  const pass = get(data, '@attr.pass', '-1');

  const profile = await FindProfile(refid);

  if (!profile) {
    return send.status(110);
  }

  if (profile.pin !== pass) {
    return send.status(116);
  }

  // Right password
  send.success();
});

cardmng.add('cardmng.bindmodel', async (info, data, send) => {
  const refid = get(data, '@attr.refid', 'DEADC0DEFEEDBEEF');

  await BindProfile(refid, info.gameCode);
  send.object({ '@attr': { dataid: refid } });
});
