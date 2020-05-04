const { GoogleSpreadsheet } = require('google-spreadsheet');
var Discord = require('discord.js');
var Row = require('../row');
var axios = require('axios').default;
var log = require('./log');

function update() {
	return axios.post('https://wholesomelist.com/post', { type: 'update' });
}

function fUpdate() {
	return axios.post('https://wholesomelist.com/post', { type: 'feature' });
}

function isUrl(s) {
    var regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
    return regexp.test(s);
}

/**
 * 
 * @param {Row} row 
 * @param {number} sheet 
 * @param {number} id 
 * @param {Discord.Message} message 
 */
function entryEmbed(row, sheet, id, message) {
	const embed = new Discord.MessageEmbed();

	if (isUrl(row.link)) {
		embed.setURL(row.link);
	} else {
		if (row.link) message.channel.send(`**Warning: entry does not have a proper link of **\`${row.link}\`.`);
		else message.channel.send('No results or improperly formatted row!');
	}
	
	if (row.author) embed.setDescription('by ' + row.author);
	else embed.setDescription('No listed author');

    
	embed.addField('Warnings', row.warning ?? 'None', true)
	embed.addField('Parody', row.parody ?? 'None', true)
    embed.addField('Tier', row.tier ?? 'Not set', true)
    embed.addField('Page#', row.page ?? 'Not set', true)
    embed.setFooter('ID: ' + sheet + '#' + id)
    embed.setTitle(row.title ?? row.link)
    embed.setTimestamp(new Date().toISOString())
    embed.setColor('#FF0625');

	var str = '';
	if ((row.tags?.length ?? 0) > 0) {
		row.tags.forEach((e) => {
			str += ` ${e},`;
		});
		str = str.replace('undefined', '');
		str = str.substring(0, str.length - 1).trim();
		embed.addField('Tags', str);
	} else embed.addField('Tags', 'Not set');

	return embed;
}
module.exports.update = update;
module.exports.fUpdate = fUpdate;
module.exports.embed = entryEmbed;
