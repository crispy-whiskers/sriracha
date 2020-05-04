const { GoogleSpreadsheet } = require('google-spreadsheet');
var Row = require('../row');
var Discord = require('discord.js');
var info = require('../config/globalinfo.json');
var log = require('./log');
var misc = require('./misc');

/**
 * Deletes a row from a sheet.
 * @param {GoogleSpreadsheet} docs
 * @param {Discord.Message} message
 * @param {Number} list
 * @param {Number} ID
 */
async function del(docs, message, list, ID) {
	await docs.loadInfo();

	try {
		let sheet = docs.sheetsById['' + info.sheetIds[list]];
		const rows = await sheet.getRows();

		if (ID == 0 || ID > rows.length) {
			message.channel.send('Cannot delete nonexistent row!');
			return false;
		}
		
		await rows[ID - 1].delete();

		if (list == 4) {
			misc.update();
		}
		return true;
	} catch (e) {
		log.logError(message, e);
		return false;
	}
}

module.exports = del;
