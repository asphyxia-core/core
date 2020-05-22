import { EamuseRouteContainer } from '../EamuseRouteContainer';
import { CONFIG } from '../../utils/ArgConfig';

export const pcbtracker = new EamuseRouteContainer();

pcbtracker.add('pcbtracker.alive', async (info, data, send) => {
  const result = {
    '@attr': {
      ecenable: CONFIG.enable_paseli ? 1 : 0,
      eclimit: 0,
      expire: 1200,
      limit: 0,
      time: Math.floor(Date.now() / 1000),
    },
  };

  send.object(result);
});
