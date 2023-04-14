import Row from '../row';
import { Message } from 'discord.js';
import info from '../../config/globalinfo.json';
const tierlist = ['S', 'S-', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-'];
import * as sheets from '../sheetops';
import { Flags } from '../index';

/**
 * Checks if 'arr' contains any elements in any form of 'val.'
 */
function includes(arr: string[], queries: string[]): boolean {
	let match = false;

	for (const obj in queries) {
		if (tierlist.includes(queries[obj])) {
			match = arr.includes(queries[obj]);
		} else {
			for (let i = 0; i < arr.length; i++) {
				match = arr[i].trim().toLowerCase().includes(queries[obj].toLowerCase());
				if (match) {
					break;
				}
			}
		}
		if (!match) {
			break;
		}
	}

	return match;
}

/**
 * Queries a specific sheet.
 */
export async function query(message: Message, list: number, flags: Flags) {
	let query = flags.q!;
	if (query.charAt(query.length - 1) == '/') {
		query = query.slice(0, -1);
	}

	const name = info.sheetNames[list];

	const rows = await sheets.get(name);

	//converts message to Discord's multiline code blocks
	function taxFraud(str: string): string {
		return '```' + str + '```';
	}

	//multi query parser
	const scanner = /{(.*?)}+/g;
	const queries: string[] = []; //array of search queries

	if (query.match(scanner)) {
		const queryValues = [...query.matchAll(scanner)].map((m) => m[1]);
		queries.push(...queryValues);
	} else {
		queries.push(query);
	}

	//finds entries that include the search queries and returns an array with the messages we will send
	function bankAccount(rows: Array<string[]>): string[] {
		const debt = [];
		let messageString = '';

		for (let i = 0; i < rows.length; i++) {
			const entry = new Row(rows[i]);
			entry.removeDummies();

			entry.uid = null;
			entry.img = null;
			entry.siteTags = entry.siteTags?.replaceAll(/"(characters|tags)":/gi, '');
			rows[i] = entry.toArray().map((s) => s.toString());

			if (includes(rows[i], queries)) {
				messageString += `${list}#${i + 1} ${entry.hm ?? entry.nh ?? entry.eh ?? entry.im} ${entry.title} by ${entry.author}` + '\n';
			}

			//messages are limited to 2000 characters, so let's push the string once it gets close to that limit
			if (messageString && (messageString.length > 1800 || i == rows.length - 1)) {
				debt.push(taxFraud(messageString));
				messageString = '';
			}
		}

		return debt;
	}

	const beginningStr = flags.str ?? '**Received `list` request for ' + info.sheetNames[list] + '.**\nPlease wait for all results to deliver.';
	const endStr = flags.estr ?? '\nEnd of Results!';
	const res = bankAccount(rows);

	if (!res.length) {
		await message.channel.send(beginningStr + '\n```No results in this list!```');
	} else {
		for (let i = 0; i < res.length; i++) {
			await message.channel.send(`${i == 0 ? beginningStr : ''} ${res[i]} ${i == res.length - 1 ? endStr : ''}`);
		}
	}
}

/**
 * Queries all used sheets.
 */
export async function queryAll(message: Message, flags: Flags) {
	const queryLists = [1, 2, 3, 4, 6, 9];

	for (let i = 0; i < queryLists.length; i++) {
		await query(message, queryLists[i], {
			q: flags.qa,
			str: `**Results from \`${info.sheetNames[queryLists[i] as keyof typeof info.sheetNames]}\`**`,
			estr: '',
		});
	}
	message.channel.send('Search finished!');
}
