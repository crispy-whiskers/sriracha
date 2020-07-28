var Row = require('../row');
var Discord = require('discord.js');
var info = require('../config/globalinfo.json');
var log = require('./log');
var misc = require('./misc');

var add = require('../commands/add');
var del = require('../commands/delete');
var sheets = require('../sheetops');

/**
 * Features a row from a sheet.
 * @param {Discord.Message} message
 * @param {Number} list
 * @param {Number} ID
 * @param {*} flags
 */
async function feature(message, list, ID, flags) {
	if (list != 4) {
		message.channel.send('Cannot feature unchecked doujins!');
		return false;
	}

	if (typeof flags.l === 'undefined') {
		message.channel.send('Please supply an image link with `-l`!');
		return false;
	}

	try {

		const rows = await sheets.get('FINAL LIST');

		if (ID <= 0 || ID > rows.length) {
			message.channel.send(`Cannot feature nonexistent row! The last entry in this sheet is \`${list}#${rows.length}\``);
			return false;
		}

		let row = new Row(rows[ID - 1]);

		const featRows = await sheets.get('SITEDATA');

		if (featRows.length > 8) {
			await del(message, 7, 1);
		}

		await sheets.append('SITEDATA', [row.link, row.title, row.author, row.tier, flags.l]);
		message.channel.send('Featured entry!');
		await misc.fUpdate();
		message.channel.send('Updated website!');
		return true;
	} catch (e) {
		log.logError(message, e);
		return false;
	}
}
/**
 * Clears features.
 * @param {Discord.Message} message
 */
async function clear(message) {
	try {
		sheets.delete('SITEDATA', 1, 10); //theoretically, never more than 8
		message.channel.send('Cleared features!');
	} catch (e) {
		log.logError(message, e);
		return false;
	}
}

module.exports.feature = feature;
module.exports.clear = clear;
