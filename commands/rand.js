const { GoogleSpreadsheet } = require('google-spreadsheet');
var Row = require('../row');
var Discord = require('discord.js');
var info = require('../config/globalinfo.json');
var log = require('./log');
var misc = require('./misc');

/**
 * Gets a random doujin from a sheet.
 * @param {GoogleSpreadsheet} docs
 * @param {Discord.Message} message
 * @param {Number} list
 */
async function rand(docs, message, list) {
    await docs.loadInfo();

    if(list <= 0 || list > info.sheetNames.length){
        message.channel.send('Cannot get random from a nonexistent sheet!')
        return false;
    }

    try {
        let sheet = docs.sheetsById[info.sheetIds[list]];
        const rows = await sheet.getRows();
        let ID = Math.floor((Math.random() * rows.length) + 1);

        let target = new Row(rows[ID - 1]._rawData);

        await message.channel.send(misc.embed(target, list, ID, message))

        return true;
    } catch(e) {
        log.logError(message, e);
		return false;
    }
}

module.exports = rand;