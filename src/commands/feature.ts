import Row from '../row';
import { Message } from 'discord.js';
import { logError } from './log';
import { fUpdate } from './misc';

import del from './delete';
import * as sheets from '../sheetops';

/**
 * Features a row from a sheet.
 */
export default async function feature(message: Message, list: number, ID: number) {
	if (list != 4) {
		message.channel.send('Cannot feature unchecked doujins!');
		return false;
	}

	try {
		const rows = await sheets.get('FINAL LIST');

		if (ID <= 0 || ID > rows.length) {
			message.channel.send(`Cannot feature nonexistent row! The last entry in this sheet is \`${list}#${rows.length}\``);
			return false;
		}

		const row = new Row(rows[ID - 1]);

		const featRows = await sheets.get('SITEDATA');

		if (featRows.length > 8) {
			await del(message, 7, 1);
		}

		await sheets.append('SITEDATA', ['https://wholesomelist.com/list/' + row.uid, row.title!, row.author!, row.tier!, row.img!]);
		message.channel.send('Featured entry!');
		await fUpdate();
		message.channel.send('Updated website!');
		return true;
	} catch (e) {
		logError(message, e);
		return false;
	}
}
/**
 * Clears features.
 */
export async function clear(message: Message) {
	try {
		sheets.delete('SITEDATA', 1, 10); //theoretically, never more than 8
		message.channel.send('Cleared features!');
	} catch (e) {
		logError(message, e);
		return false;
	}
}
