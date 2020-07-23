var Row = require('../row');
var Discord = require('discord.js');
var info = require('../config/globalinfo.json');
var log = require('./log');
var misc = require('./misc');
var sheets = require('../sheetops');

/**
 * Features a row from a sheet.
 * @param {Discord.Message} message
 * @param {Number} list
 * @param {Number} ID
 * @param {*} flags
 */
async function lc(message, list, ID) {
	if (list <= 0 || list > info.sheetNames.length) {
		message.channel.send('Cannot lc from a nonexistent sheet!');
		return false;
	}
	let name = info.sheetNames[list];

	try {
		const rows = await sheets.get(name);

		if (ID <= 0 || ID > rows.length) {
			message.channel.send('Cannot lc nonexistent row!');
			return false;
		}

		const filter = (reaction, user) => {
			return ['🇯🇵', '🇺🇸', '❌'].includes(reaction.emoji.name) && user.id === message.author.id;
		};
		let r = new Row(rows[ID]);

		message.channel.send('**React with the corresponding language.**');

		await message.channel.send(misc.embed(r, list, ID, message)).then(async (message) => {
			await message.react('🇺🇸');
			await message.react('🇯🇵');
			await message.react('❌');
			message
				.awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] })
				.then((collected) => {
					const reaction = collected.first();

					if (reaction.emoji.name === '🇯🇵') {
						message.channel.send(`.lc -l ${r.link} -a ${r.author} -t ${r.title} -jp`);
					} else if (reaction.emoji.name === '🇺🇸') {
						message.channel.send(`.lc -l ${r.link} -a ${r.author} -t ${r.title} -en`);
					} else {
						message.channel.send('Cancelled process.');
						resolve();
					}
				})
				.catch((collected) => {
					message.channel.send('Stopped listening for reactions.');
				});
		});

		return true;
	} catch (e) {
		log.logError(message, e);
		return false;
	}
}
module.exports = lc;
