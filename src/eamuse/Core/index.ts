import { cardmng } from './CardManager';
import { eacoin } from './EamuseCoin';
import { facility } from './Facility';
import { pcbtracker } from './PCBTracker';
import { kitem } from '../../utils/KBinJSON';
import { EamuseRouteContainer } from '../EamuseRouteContainer';
import { Logger } from '../../utils/Logger';

export const core = new EamuseRouteContainer();

core.add('message.get', async (info, data, send) => {
  await send.object({
    '@attr': { expire: 1200 },
  });
});

core.add('package.list', async (info, data, send) => {
  await send.object({
    '@attr': { expire: 1200 },
  });
});

core.add('pcbevent.put', async (info, data, send) => {
  await send.success();
});

core.add('tax.get_phase', async (info, data, send) => {
  await send.object({
    phase: kitem('s32', 0),
  });
});

core.add('dlstatus.progress', async (info, data, send) => {
  await send.success();
});

core.add('posevent.income.sales.sale', async (info, data, send) => {
  Logger.debug(JSON.stringify(data, null, 4));
  await send.object([
    { '@attr': { status: 0 } },
    { '@attr': { status: 0 } },
    { '@attr': { status: 0 } },
  ]);
});

core.add(eacoin);
core.add(facility);
core.add(cardmng);
core.add(pcbtracker);
