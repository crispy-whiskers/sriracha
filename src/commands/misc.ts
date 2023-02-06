import Discord, { Client, Message, User, MessageReaction, EmbedBuilder } from 'discord.js';
import Row from '../row';
import axios from 'axios';
import { logError } from './log';
import sheets from '../sheetops';
import validTags from '../../data/tags.json';

export function update() {
	return axios.post('https://wholesomelist.com/post', { type: 'update' });
}

export function fUpdate() {
	return axios.post('https://wholesomelist.com/post', { type: 'feature' });
}

function isUrl(s: string) {
	const regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-/]))?/;
	return regexp.test(s);
}

function capitalize(word: string) {
	return word.substring(0, 1).toUpperCase() + word.substring(1);
}

/**
 *
 * @param {Row} row
 * @param {number} list
 * @param {number} ID
 * @param {Discord.Message} message
 */
export function entryEmbed(row: Row, list: number, ID: number, message: Message) {
	const embed = new Discord.EmbedBuilder();
	const link = (row.hm ?? row.nh ?? row.eh ?? row.im)!;
	if (isUrl(link)) {
		embed.setURL(link);
	} else {
		if (message) {
			if (link) message.channel.send(`**Warning: entry does not have a proper link of **\`${link}\`.`);
			else message.channel.send('No results or improperly formatted row!');
		}
	}

	if (row.author) embed.setDescription(`by ${row.author}`);
	else embed.setDescription('No listed author');

	const rowNHMatch = row.nh?.match(/nhentai|fakku|irodoricomics|ebookrenta|jlist/);
	let rowNHUrl = rowNHMatch ? rowNHMatch[0] : 'L2 (NHentai)';
	switch (rowNHUrl) {
		case 'fakku':
			rowNHUrl = 'FAKKU';
			break;
		case 'irodoricomics':
			rowNHUrl = 'Irodori Comics';
			break;
		case 'ebookrenta':
			rowNHUrl = 'Renta!';
			break;
		case 'jlist':
			rowNHUrl = 'J-List';
			break;
		default:
			break;
	}

	const rowEHMatch = row.eh?.match(/e-hentai|imgur|nhentai/);
	let rowEHUrl = rowEHMatch ? rowEHMatch[0] : 'L3 (E-Hentai)';
	switch (rowEHUrl) {
		case 'imgur':
			rowEHUrl = 'Imgur';
			break;
		case 'e-hentai':
			rowEHUrl = 'E-Hentai';
			break;
		case 'L3 (E-Hentai)':
		case 'nhentai':
		default:
			break;
	}

	const linkString = `
		${row.hm ? `• [HMarket](${row.hm})\n` : ''}\
		${row.nh ? `• [${rowNHUrl}](${row.nh})\n` : ''}\
		${row.eh ? `• [${rowEHUrl}](${row.eh})\n` : ''}\
		${row.im ? `• [Imgur](${row.im})\n` : ''}\
		`.trim().replace(/\t*/gm, '');

	embed.addFields(
		{ name: 'All Links', value: linkString, inline: false },
		{ name: 'Notes', value: row.note || 'None', inline: true },
		{ name: 'Parody', value: row.parody || 'None', inline: true },
		{ name: 'Tier', value: row.tier || 'Not set', inline: true },
		{ name: 'Page#', value: row.page === -1 ? 'Not set' : '' + row.page ?? 'Not set', inline: true }
	);

	if (row.misc) {
		const m = JSON.parse(row.misc);

		//there is a set schema for the misc field! hooray!
		if (m.favorite) {
			embed.addFields({
				name: 'Favorite',
				value: m.favorite,
			});
		}
		if (m.reason) {
			embed.addFields({
				name: 'Reason',
				value: m.reason,
			});
		}
		if (m.altLinks) {
			let altNumber = 0;
			for (const alt in m.altLinks) {
				altNumber = ++altNumber;
				embed.addFields({
					name: `Alt Link ${altNumber}`,
					value: `[${m.altLinks[alt]['name']}](${m.altLinks[alt]['link']})`,
					inline: m.altLinks.length > 1,
				});
			}
		}
		//handy little trick: boolean at the end makes it all inline if theres more than one in the field
		if (m.series) {
			for (const s in m.series) {
				embed.addFields({
					name: `SERIES: "${m.series[s].name}"`,
					value: `Type: ${m.series[s].type}\nNumber: ${m.series[s].number}`,
					inline: m.series.length > 1,
				});
			}
		}
	}

	const siteTags = JSON.parse(row.siteTags ?? '{}');

	if ((siteTags.characters?.length ?? 0) > 0) {
		const charString = siteTags.characters
			.sort()
			.join(', ')
			.split(' ')
			.map((word: string) => capitalize(word))
			.join(' ');
		embed.addFields({
			name: 'Characters',
			value: charString,
		});
	}

	if ((row.tags?.length ?? 0) > 0) {
		const tagString = row.tags!.filter(e => e !== 'undefined').sort().join(', ');
		embed.addFields({
			name: 'Tags',
			value: tagString,
		});
	} else {
		embed.addFields({
			name: 'Tags',
			value: 'Not set',
		});
	}

	if ((siteTags.tags?.length ?? 0) > 0) {
		if (siteTags.tags[0].includes(':')) { //e-hentai tags
			const ehTags: { male: string[]; female: string[]; mixed: string[]; other: string[] } = {
				male: [],
				female: [],
				mixed: [],
				other: [],
			};
			const sitetagString: string[] = [];

			for (let i = 0; i < siteTags.tags.length; i++) {
				const prefix = siteTags.tags[i].split(':')[0];
				siteTags.tags[i] = siteTags.tags[i]
					.split(':')[1]
					.split(' ')
					.map((word: string) => capitalize(word))
					.join(' ');
				if (prefix in ehTags) {
					ehTags[prefix as keyof typeof ehTags].push(siteTags.tags[i]);
				}
			}

			for (const namespace in ehTags) {
				if (ehTags[namespace as keyof typeof ehTags].length) {
					sitetagString.push(`• **${capitalize(namespace)}**: ${ehTags[namespace as keyof typeof ehTags].join(', ')}`);
				}
			}

			embed.addFields({
				name: 'Site Tags',
				value: sitetagString.join('\n'),
			});
		} else {
			const sitetagString = siteTags.tags
				.sort()
				.join(', ')
				.split(' ')
				.map((word: string) => capitalize(word))
				.join(' ');

			embed.addFields({
				name: 'Site Tags',
				value: sitetagString,
			});
		}
	}

	embed.setFooter({
		text: `ID: ${list}#${ID}`,
	});
	embed.setTitle((row.title ?? row.hm ?? row.nh ?? row.eh ?? row.im)!);
	embed.setTimestamp(new Date());
	embed.setColor('#FF0625');
	return embed;
}

/**
 *
 * @param {*} message
 * @param {*} cmd
 * @param {Discord.Client} bot
 */
export default async function misc(message: Message, cmd: string, bot: Client) {
	if (cmd === 'update') {
		const m = await message.channel.send('Updating the featured and the list...');
		await update();
		await fUpdate();
		m.react('✔️');
	} else if (cmd === 'help') {
		//oh boy
		help(message, bot);
	} else if (cmd === 'stats') {
		//oh boy x2
		await stats(message);
	} else if (cmd === 'tags') {
		tags(message);
	}
}

/**
 *
 * @param {*} message
 * @param {Discord.Client} bot
 */
function help(message: Message, bot: Client) {
	const embed = new Discord.EmbedBuilder();

	const str = `• sauce [status | status -q query | -qa queryAll]
	• sauce [ID] 
	• sauce update
	• sauce help
	• sauce add [-a author | -t title | -l link | -n note | -p parody | -tr tier | -pg page | -s status | -img cover link]  
	• sauce move [ID] [status] 
	• sauce [ID] [edit any field w/ listed tags | -r reason] 
	• sauce delete [ID] 
	• sauce feature [ID] [-l img link]
	• sauce random
	• sauce lc [ID]
	• sauce [ID] [-l1 Hmarket link | -l2 nhentai link | -l3 E-Hentai link | -l4 Imgur link]
	• sauce [ID] [-atag tag | -rtag tag | -addsitetag sitetag | -delsitetag sitetag | -addcharacter char | -delcharacter char]
	• sauce [ID] [-addseries series name, type, number | -delseries series name]
	• sauce [ID] [-addalt link, name | -delalt name]
	• sauce [ID] [-fetch (all | artist | author | characters | parody | sitetags | tags | title)]
	• sauce [ID] [-suggest (all | tags | note)]
	• sauce fav [ID]
	• sauce stats
	• sauce tags
	
	Check <#611395389995876377> for more details!`.replace(/\t/gm, '');

	embed.setTitle('Commands');
	embed.setThumbnail('https://cdn.discordapp.com/avatars/607661949194469376/bd5e5f7dd5885f941869200ed49e838e.png?size=256');
	embed.setAuthor({
		name: 'Sriracha',
		iconURL: 'https://cdn.discordapp.com/avatars/607661949194469376/bd5e5f7dd5885f941869200ed49e838e.png?size=256',
		url: 'https://wholesomelist.com',
	});
	embed.setDescription(str);
	embed.setColor('#FF0625');
	embed.setTimestamp(new Date());
	embed.addFields({
		name: 'Statuses:',
		value: '• 1: New Finds\n• 2: Unsorted\n• 3: Final Check\n• 4: Final List\n• 5: Under Review\n• 6: Licensed Unsorted\n• 7-8: **DO NOT TOUCH**\n• 9: Final Licensed',
		inline: false,
	});
	embed.setFooter({
		text: `API Ping: ${bot.ws.ping}ms, Message Latency: *Pinging...*`,
		iconURL: 'https://cdn.discordapp.com/avatars/607661949194469376/bd5e5f7dd5885f941869200ed49e838e.png?size=256',
	});
	const timestamp = Date.now();

	message.channel.send({ embeds: [embed] }).then((m) => {
		embed.setFooter({
			text: `API Ping: ${bot.ws.ping}ms, Message Latency: ${Date.now() - timestamp}ms`,
			iconURL: 'https://cdn.discordapp.com/avatars/607661949194469376/bd5e5f7dd5885f941869200ed49e838e.png?size=256',
		});
		m.edit({ embeds: [embed] });
	});
}

/**
 *
 * @param {Discord.Message} message
 */
async function stats(message: Message) {
	try {
		const rows = await sheets.get('FINAL LIST');

		const len = rows.length;
		const parodies: Record<string, number> = {};
		const tags: Record<string, number> = {};
		const freq = rows.reduce(
			function (out: Record<string, number>, e: object, i: number) {
				const r = new Row(e);
				out[r.tier!] += 1;

				if (r.parody) {
					if (parodies[r.parody]) parodies[r.parody] += 1;
					else parodies[r.parody] = 1;
				}
				if (r.tags?.length ?? 0 > 0) {
					for (const j in r.tags) { // yes this is horribly messy. cry about it
						if (tags[r.tags[j as keyof typeof r.tags] as keyof typeof tags]) {
							tags[r.tags[j as keyof typeof r.tags] as keyof typeof tags] += 1;
						} else {
							tags[r.tags[j as keyof typeof r.tags] as keyof typeof tags] = 1;
						}
					}
				}

				if (r.hm) {
					out.hm += 1;
				}
				if (r.nh) {
					out.nh += 1;
				}
				if (r.eh) {
					out.eh += 1;
				}
				if (r.im) {
					out.im += 1;
				}
				return out;
			},
			{
				S: 0,
				'S-': 0,
				'A+': 0,
				A: 0,
				'A-': 0,
				'B+': 0,
				B: 0,
				'B-': 0,
				'C+': 0,
				C: 0,
				'C-': 0,
				'D+': 0,
				D: 0,
				'D-': 0,
				hm: 0,
				nh: 0,
				eh: 0,
				im: 0,
			}
		);
		//build container
		const math = {
			len: len,
			parodies: parodies,
			tags: tags,
			freq: freq,
			percentages: [
				Math.floor((freq.S / len) * 1000) / 10,
				Math.floor((freq['S-'] / len) * 1000) / 10,
				Math.floor((freq['A+'] / len) * 1000) / 10,
				Math.floor((freq.A / len) * 1000) / 10,
				Math.floor((freq['A-'] / len) * 1000) / 10,
				Math.floor((freq['B+'] / len) * 1000) / 10,
				Math.floor((freq.B / len) * 1000) / 10,
				Math.floor((freq['B-'] / len) * 1000) / 10,
				Math.floor((freq['C+'] / len) * 1000) / 10,
				Math.floor((freq.C / len) * 1000) / 10,
				Math.floor((freq['C-'] / len) * 1000) / 10,
				Math.floor((freq['D+'] / len) * 1000) / 10,
				Math.floor((freq.D / len) * 1000) / 10,
				Math.floor((freq['D-'] / len) * 1000) / 10,
			],
		};

		//--------------------------
		//Commence embed paginated
		//--------------------------

		//filter which reactions are allowed
		const filter = (reaction: MessageReaction, user: User) => {
			return ['⬅', '➡', '❌'].includes(reaction.emoji.name!) && !user.bot;
		};

		const pages = [stats0, statsHalf, stats1, stats2]; //very clever!

		await message.channel.send({ embeds: [pages[0](layout(new Discord.EmbedBuilder()), math)] }).then(async (message) => {
			await message.react('➡');
			await message.react('❌');
			const collector = message.createReactionCollector({ filter, time: 60000 });
			let status = 0;
			//keep track of which page we're on

			collector.on('collect', async (reaction) => {
				await message.reactions.removeAll(); //get first reactions and clear existing reaction

				if (reaction.emoji.name === '➡') {
					status++;
				} else if (reaction.emoji.name === '⬅') {
					status--;
				} else {
					return;
				} //handle reaction responses
				//edit with new embed, reconstruct new embed every time
				message.edit({ embeds: [pages[status](layout(new Discord.EmbedBuilder()), math)] });

				if (status > 0) await message.react('⬅');
				if (status < pages.length - 1) await message.react('➡');
				await message.react('❌');
				//limit reactions
			});
		});

		return true;
	} catch (e) {
		logError(message, e);
		return false;
	}
}

/**
 *
 * @param {*} message
 */
function tags(message: Message) {
	const embed = new Discord.EmbedBuilder();

	embed.setTitle('List of all tags used');
	embed.setAuthor({
		name: 'Sriracha',
		iconURL: 'https://cdn.discordapp.com/avatars/607661949194469376/bd5e5f7dd5885f941869200ed49e838e.png?size=256',
		url: 'https://wholesomelist.com',
	});
	embed.setDescription(validTags.map(i => '• ' + i).sort().join('\n'));
	embed.setColor('#FF0625');
	embed.setTimestamp(new Date());
	embed.setFooter({
		text: `Vanilla God List`,
		iconURL: 'https://cdn.discordapp.com/avatars/607661949194469376/bd5e5f7dd5885f941869200ed49e838e.png?size=256',
	});

	message.channel.send({ embeds: [embed] });
}

function torpedo(percent: number) {
	return ('' + percent).slice(0, 5);
}

//************************ */
//-----EMBED BUILDERS-----
//************************ */
function layout(embed: EmbedBuilder) {
	embed.setTitle('Statistics for the Wholesome God List (tm)');
	embed.setFooter({
		text: 'committing tax fraud since',
		iconURL: 'https://cdn.discordapp.com/avatars/607661949194469376/bd5e5f7dd5885f941869200ed49e838e.png?size=256',
	});
	embed.setColor('#FF0625');
	embed.setTimestamp(new Date());
	embed.setDescription('Committing white collar crimes since 2019');
	embed.setThumbnail('https://proxy.duckduckgo.com/iu/?u=https%3A%2F%2Fi.ytimg.com%2Fvi%2F9Mh0KHEtNPE%2Fmaxresdefault.jpg');
	return embed;
}

function stats0(embed: EmbedBuilder, { len, freq, percentages }: { len: number; freq: Record<string, number>; percentages: number[] }) {
	//TODO get total things
	embed.setColor('#FF0625');
	embed.setTimestamp(new Date());
	embed.setDescription('General Statistics');
	embed.addFields(
		{ name: 'TOTAL', value: `${len} doujins`, inline: true },
		{
			name: 'All S tiers',
			value: `${freq.S + freq['S-']} total\n${percentages[0] + percentages[1]}% of list`,
			inline: true,
		},
		{
			name: 'All A tiers',
			value: `${freq.A + freq['A-'] + freq['A+']} total\n${torpedo(percentages[2] + percentages[3] + percentages[4])}% of list`,
			inline: true,
		},
		{
			name: 'All B tiers',
			value: `${freq.B + freq['B-'] + freq['B+']} total\n${torpedo(percentages[5] + percentages[6] + percentages[7])}% of list`,
			inline: true,
		},
		{
			name: 'All C tiers',
			value: `${freq.C + freq['C-'] + freq['C+']} total\n${torpedo(percentages[8] + percentages[9] + percentages[10])}% of list`,
			inline: true,
		},
		{
			name: 'All D tiers',
			value: `${freq.D + freq['D-'] + freq['D+']} total\n${torpedo(percentages[11] + percentages[12] + percentages[13])}% of list`,
			inline: true,
		},
		{ name: 'Hmarket.io', value: `${freq.hm} total`, inline: true },
		{ name: 'nhentai.net', value: `${freq.nh} total`, inline: true },
		{ name: 'E-Hentai.net', value: `${freq.eh} total`, inline: true },
		{ name: 'Imgur.com', value: `${freq.im} total`, inline: true }
	);
	return embed;
}

function statsHalf(embed: EmbedBuilder, { freq, percentages, len }: { len: number; freq: Record<string, number>; percentages: number[] }) {
	embed.setDescription('Detailed Tier Distribution');
	embed.addFields(
		{ name: 'TOTAL', value: `${len} doujins`, inline: true },
		{ name: 'S Tier', value: `${freq.S} total\n${percentages[0]}% of list`, inline: true },
		{ name: 'S- Tier', value: `${freq['S-']} total\n${percentages[1]}% of list`, inline: true },
		{ name: 'A+ Tier', value: `${freq['A+']} total\n${percentages[2]}% of list`, inline: true },
		{ name: 'A Tier', value: `${freq.A} total\n${percentages[3]}% of list`, inline: true },
		{ name: 'A- Tier', value: `${freq['A-']} total\n${percentages[4]}% of list`, inline: true },
		{ name: 'B+ Tier', value: `${freq['B+']} total\n${percentages[5]}% of list`, inline: true },
		{ name: 'B Tier', value: `${freq.B} total\n${percentages[6]}% of list`, inline: true },
		{ name: 'B- Tier', value: `${freq['B-']} total\n${percentages[7]}% of list`, inline: true },
		{ name: 'C+ Tier', value: `${freq['C+']} total\n${percentages[8]}% of list`, inline: true },
		{ name: 'C Tier', value: `${freq.C} total\n${percentages[9]}% of list`, inline: true },
		{ name: 'C- Tier', value: `${freq['C-']} total\n${percentages[10]}% of list`, inline: true },
		{ name: 'D+ Tier', value: `${freq['D+']} total\n${percentages[11]}% of list`, inline: true },
		{ name: 'D Tier', value: `${freq.D} total\n${percentages[12]}% of list`, inline: true },
		{ name: 'D- Tier', value: `${freq['D-']} total\n${percentages[13]}% of list`, inline: true }
	);
	return embed;
}

function stats1(embed: EmbedBuilder, { parodies }: { parodies: Record<string, number> }) {
	let str = '';
	let count = 1;

	const sortable = [];
	for (const parody in parodies) {
		sortable.push([parody, parodies[parody]]);
	}
	sortable.sort((a, b) => {
		return a[0] > b[0] ? 1 : a[0] < b[0] ? -1 : 0;
	});

	for (let i = 0; i < sortable.length; i++) {
		if (str.length < 950) str += `${sortable[i][0]}: ${sortable[i][1]}\n`; //the value of a field is limited to 1024 characters, use 950 to avoid issues
		else {
			embed.addFields({ name: 'Parodies ' + count++, value: str, inline: true });
			str = `${sortable[i][0]}: ${sortable[i][1]}\n`;
		}
	}
	embed.addFields({ name: 'Parodies ' + count++, value: str, inline: true });
	return embed;
}

function stats2(embed: EmbedBuilder, { tags }: { tags: Record<string, number> }) {
	const sortable = [];
	for (const tag in tags) {
		sortable.push([tag, tags[tag]]);
	}
	sortable.sort((a, b) => {
		return +b[1] - +a[1];
	});

	let str = '';
	for (let i = 0; i < sortable.length; i++) {
		str += `${sortable[i][0]}: ${sortable[i][1]}\n`;
	}
	embed.addFields({ name: 'Tags', value: str });
	return embed;
}
