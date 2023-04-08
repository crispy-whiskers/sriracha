import add from './add';
import del from './delete';
import { Message } from 'discord.js';
import Row from '../row';
import info from '../../config/globalinfo.json';
import { logError } from './log';
import * as sheets from '../sheetops';

/**
 * Moves a row by adding an entry and deleting it.
 */
export default async function move(message: Message, list: number, ID: number, dest: number) {
	if (list > info.sheetNames.length || dest > info.sheetNames.length || list <= 0 || dest <= 0) {
		message.channel.send('Cannot move to / from a nonexistent sheet!');
		return false;
	}
	const name = info.sheetNames[list];
	try {
		const rows = await sheets.get(name);

		if (ID <= 0 || ID > rows.length) {
			message.channel.send('Cannot get nonexistent row!');
			return false;
		}
		const data = new Row(rows[ID - 1]);

		return await add(message, dest, data).then((resp) => {
			if (resp) {
				return del(message, list, ID);
			}
		});
	} catch (e) {
		logError(message, e);
		return false;
	}
}
