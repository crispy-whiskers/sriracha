import Row from '../row';
import { Message } from 'discord.js';
import info from '../../config/globalinfo.json';
import { logError } from './log';
import { entryEmbed } from './misc';
import sheets from '../sheetops';

/**
 * Gets a random doujin from a sheet.
 * @param {Discord.Message} message
 * @param {Number} list
 */
export default async function rand(message: Message, list: number) {
	if (list <= 0 || list > info.sheetNames.length) {
		message.channel.send('Cannot get random from a nonexistent sheet!');
		return false;
	}

	try {
		const rows = await sheets.get('FINAL LIST');
		const ID = Math.floor(Math.random() * rows.length + 1);

		const target = new Row(rows[ID - 1]);

		await message.channel.send({ embeds: [entryEmbed(target, list, ID, message)] });

		return true;
	} catch (e) {
		logError(message, e);
		return false;
	}
}

module.exports = rand;
