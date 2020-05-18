import { EamuseRouteContainer } from '../EamuseRouteContainer';

export const pcbtracker = new EamuseRouteContainer();

pcbtracker.add('pcbtracker.alive', async (info, data, send) => {
  const result = {
    '@attr': {
      ecenable: 1,
      eclimit: 0,
      expire: 1200,
      limit: 0,
      time: Math.floor(Date.now() / 1000),
    },
  };

  await send.object(result);
});
