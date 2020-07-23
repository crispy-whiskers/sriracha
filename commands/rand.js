var Row = require('../row');
var Discord = require('discord.js');
var info = require('../config/globalinfo.json');
var log = require('./log');
var misc = require('./misc');
var sheets = require('../sheetops');

/**
 * Gets a random doujin from a sheet.
 * @param {Discord.Message} message
 * @param {Number} list
 */
async function rand(message, list) {
	if (list <= 0 || list > info.sheetNames.length) {
		message.channel.send('Cannot get random from a nonexistent sheet!');
		return false;
	}

	try {
		const rows = await sheets.get('FINAL LIST');
		let ID = Math.floor(Math.random() * rows.length + 1);

		let target = new Row(rows[ID-1]);

		await message.channel.send(misc.embed(target, list, ID, message));

		return true;
	} catch (e) {
		log.logError(message, e);
		return false;
	}
}

module.exports = rand;
