import { EamuseRouteContainer } from '../EamuseRouteContainer';
import { get } from 'lodash';
import { Logger } from '../../utils/Logger';
import { kitem } from '../../utils/KBinJSON';
import { FindCardsByRefid } from '../../utils/EamuseIO';


export const sppass = new EamuseRouteContainer();

const sppassTokens: { [token: string]: {date: Date, refid: string} } = {};

sppass.add('sppass.open', async (info, data, send) => {
    cleanUpTokens();

    const token = randomToken(4);
    sppassTokens[token] = {date: new Date(Date.now() + 60000), refid: ""}; // +1 minute expiry

    Logger.debug(`SPPass Opened: ${token}`);

    send.object({
        token: kitem('str', token),
        expire_datetime: kitem('str', new Date().toISOString().slice(0, 19).replace('T', ' ')), // Format: 2026-05-14 08:09:35
        url: kitem('str', token),
        interval: kitem('s32', 2),
    });
});

sppass.add('sppass.lookup', async (info, data, send) => {
    Logger.debug(`info: ${JSON.stringify(info)}, data: ${JSON.stringify(data)}`);


    const token: string = get(data, '@attr.token');

    let card_id = "";
    let card_type = "";
    if (sppassTokens[token]) {
        let card = await FindCardsByRefid(sppassTokens[token].refid);
        if (card && card.length > 0) {
            card_id = card[0].cid;
            card_type = "1";
        }
    }
    Logger.debug(`SPPass Lookup: ${token} -> ${card_id}`);

    send.object({
        url: kitem('str', token),
        interval: kitem('s32', 2),
        card_type: kitem('str', card_type),
        card_id: kitem('str', card_id),
    });

    // Release token after lookup if card_id is set
    if (card_id) {
        delete sppassTokens[token];
        Logger.debug(`SPPass Token Released: ${token}`);
    }
});

export function setSPPassToken(token: string, refid: string) {
    Logger.debug(JSON.stringify(sppassTokens, null, 4));

    if (sppassTokens[token] !== undefined) {
        sppassTokens[token].refid = refid;
        Logger.debug(`SPPass Token Set: ${token} -> ${refid}`);
    } else {
        Logger.warn(`SPPass Token Not Found: ${token}`);
    }
}

function cleanUpTokens() {
    const now = new Date();
    for (const token in sppassTokens) {
        if (sppassTokens[token].date < now) {
            delete sppassTokens[token];
            Logger.debug(`SPPass Token Expired: ${token}`);
        }
    }
}

function randomToken(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
}
