import { getAttr } from '../../utils/KBinJSON';
import { EamuseModuleContainer } from '../EamuseModuleContainer';

export const cardmng = new EamuseModuleContainer();

const ProfileCheck: {
  [key: string]: () => boolean;
} = {};

export function AddProfileCheck(gameCode: string, handler: () => boolean) {
  if (!ProfileCheck[gameCode]) ProfileCheck[gameCode] = handler;
}

export function RemoveProfileCheck(gameCode: string) {
  delete ProfileCheck[gameCode];
}

cardmng.add('*', 'cardmng.inquire', async (info, data, send) => {
  const model: string = info.model;
  const modelCode = model.split(':')[0] || 'NUL';
  await send.object({
    '@attr': {
      binded: (ProfileCheck[modelCode] || (() => false))() ? 1 : 0, // Has profile in game
      dataid: 'DEADC0DEFEEDBEEF', // Player.dataID
      ecflag: 1, // Is currency card
      expired: 0, // Is expired, if true will treat as new card
      newflag: 0,
      refid: 'DEADC0DEFEEDBEEF', // Player.dataID as well
    },
  });

  return;
});

cardmng.add('*', 'cardmng.getrefid', async (info, data, send) => {
  await send.object({ '@attr': { dataid: 'DEADC0DEFEEDBEEF', refid: 'DEADC0DEFEEDBEEF' } });
  return;
});

cardmng.add('*', 'cardmng.authpass', async (info, data, send) => {
  // Right password
  await send.success();
});

cardmng.add('*', 'cardmng.bindmodel', async (info, data, send) => {
  await send.object({ '@attr': { dataid: 'DEADC0DEFEEDBEEF' } });
});
