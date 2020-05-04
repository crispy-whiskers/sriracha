const { GoogleSpreadsheet } = require('google-spreadsheet');
var Row = require('../row');
var Discord = require('discord.js');
var info = require('../config/globalinfo.json');
var log = require('./log');
var misc = require('./misc');

var add = require('../commands/add')
var del = require('../commands/delete');
/**
 * Features a row from a sheet.
 * @param {GoogleSpreadsheet} docs
 * @param {Discord.Message} message
 * @param {Number} list
 * @param {Number} ID
 * @param {*} flags
 */
async function feature(docs, message, list, ID, flags) {
	
    await docs.loadInfo();
    if(list!=4){
        message.channel.send('Cannot feature unchecked doujins!')
        return false;
    }

    if(typeof flags.l === "undefined"){
        message.channel.send('Please supply an image link with `-l`!')
        return false;
    }

    try{
        let sheet = docs.sheetsById[info.sheetIds[list]];
        const rows = await sheet.getRows();

        if (ID <= 0 || ID > rows.length) {
            message.channel.send(`Cannot feature nonexistent row! The last entry in this sheet is \`${list}#${rows.length}\``);
            return false;
        }
        
        let row = new Row(rows[ID-1]._rawData);
        //delete first row if length > 8

        if(rows.length > 8){
            await del(docs, message, 7, 0);
        }

        let s = docs.sheetsById['' + info.sheetIds[7]];
        await s.addRow([row.link, row.author, row.tier, flags.l])
        message.channel.send('Featured entry!')
        await misc.fUpdate();
        message.channel.send('Updated website!')
        return true;
    } catch(e){
        log.logError(message, e);
        return false;
    }

}

module.exports = feature;