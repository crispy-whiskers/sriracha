const { GoogleSpreadsheet } = require('google-spreadsheet');
var Row = require('../row');
var Discord = require('discord.js');
var info = require('../config/globalinfo.json');
var log = require('./log');

/**
 * @param {GoogleSpreadsheet} docs
 * @param {Discord.Message} message
 * @param {Number} list
 */
async function add(docs, message, list, flags) {
	await docs.loadInfo();

	if (!flags.hasOwnProperty('l')) {
		message.channel.send('Please provide a link with the `-l` flag!');
    }
    
    flags.l = flags.l.replace('http://', 'https://');
	let row = new Row(flags);

	if (list == 4) {
		try{
			
		} catch(e){
			
		}
	}
	try {
		let sheet = docs.sheetsById['' + info.sheetIds[list]];
		let r = await sheet.addRow(row.toArray());
		await message.channel.send(`Successfully added \`${list}#${r.rowNumber - 1}\``);
		return true;
	} catch (e) {
		log.logError(message, e);
		return false;
	}
}
module.exports = add;
