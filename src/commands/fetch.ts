import Discord, { Message } from 'discord.js';
import Row from '../row';
import { fetchEHApi } from '../utils/api';
import { decode } from 'html-entities';
import axios, { AxiosResponse } from 'axios';
const JSSoup = require('jssoup').default;

import underageCharacters from '../../data/underage.json';
import renameParodies from '../../data/parodies.json';
import renameCharacters from '../../data/characters.json';
import ignoredTags from '../../data/ignoredtags.json';

/**
 * set fetched information in the row
 * @param {Discord.Message} message
 * @param {Number} list
 * @param {Row} row
 */
export async function setFetchedFields(message: Message, list: number, row: Row) {
	const siteTags = JSON.parse(row.siteTags ?? '{}');

	if ((list != 4 && list != 9) && (row.eh?.match(/e-hentai/) || row.nh?.match(/nhentai|fakku/)) && (!row.parody || !row.author || !row.title || !siteTags.tags?.length || !siteTags.characters?.length)) {
		const fetched = await fetchInfo(message, row);

		if ('error' in fetched || !fetched) {
			message.channel.send(fetched.error ?? 'Failed to fetch the missing fields!');
			return;
		} else {
			if (!row.author && fetched.author) {
				row.author = fetched.author;
				message.channel.send(`Updated missing author \`${row.author}\`!`);
			}

			if (!row.title && fetched.title) {
				row.title = fetched.title;
				message.channel.send(`Updated missing author \`${row.title}\`!`);
			}

			if (!row.parody) {
				if (fetched.parodies.length >= 1) {
					row.parody = fetched.parodies.join(", ");
					message.channel.send(`Updated missing parody \`${row.parody}\`!`);
				} else {
					message.channel.send(`No parodies detected.`);
				}
			}

			if (!row.siteTags && (fetched.siteTags.tags?.length || fetched.siteTags.characters?.length)) {
				row.siteTags = JSON.stringify(fetched.siteTags);
				message.channel.send(`Updated missing tags!`);
			}  else if ((siteTags.tags?.length || siteTags.characters?.length) && (fetched.siteTags.tags?.length || fetched.siteTags.characters?.length)) {

				if ((siteTags.tags?.length === 0 || !siteTags.tags) && fetched.siteTags.tags?.length) {
					siteTags.tags = [...fetched.siteTags.tags];
					message.channel.send(`Updated missing tags!`);
				}
				if ((siteTags.characters?.length === 0 || !siteTags.characters) && fetched.siteTags.characters?.length) {
					siteTags.characters = [...fetched.siteTags.characters];
					message.channel.send(`Updated missing characters!`);
				}

				row.siteTags = JSON.stringify(siteTags);
			}
		}
	}
}

/**
 * Check for underage characters
 * @param {Array} characters
 * @param {Array} parodies
 * @param {Discord.Message} message
 */
function underageCheck(characters: string[], parodies: string[], message: Message) {
	const detectedCharacters = [];

	for (let i = 0; i < characters.length; i++) {
		const curChar = characters[i].toLowerCase();
		if (curChar in underageCharacters) {
			const curList = underageCharacters[curChar as keyof typeof underageCharacters];

			for (let j = 0; j < parodies.length; j++) {
				for (let k = 0; k < curList.length; k++) {
					const seriesList = curList[k]['series'];
					for (let l = 0; l < seriesList.length; l++) {
						if (seriesList[l].toLowerCase().trim() === parodies[j].toLowerCase().trim()) {
							detectedCharacters.push([curChar, seriesList[l], curList[k]['age'], curList[k]['note']]);
						}
					}
				}
			}
		}
	}

	if (detectedCharacters.length >= 1) {
		let characterStr = "";
		for (let i = 0; i < detectedCharacters.length; i++) {
			characterStr += "• " + detectedCharacters[i][0].replace(/(?:^|\s+)(\w{1})/g, (letter) => letter.toUpperCase());
			characterStr += ", aged " + detectedCharacters[i][2];
			characterStr += ", from " + detectedCharacters[i][1];

			if (detectedCharacters[i][3]) {
				characterStr += " (Note: " + detectedCharacters[i][3] + ")";
			}

			characterStr += "\n";
		}

		const embed = new Discord.EmbedBuilder()
			.setTitle(`Underage character(s) detected!`)
			.setDescription(characterStr +
				"\n*If there is a note, make sure none of the exceptions apply before deleting.*")

		message.channel.send({ embeds: [ embed ] });
	}
}

/**
 * Fetch information from E-hentai/FAKKU/nhentai
 * @param {Discord.Message} message
 * @param {Row} row
 */
export async function fetchInfo(message: Message, row: Row) {
	const url = row.eh ?? row.nh ?? '';

	if (!url.match(/e-hentai|nhentai|fakku/)) {
		return { error: 'Invalid link. Can only fetch information from E-Hentai, nhentai, or FAKKU!' };
	} else {
		try {
			let title = '';
			let author = '';
			let parodies: string[] = [];
			let characters: string[] = [];
			let tags: string[] = [];
			const siteTags: { tags: string[]; characters: string[] } = {
				tags: [],
				characters: []
			};

			if (url.match(/e-hentai/)) {
				const data = await fetchEHApi(url);

				title = decode(
					data.title.match(
						/^(?:\s*(?:=.*?=|<.*?>|\[.*?]|\(.*?\)|\{.*?})\s*)*(?:[^[|\](){}<>=]*\s*\|\s*)?([^[|\](){}<>=]*?)(?:\s*(?:=.*?=|<.*?>|\[.*?]|\(.*?\)|\{.*?})\s*)*$/
					)[1].trim());

				author = data.tags
					.filter((s: string) => s.match(/artist/))
					.map((s: string) => decode(s.match(/artist:(.*)/)![1].replace(/(?:^|\s+)(\w{1})/g, (letter) => letter.toUpperCase())))
					.join(", ");

				parodies = data.tags
					.filter((s: string) => s.match(/parody/))
					.map((s: string) => decode(s.match(/parody:(.*)/)![1].replace(/(?:^|\s+)(\w{1})/g, (letter) => letter.toUpperCase())))
					.filter((s: string) => s !== 'Original');

				characters = data.tags
					.filter((s: string) => s.match(/character/))
					.map((s: string) => decode(s.match(/character:(.*)/)![1]));

				tags = data.tags
					.filter((s: string) => s.match(/(female|male|mixed|other):/))
					.filter((s: string) => !ignoredTags.some(x => s.includes(x))); // filter out irrelevant tags

			} else if (url.match(/nhentai/)) {
				return { error: 'Only nhentai link found, not auto-setting info.' };
				// const response = axios.get(row.nh).then((resp) => {
				// 	const code = resp?.data ?? -1;
				// 	if (code === -1) throw code;
				// 	else return code;
				// });
				// const body = await response;
				//
				// const soup = new JSSoup(body);
				//
				// title = decode(
				// 	soup
				// 		.find('h1', 'title')
				// 		.text.match(
				// 		/^(?:\s*(?:=.*?=|<.*?>|\[.*?]|\(.*?\)|\{.*?})\s*)*(?:[^[|\](){}<>=]*\s*\|\s*)?([^\[|\](){}<>=]*?)(?:\s*(?:=.*?=|<.*?>|\[.*?]|\(.*?\)|\{.*?})\s*)*$/
				// 	)[1].trim()
				// );
				//
				// author = decode(
				// 	soup
				// 		.findAll('a', 'tag')
				// 		.filter((s) => {
				// 			return s?.attrs?.href?.match(/\/artist\/(.*)\//);
				// 		})
				// 		.map((s) => {
				// 			return s.find('span', 'name').text.replace(/(?:^|\s+)(\w{1})/g, (letter) => letter.toUpperCase());
				// 		})
				// 		.join(", ")
				// );
				//
				// parodies = soup
				// 	.findAll('a', 'tag')
				// 	.filter((s) => {
				// 		return s?.attrs?.href?.match(/\/parody\/(.*)\//);
				// 	})
				// 	.map((s) => {
				// 		return decode(s.find('span', 'name').text.replace(/(?:^|\s+)(\w{1})/g, (letter) => letter.toUpperCase()));
				// 	})
				// 	.filter((s) => s !== "Original");
				//
				// chars = soup
				// 	.findAll('a', 'tag')
				// 	.filter((s) => {
				// 		return s?.attrs?.href?.match(/\/character\/(.*)\//);
				// 	}).map((s) => {
				// 		return decode(s.find('span', 'name').text.toLowerCase());
				// 	});
				//
				// siteTags.tags = soup
				// 	.findAll('a', 'tag')
				// 	.filter((s) => {
				// 		return s?.attrs?.href?.match(/\/tag\/(.*)\//);
				// 	})
				// 	.map((s) => {
				// 		return decode(s.find('span', 'name').text);
				// 	})
				// 	.filter((s) => !ignoredTags.includes(s));

			} else if (url.match(/fakku/)) {
				const response = axios.get(url).then((resp: AxiosResponse) => {
					const respdata = resp?.data;
					if (!respdata) throw new Error(`No response body found.`);
					else return respdata;
				});
				const body = await response;
				const soup = new JSSoup(body);

				title = decode(
					soup
						.find('h1')
						.text);

				author = decode(
					soup
						.find('title')
						.text.match(
						/ by (?!.* by )(.+) - FAKKU/
						)[1].trim());

				parodies = soup
					.findAll('a')
					.filter((s: { attrs: { href: string } }) => {
						return s?.attrs?.href?.match(/\/series\/.+/);
					})
					.map((s: { text: string }) => {
						return decode(s.text.replace(/\sseries/i, '').trim());
					})
					.filter((s: string) => s !== "Original Work");

				tags = soup
					.findAll('a')
					.filter((s: { attrs: { href: string; title: string } }) => {
						return s?.attrs?.href?.match(/\/tags\/.+/) || s?.attrs?.title?.match(/Read With.+/i);
					})
					.map((s: { text: string }) => {
						return decode(s.text.replace(/Read With.+/i, 'unlimited').toLowerCase().trim());
					})
					.filter((s: string) => s !== "hentai");

			}

			if (tags?.length) {
				siteTags.tags = [...tags];
			}

			if (characters?.length) {
				underageCheck(characters, parodies, message);
				for (let t = 0; t < characters.length; t++) {
					if (characters[t] in renameCharacters) {
						characters[t] = renameCharacters[characters[t] as keyof typeof renameCharacters];
					}
				}
				siteTags.characters = [...characters];
			}

			if (parodies.length >= 1) {
				for (let u = 0; u < parodies.length; u++) {
					for (const [key, value] of Object.entries(renameParodies)) {
						if (`${value}`.includes(parodies[u])) {
							parodies[u] = `${key}`;
							break;
						}
					}
				}
				parodies = [...new Set(parodies)]; //removes duplicates if they exist
			}

			return {
				title,
				author,
				parodies,
				siteTags
			};
		} catch (e) {
			const site = url.match(/\/\/(www\.)?([\w-]*)\./)![2] ?? 'some website';
			// @ts-expect-error just checking
			if (e?.response?.status === 503) {
				console.log(`Error 503: Couldn't connect to ${site}!`);
				return { error: `Failed to connect to ${site}: 503 error (likely nhentai has cloudflare up) Failed to get missing information.` };
			} else {
				console.log(e);
				return { error: `Failed to get missing information from ${site}!` };
			}
		}
	}
}
