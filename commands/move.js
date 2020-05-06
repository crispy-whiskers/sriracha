const { GoogleSpreadsheet } = require('google-spreadsheet');
var add = require('./add');
var del = require('./delete');
var Discord = require('discord.js');
var Row = require('../row');
var info = require('../config/globalinfo.json');
var log = require('./log');

/**
 * Moves a row by adding an entry and deleting it.
 * @param {GoogleSpreadsheet} docs The spreadsheet.
 * @param {Discord.Message} message Discord's message object.
 * @param {Number} list The list of the entry.
 * @param {Number} ID The entry's ID.
 * @param {Number} dest The destination ID.
 */
async function move(docs, message, list, ID, dest) {
	if (list > info.sheetNames.length || dest > info.sheetNames.length || list <= 0 || dest <= 0) {
		message.channel.send('Cannot move to / from a nonexistent sheet!');
		return false;
	}

	await docs.loadInfo();

	try {
		let sheet = docs.sheetsById[info.sheetIds[list]];
		let rows = await sheet.getRows();

		if (ID <= 0 || ID > rows.length) {
			message.channel.send('Cannot get nonexistent row!');
			return false;
		}
		let data = new Row(rows[ID - 1]._rawData);

		let addSucceeded = await add.add(docs, message, dest, data);
		let delSucceeded = await del(docs, message, list, ID);
		return addSucceeded && delSucceeded;
	} catch (e) {
		log.logError(message, e);
		return false;
	}
}

module.exports = move;
