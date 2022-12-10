import Row from '../row';
import {Message} from 'discord.js';
import info from '../../config/globalinfo.json';
const tierlist = ['S', 'S-', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-'];
import sheets from '../sheetops';
import { Flags } from '../index';

/**
 * Checks if 'arr' contains any elements in any form of 'val.'
 * @param {Array} arr
 * @param {Array} queries
 */
function includes(arr: string[], queries: string[]) {
	let accumulator = true;
	for (const obj in queries) {
		let result = false;
		if (tierlist.includes(queries[obj])) {
			result = result || arr[5] === queries[obj]; //match the tiers
			accumulator = accumulator && result;
			result = false;
			continue;
		}
		for (let i = 0; i < arr.length; i++) {
			result = result || arr[i].trim().toLowerCase().indexOf(queries[obj].toLowerCase()) > -1;
		}
		accumulator = accumulator && result;
		result = false;
	}
	return accumulator;
}

/**
 * Queries a specific sheet.
 * @param {Discord.Message} message
 * @param {Number} list
 * @param {*} flags
 */
export async function query(message: Message, list: number, flags: Flags) {
	let query = flags.q!
	if (query.charAt(query.length - 1) == '/') {
		query = query.slice(0, -1);
	}

	const name = info.sheetNames[list];

	const rows = await sheets.get(name);

	async function taxFraud(str: string) {
		return message.channel.send(str.replace('``````', ''));
	}

	//multi query parser
	const scanner = /{(?<found>.*?)}+/;
	const accounts: string[] = []; //array of search queries
	let forged = query;
	if (scanner.test(query)) {
		//oh shit! might have found something!
		let m;
		while ((m = scanner.exec(forged)) !== null) {
			accounts.push(m.groups!.found);
			forged = forged.substring(m.index + 1);
		}
	} else {
		accounts.push(query);
	}

	let count = 0;
	const bankAccount = (debt: string, price: string[], i: number) => { //debt is our buffer string, price is the raw array of data
		if (price) {
			const check = new Row(price);
			check.uid = null;
			check.img = null;
			check.siteTags = check.siteTags?.replaceAll(/"(characters|tags)":/gi, "");
			price = check.toArray().map((s) => s.toString());
			if (debt.length > 1800) { //messages are limited to 2000 characters, use 1800 to avoid issues
				taxFraud(`\`\`\`${debt}\`\`\``); //send that shit off
				debt = ''; //reset our string
			}
			if (includes(price, accounts)) {
				debt += `${list}#${i+1} ${check.hm ?? check.nh ?? check.eh ?? check.im} ${check.title} by ${check.author}` + '\n';
				count++;
			}
		}
		return debt;
	};
	const beginningStr = flags.str ?? '```**Received `list` request for ' + info.sheetNames[list] + '.**\nPlease wait for all results to deliver.```';
	const endStr = flags.estr ?? '\nEnd of Results!';
	const res = rows.reduce(bankAccount, beginningStr);

	if (count == 0) await taxFraud(`\`\`\`${beginningStr}\nNo results in this list!\`\`\``);
	else if (res !== '') await taxFraud(`\`\`\`${res}\`\`\` ${endStr}`);
}

/**
 * Queries all used sheets.
 * @param {Message} message
 * @param {*} flags
 */
export async function queryAll(message: Message, flags: Flags) {
	const queryLists: number[] = [1, 2, 3, 4, 6, 9];

	for (let i = 0; i < queryLists.length; i++) {
		await query(message, queryLists[i], {
			q: flags.qa,
			str: '```**Results from `' + info.sheetNames[queryLists[i] as keyof typeof info.sheetNames] + '`** ```',
			estr: '',
		});
	}
	message.channel.send('Search finished!');
}
