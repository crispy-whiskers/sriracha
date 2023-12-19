import Row from '../row';
import { Message } from 'discord.js';
import info from '../../config/globalinfo.json';
const tierlist = ['S', 'S-', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-'];
import * as sheets from '../sheetops';
import { Flags } from '../index';
import { entryEmbed } from './misc';

/**
 * Checks if the entry contains the queries
 */
function includes(entry: string[], queries: string[]): boolean {
	let match = false;

	for (const query in queries) {
		if (tierlist.includes(queries[query])) {
			match = entry.includes(queries[query]);
		} else {
			match = entry.some((x: string) => x.trim().toLowerCase().includes(queries[query].toLowerCase()));
		}

		if (!match) {
			break;
		}
	}

	return match;
}

/**
 * Converts matches to Discord's multiline code blocks
 */
async function formatMatches(message: Message, matches: Row[], list: number, beginningStr?: string, endStr?: string) {
	beginningStr = beginningStr ?? '**Received `list` request for ' + info.sheetNames[list] + '.**\nPlease wait for all results to deliver.';
	endStr = endStr ?? '\nEnd of Results!';

	function taxFraud(str: string): string {
		return '```' + str + '```';
	}

	if (!matches.length) {
		await message.channel.send(beginningStr + '\n```No results in this list!```');
	} else {
		const entryStrings = matches.map((entry: Row) => `${list}#${entry.id} ${entry.hm ?? entry.nh ?? entry.eh ?? entry.im} ${entry.title} by ${entry.author}` + '\n');
		const debt = [];
		let messageString = '';

		for (let i = 0; i < entryStrings.length; i++) {
			messageString += entryStrings[i];

			//messages are limited to 2000 characters, so let's push the string once it gets close to that limit
			if (messageString && (messageString.length > 1700 || i == entryStrings.length - 1)) {
				debt.push(taxFraud(messageString));
				messageString = '';
			}
		}

		debt[0] = beginningStr + debt[0];
		debt[debt.length - 1] += endStr;

		for (let i = 0; i < debt.length; i++) {
			await message.channel.send(debt[i]);
		}
	}
}

/**
 * Queries a specific sheet and returns the matching rows.
 */
async function query(list: number, query: string): Promise<Row[]> {
	if (query.endsWith('/')) {
		query = query.slice(0, -1);
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

	//finds entries that include the search queries and returns an array with the entries
	const name = info.sheetNames[list];
	const rows = await sheets.get(name);
	const matches = [];

	for (let i = 0; i < rows.length; i++) {
		const entry = new Row(rows[i]);
		entry.removeDummies();
		entry.uid = null;
		entry.img = null;
		entry.siteTags = entry.siteTags?.replaceAll(/"(characters|tags)":/gi, '');

		const entryArray = entry.toArray().map((s) => s.toString());

		if (includes(entryArray, queries)) {
			const match = new Row(rows[i]);
			match.removeDummies();
			match.id = i + 1;
			matches.push(match);
		}
	}

	return matches;
}

/**
 * Queries the indicated sheet
 */
export async function queryList(message: Message, list: number, flags: Flags) {
	const matches = await query(list, flags.q!);

	if (matches.length === 1) {
		const embed = entryEmbed(matches[0], list, matches[0].id!, message);

		await message.channel.send({
			content: `The following entry matches the request for the list **${info.sheetNames[list]}**: \n\n`,
			embeds: [embed],
		});
	} else {
		await formatMatches(message, matches, list);
	}
}

/**
 * Queries all used sheets.
 */
export async function queryAll(message: Message, flags: Flags) {
	const queryLists = [1, 2, 3, 4, 6, 9];

	for (let i = 0; i < queryLists.length; i++) {
		const matches = await query(queryLists[i], flags.qa!);
		const str = `**Results from \`${info.sheetNames[queryLists[i] as keyof typeof info.sheetNames]}\`**`;
		const estr = '';

		await formatMatches(message, matches, queryLists[i], str, estr);
	}

	await message.channel.send('Search finished!');
}
