import Row from '../row';
import { Message } from 'discord.js';
import info from '../../config/globalinfo.json';
import { logError } from './log';
import { entryEmbed } from './misc';
import { query, queryAll } from './query';
import sheets from '../sheetops';
import { Flags } from '../index';

/**
 * Lists a sheet from the spreadsheet or lists a row from a sheet or searches
 * @param {Discord.Message} message
 * @param {Number} list
 * @param {Number} ID
 * @param {*} flags
 */
export default async function list(message: Message, list: number, ID: number, flags: Flags) {
	if (list > info.sheetNames.length || list <= 0) {
		message.channel.send('Cannot read a nonexistent sheet!');
		return false;
	}

	if (typeof list === 'undefined' && typeof flags.qa === 'undefined') {
		message.channel.send('List was not supplied!');
		return false;
	}

	const name = info.sheetNames[list];

	async function taxFraud(str: string) {
		return message.channel.send(str.replace('``````', ''));
	}

	try {
		//Specific ID fetch and return
		if (typeof ID !== 'undefined') {
			const rows = await sheets.get(name);

			if (rows.length == 0) {
				message.channel.send(`\`${name}\` is empty!`);
				return false;
			}

			if (ID <= 0 || ID > rows.length) {
				message.channel.send(`Cannot get nonexistent row! The last entry in this sheet is \`${list}#${rows.length}\``);
				return false;
			}
			const target = new Row(rows[ID - 1]);

			await message.channel.send({ embeds: [entryEmbed(target, list, ID, message)] });
			return true;
		}

		//Query
		if (flags?.q || flags?.qa) {
			if (flags.q) {
				return query(message, list, flags);
			}
			if (flags.qa) {
				return queryAll(message, flags);
			}
		}

		if (list == 1) {
			await message.channel.send('no chat bomb, thanks');
			return true;
		}
		if (list == 4) {
			await message.channel.send('https://wholesomelist.com/list');
			return true;
		}
		if (list == 9) {
			await message.channel.send('https://wholesomelist.com/licensed');
			return true;
		}

		//List
		const rows = await sheets.get(name);

		if (rows.length == 0) {
			message.channel.send('No entries in this list!');
			return true;
		}

		const bankAccount = (debt: string, price: string[], i: number) => {
			if (price) {
				const check = new Row(price);
				if (debt.length > 1900) { //messages are limited to 2000 characters, use 1900 to avoid issues
					taxFraud(`\`\`\`${debt}\`\`\``);
					debt = '';
				}
				debt += `${list}#${i + 1} ${check.hm ?? check.nh ?? check.eh ?? check.im} ${check.title} by ${check.author}` + '\n';
			}
			return debt;
		};
		const res = rows.reduce(
			bankAccount,
			'```**Received `list` request for ' + info.sheetNames[list] + '.**\nPlease wait for all results to deliver.```'
		);

		await taxFraud('```' + res + '```');
		await message.channel.send('All results delivered!.');
		return true;
	} catch (e) {
		logError(message, e);
		return false;
	}
}
