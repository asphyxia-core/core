import { xmlToData, dataToXML, kencode, kitem, kdecode, kattr, karray } from './utils/KBinJSON';
import { KonmaiEncrypt } from './utils/KonmaiEncrypt';
import iconv from 'iconv-lite';
import { writeFileSync, readFileSync, write } from 'fs';
import { ReadConfig, SaveConfig, ARGS } from './utils/ArgConfig';
import { renderFile as pugFile } from 'pug';

// const data = readFileSync('response.bin');
// const decode = kdecode(data);
// console.log(dataToXML(decode));

// const request = iconv.encode(
//   '<call model="GLD:J:A:A:2007072301" srcid="01201000000E7AC029BE">\n<services method="get"/>\n</call>',
//   'utf8'
// );

// const key = new KonmaiEncrypt('1-5ebc47ba-9868');
// writeFileSync(`${key.getPublicKey()}.bin`, key.encrypt(request));

// const data = kattr(
//   {
//     test: '"',
//     test2: '&',
//   },
//   {
//     child: kitem('s32', 5),
//     child2: kitem('ip4', '192.168.1.1'),
//     group: [kitem('s64', BigInt(1000)), kitem('bin', Buffer.from('HAHA'))],
//     group2: [karray('s64', [BigInt(1000), BigInt(1000)]), kitem('2s32', [32, 32])],
//     test: kitem('str', 'This is a string'),
//   }
// );

// const data2 = dataToXML({ data });
// console.log(data2);
// console.log(JSON.stringify(xmlToData(data2), null, 2));

// ReadConfig();
// SaveConfig();

// const data = xmlToData(pugFile('build\\plugins\\sdvx\\template\\common4.pug'));
// console.log(data);
