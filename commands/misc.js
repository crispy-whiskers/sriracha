var Discord = require('discord.js');
var Row = require('../row');
var axios = require('axios').default;
var log = require('./log');
var info = require('../config/globalinfo.json');
var sheets = require('../sheetops');

function update() {
	return axios.post('https://wholesomelist.com/post', { type: 'update' });
}

function fUpdate() {
	return axios.post('https://wholesomelist.com/post', { type: 'feature' });
}

function isUrl(s) {
	var regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
	return regexp.test(s);
}

/**
 *
 * @param {Row} row
 * @param {number} list
 * @param {number} id
 * @param {Discord.Message} message
 */
function entryEmbed(row, list, ID, message) {
	const embed = new Discord.MessageEmbed();

	if (isUrl(row.link)) {
		embed.setURL(row.link);
	} else {
		if (message)
			if (row.link) message.channel.send(`**Warning: entry does not have a proper link of **\`${row.link}\`.`);
			else message.channel.send('No results or improperly formatted row!');
	}

	if (row.author) embed.setDescription('by ' + row.author);
	else embed.setDescription('No listed author');

	embed.addField('Warnings', row.warning ?? 'None', true);
	embed.addField('Parody', row.parody ?? 'None', true);
	embed.addField('Tier', row.tier ?? 'Not set', true);
	embed.addField('Page#', row.page === -1 ? 'Not set' : row.page, true);
	embed.setFooter('ID: ' + list + '#' + ID);
	embed.setTitle(row.title ?? row.link);
	embed.setTimestamp(new Date().toISOString());
	embed.setColor('#FF0625');

	var str = '';
	if ((row.tags?.length ?? 0) > 0) {
		row.tags.forEach((e) => {
			str += ` ${e},`;
		});
		str = str.replace('undefined', '');
		str = str.substring(0, str.length - 1).trim();
		embed.addField('Tags', str);
	} else embed.addField('Tags', 'Not set');

	return embed;
}

/**
 * 
 * @param {*} message 
 * @param {*} cmd 
 * @param {Discord.Client} bot 
 */
async function misc(message, cmd, bot) {
	if (cmd === 'update') {
		let m = await message.channel.send('Updating the featured and the list...');
		await update();
		await fUpdate();
		m.react('✔️');
	} else if (cmd === 'help') {
		//oh boy
		help(message, bot);
		
	} else if (cmd === 'stats') {
		//oh boy x2
		await stats(message);
	}
}

/**
 * 
 * @param {*} message 
 * @param {Discord.Client} bot
 */
function help(message, bot) {
	const embed = new Discord.MessageEmbed();

	let str = `sauce list [status | -qa queryAll] [-q query] 
	sauce list [id] 
	sauce update
	sauce [help] 
	sauce add [-a author | -t title | -l link] 
	sauce add [[previous options] | -w warning | -p parody | -tr tier | -pg page] 
	sauce move [id] [to status] 
	sauce id [edit any field w/ listed tags] 
	sauce delete [id] 
	sauce feature [id] [-l img link]
	sauce random
	sauce lc [id]
	sauce [id] [-atag tag | -rtag tag]
	sauce stats
	
	Check <#611395389995876377> for more details!`;

	embed.setTitle('Commands');
	embed.setThumbnail('https://cdn.discordapp.com/avatars/607661949194469376/bd5e5f7dd5885f941869200ed49e838e.png?size=256');
	embed.setAuthor(
		'Sriracha',
		'https://cdn.discordapp.com/avatars/607661949194469376/bd5e5f7dd5885f941869200ed49e838e.png?size=256',
		'https://wholesomelist.com'
	);
	embed.setDescription(str);
	embed.setColor('#FF0625');
	embed.setTimestamp(new Date().toISOString());
	embed.addField('Statuses:', 'New Finds: 1\nUnsorted: 2\nFinal Check: 3\nFinal List: 4\nUnder Review: 5\nLicensed: 6', false);
	embed.setFooter(
		`API Ping: ${bot.ws.ping}ms, Message Latency: ${Date.now()-message.createdTimestamp}ms`,
		'https://cdn.discordapp.com/avatars/607661949194469376/bd5e5f7dd5885f941869200ed49e838e.png?size=256'
	);

	message.channel.send(embed);
}
/**
 *
 * @param {Discord.Message} message
 */
async function stats(message) {
	try {
		const rows = await sheets.get('FINAL LIST');

		let len = rows.length;
		let parodies = {};
		let tags = {};
		let freq = rows.reduce(
			function (out, e, i) {
				if (i == 0) return out;
				let r = new Row(e);
				out[r.tier] += 1;

				if (r.parody) {
					if (parodies.hasOwnProperty(r.parody)) parodies[r.parody] += 1;
					else parodies[r.parody] = 1;
				}
				if (r.tags?.length > 0) {
					for (let j in r.tags) {
						if (tags.hasOwnProperty(r.tags[j])) {
							tags[r.tags[j]] += 1;
						} else {
							tags[r.tags[j]] = 1;
						}
					}
				}

				if (r.link?.includes('nhentai')) {
					out.nh += 1;
				} else if (r.link?.includes('imgur')) {
					out.img += 1;
				} else {
					out.other += 1;
				}
				return out;
			},
			{ S: 0, 'S-': 0, 'A+': 0, A: 0, 'A-': 0, 'B+': 0, B: 0, 'B-': 0, 'C+': 0, C: 0, 'C-': 0, 'D+': 0, D: 0, 'D-': 0, nh: 0, img: 0, other: 0 }
		);
		//build container
		let math = {
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
		const filter = (reaction, user) => {
			return ['⬅', '➡', '❌'].includes(reaction.emoji.name) && !user.bot;
		};

		let pages = [stats0, statsHalf, stats1, stats2]; //very clever!

		await message.channel.send(pages[0](layout(new Discord.MessageEmbed()), math)).then(async (message) => {
			await message.react('➡');
			await message.react('❌');
			const collector = message.createReactionCollector(filter, { time: 60000 });
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
				message.edit(pages[status](layout(new Discord.MessageEmbed()), math));

				if (status > 0) await message.react('⬅');
				if (status < pages.length - 1) await message.react('➡');
				await message.react('❌');
				//limit reactions
			});
		});

		return true;
	} catch (e) {
		log.logError(message, e);
		return false;
	}
}

module.exports.update = update;
module.exports.fUpdate = fUpdate;
module.exports.embed = entryEmbed;
module.exports.misc = misc;

//************************ */
//-----EMBED BUILDERS-----
//************************ */
function layout(embed) {
	embed.setTitle('Statistics for the Wholesome God List (tm)');
	embed.setFooter(
		'committing tax fraud since',
		'https://cdn.discordapp.com/avatars/607661949194469376/bd5e5f7dd5885f941869200ed49e838e.png?size=256'
	);
	embed.setColor('#FF0625');
	embed.setTimestamp(new Date().toISOString());
	embed.setDescription('Committing white collar crimes since 2019');
	embed.setThumbnail('https://proxy.duckduckgo.com/iu/?u=https%3A%2F%2Fi.ytimg.com%2Fvi%2F9Mh0KHEtNPE%2Fmaxresdefault.jpg');
	return embed;
}
function stats0(embed, { len, freq, percentages }) {
	//TODO get total things
	embed.setColor('#FF0625');
	embed.setTimestamp(new Date().toISOString());
	embed.setDescription('General Statistics');
	embed.addField('TOTAL', `${len} doujins`, true);
	embed.addField('All S tiers', `${freq.S + freq['S-']} total\n${percentages[0] + percentages[1]}% of list`, true);
	embed.addField('All A tiers', `${freq.A + freq['A-'] + freq['A+']} total\n${percentages[2] + percentages[3] + percentages[4]}% of list`, true);
	embed.addField('All B tiers', `${freq.B + freq['B-'] + freq['B+']} total\n${percentages[5] + percentages[6] + percentages[7]}% of list`, true);
	embed.addField('All C tiers', `${freq.C + freq['C-'] + freq['C+']} total\n${percentages[8] + percentages[9] + percentages[10]}% of list`, true);
	embed.addField('All D tiers', `${freq.D + freq['D-'] + freq['D+']} total\n${percentages[11] + percentages[12] + percentages[13]}% of list`, true);
	embed.addField('nhentai.net', `${freq.nh} total`, true);
	embed.addField('imgur.com', `${freq.img} total`, true);
	embed.addField('Alternative Sources', `Found ${freq.other} doujins from other sources`);
	return embed;
}
function statsHalf(embed, { freq, percentages, len }) {
	embed.setDescription('Detailed Tier Distribution');
	embed.addField('TOTAL', `${len} doujins`, true);
	embed.addField('S Tier', `${freq.S} total\n${percentages[0]}% of list`, true);
	embed.addField('S- Tier', `${freq['S-']} total\n${percentages[1]}% of list`, true);
	embed.addField('A+ Tier', `${freq['A+']} total\n${percentages[2]}% of list`, true);
	embed.addField('A Tier', `${freq.A} total\n${percentages[3]}% of list`, true);
	embed.addField('A- Tier', `${freq['A-']} total\n${percentages[4]}% of list`, true);
	embed.addField('B+ Tier', `${freq['B+']} total\n${percentages[5]}% of list`, true);
	embed.addField('B Tier', `${freq.B} total\n${percentages[6]}% of list`, true);
	embed.addField('B- Tier', `${freq['B-']} total\n${percentages[7]}% of list`, true);
	embed.addField('C+ Tier', `${freq['C+']} total\n${percentages[8]}% of list`, true);
	embed.addField('C Tier', `${freq.C} total\n${percentages[9]}% of list`, true);
	embed.addField('C- Tier', `${freq['C-']} total\n${percentages[10]}% of list`, true);
	embed.addField('D+ Tier', `${freq['D+']} total\n${percentages[11]}% of list`, true);
	embed.addField('D Tier', `${freq.D} total\n${percentages[12]}% of list`, true);
	embed.addField('D- Tier', `${freq['D-']} total\n${percentages[13]}% of list`, true);
	return embed;
}
function stats1(embed, { parodies }) {
	let str = '';
	let count = 1;
	for (let k in parodies) {
		if (str.length < 600) str += `${k}: ${parodies[k]}\n`;
		else {
			embed.addField('Parodies ' + count++, str, true);
			str = `${k}: ${parodies[k]}\n`;
		}
	}
	embed.addField('Parodies ' + count++, str, true);
	return embed;
}
function stats2(embed, { tags }) {
	str = '';
	for (let k in tags) {
		str += `${k}: ${tags[k]}\n`;
	}
	embed.addField('Tags', str);
	return embed;
}
