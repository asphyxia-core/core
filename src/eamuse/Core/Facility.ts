import { ip2int, kitem } from '../../utils/KBinJSON';
import { VERSION } from '../../utils/Consts';
import { EamuseRouteContainer } from '../EamuseRouteContainer';
import { CONFIG } from '../../utils/ArgConfig';

export const facility = new EamuseRouteContainer();

facility.add('facility.get', async (info, data, send) => {
  const port = CONFIG.matching_port;

  const result = {
    location: {
      id: kitem('str', 'ea'),
      country: kitem('str', 'JP'),
      region: kitem('str', '1'),
      name: kitem('str', 'CORE'),
      type: kitem('u8', 0),
      countryname: kitem('str', 'UNKNOWN'),
      countryjname: kitem('str', '不明'),
      regionname: kitem('str', 'CORE'),
      regionjname: kitem('str', 'CORE'),
      customercode: kitem('str', 'AXUSR'),
      companycode: kitem('str', 'AXCPY'),
      latitude: kitem('s32', 6666),
      longitude: kitem('s32', 6666),
      accuracy: kitem('u8', 0),
    },
    line: {
      id: kitem('str', '.'),
      class: kitem('u8', 0),
    },
    portfw: {
      globalip: kitem('ip4', ip2int((info as any).ip)),
      globalport: kitem('u16', port),
      privateport: kitem('u16', port),
    },
    public: {
      flag: kitem('u8', 1),
      name: kitem('str', 'UNKNOWN'),
      latitude: kitem('str', '0'),
      longitude: kitem('str', '0'),
    },
    share: {
      eacoin: {
        notchamount: kitem('s32', 0),
        notchcount: kitem('s32', 0),
        supplylimit: kitem('s32', 100000),
      },
      url: {
        eapass: kitem('str', `CORE ${VERSION}`),
        arcadefan: kitem('str', `CORE ${VERSION}`),
        konaminetdx: kitem('str', `CORE ${VERSION}`),
        konamiid: kitem('str', `CORE ${VERSION}`),
        eagate: kitem('str', `CORE ${VERSION}`),
      },
    },
  };

  send.object(result);
});
