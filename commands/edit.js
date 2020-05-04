const { GoogleSpreadsheet } = require('google-spreadsheet');
var Row = require('../row');
var Discord = require('discord.js');
var info = require('../config/globalinfo.json');
var log = require('./log');
var misc = require('./misc');

/**
 * Edits a row from a sheet.
 * @param {GoogleSpreadsheet} docs
 * @param {Discord.Message} message
 * @param {Number} list
 * @param {Number} ID
 * @param {*} flags
 */
async function edit(docs, message, list, ID, flags) {
	
    await docs.loadInfo();

	try {
        let sheet = docs.sheetsById['' + info.sheetIds[list]];
        const rows = await sheet.getRows();

        if (ID == 0 || ID > rows.length) {
            message.channel.send('Cannot edit nonexistent row!');
            return false;
        }

        let target = new Row(rows[ID - 1]._rawData)
        let r = new Row(flags);
        target.update(r);

        rows[ID - 1]._rawData = target.toArray();

        rows[ID - 1].save();

		if (list == 4) {
			misc.update();
        }
        return true;
	} catch (e) {
        log.logError(message, e);
        return false;
    }
}
module.exports = edit;
