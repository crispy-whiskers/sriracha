var add = require('./add');
var del = require('./delete');
var Discord = require('discord.js');
var Row = require('../row');
var info = require('../config/globalinfo.json');
var log = require('./log');
var sheets = require('../sheetops');

/**
 * Moves a row by adding an entry and deleting it.
 * @param {Discord.Message} message Discord's message object.
 * @param {Number} list The list of the entry.
 * @param {Number} ID The entry's ID.
 * @param {Number} dest The destination ID.
 */
async function move(message, list, ID, dest) {
	if (list > info.sheetNames.length || dest > info.sheetNames.length || list <= 0 || dest <= 0) {
		message.channel.send('Cannot move to / from a nonexistent sheet!');
		return false;
	}
	let name = info.sheetNames[list];

	try {
		let rows = await sheets.get(name);

		if (ID <= 0 || ID > rows.length) {
			message.channel.send('Cannot get nonexistent row!');
			return false;
		}
		let data = new Row(rows[ID - 1]);

		let [addSucceeded, delSucceeded] = await Promise.all([add.add(message, dest, data), del(message, list, ID)])
		//send both at the same time to reduce total time
		return addSucceeded && delSucceeded;
	} catch (e) {
		log.logError(message, e);
		return false;
	}
}

module.exports = move;
