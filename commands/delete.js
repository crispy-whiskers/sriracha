var Row = require('../row');
var Discord = require('discord.js');
var info = require('../config/globalinfo.json');
var log = require('./log');
var misc = require('./misc');
var sheets = require('../sheetops');

/**
 * Deletes a row from a sheet.
 * @param {Discord.Message} message
 * @param {Number} list
 * @param {Number} ID
 */
async function del(message, list, ID) {
	if (list <= 0 || list > info.sheetNames.length) {
		message.channel.send('Cannot delete from a nonexistent sheet!');
		return false;
	}
	let name = info.sheetNames[list];

	try {
		const rows = await sheets.get(name);

		if (ID == 0 || ID > rows.length) {
			message.channel.send(`Cannot delete nonexistent row! The last entry in this sheet is \`${list}#${rows.length}\``);
			return false;
		}
		log.log("Deleted `" + JSON.stringify(new Row(rows[ID - 1])) + "`");

		await sheets.delete(name, ID);
		message.channel.send(`Successfully deleted \`${list}#${ID}\`!`);

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
