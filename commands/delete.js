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

	if(list <= 0 || list > info.sheetNames.length){
        message.channel.send('Cannot delete from a nonexistent sheet!')
        return false;
    }

	try {
		let sheet = docs.sheetsById[info.sheetIds[list]];
		const rows = await sheet.getRows();

		if (ID == 0 || ID > rows.length) {
			message.channel.send(`Cannot delete nonexistent row! The last entry in this sheet is \`${list}#${rows.length}\``);
			return false;
		}
		
		await rows[ID - 1].delete();
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
