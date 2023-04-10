import Row from '../row';
import { Message } from 'discord.js';
import info from '../../config/globalinfo.json';
import { logError } from './log';
import { entryEmbed } from './misc';
import { query, queryAll } from './query';
import * as sheets from '../sheetops';
import { Flags } from '../index';

/**
 * Lists a sheet from the spreadsheet or lists a row from a sheet or searches
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

	//converts message to Discord's multiline code blocks
	function taxFraud(str: string): string {
		return '```' + str + '```';
	}

	//returns an array with the messages we will send
	function bankAccount(rows: Array<string[]>): string[] {
		const debt = [];
		let messageString = '';

		for (let i = 0; i < rows.length; i++) {
			const entry = new Row(rows[i]);
			entry.removeDummies();
			messageString += `${list}#${i + 1} ${entry.hm ?? entry.nh ?? entry.eh ?? entry.im} ${entry.title} by ${entry.author}` + '\n';

			//messages are limited to 2000 characters, so let's push the string once it gets close to that limit
			if (messageString.length > 1800 || i == rows.length - 1) {
				debt.push(taxFraud(messageString));
				messageString = '';
			}
		}

		return debt;
	}

	try {
		//Specific ID fetch and return
		if (typeof ID !== 'undefined') {
			const rows = await sheets.get(name);

			if (!rows.length) {
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

		if (!rows.length) {
			message.channel.send('No entries in this list!');
			return true;
		}

		const res = bankAccount(rows);
		const beginningStr = '**Received `list` request for ' + info.sheetNames[list] + '.**\nPlease wait for all results to deliver.';
		const endStr = 'All results delivered!.';

		for (let i = 0; i < res.length; i++) {
			await message.channel.send(`${i == 0 ? beginningStr : ''} ${res[i]} ${i == res.length -1 ? endStr : ''}`);
		}

		return true;
	} catch (e) {
		logError(message, e);
		return false;
	}
}
