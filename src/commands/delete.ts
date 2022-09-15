import Row from '../row';
import { Message } from 'discord.js';
import info from '../../config/globalinfo.json';
import { log, logError } from './log';
import misc, { update } from './misc';
import sheets from '../sheetops';

/**
 * Deletes a row from a sheet.
 * @param {Discord.Message} message
 * @param {Number} list
 * @param {Number} ID
 */
export default async function del(message: Message, list: number, ID: number) {
	if (list <= 0 || list > info.sheetNames.length) {
		message.channel.send('Cannot delete from a nonexistent sheet!');
		return false;
	}
	const name = info.sheetNames[list];

	try {
		const rows = await sheets.get(name);

		if (ID == 0 || ID > rows.length) {
			message.channel.send(`Cannot delete nonexistent row! The last entry in this sheet is \`${list}#${rows.length}\``);
			return false;
		}
		log('Deleted `' + JSON.stringify(new Row(rows[ID - 1])) + '`');

		const target = new Row(rows[ID - 1]);
		const link = target?.hm ?? target?.nh ?? target?.eh ?? target?.im;

		await sheets.delete(name, ID);
		message.channel.send(`Successfully deleted \`${list}#${ID} ${'(' + link + ')' ?? ''}\`!`);

		if (list == 4) {
			await update();
		}
		return true;
	} catch (e) {
		logError(message, e);
		return false;
	}
}
