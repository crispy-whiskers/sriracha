var Row = require('../row');
var Discord = require('discord.js');
var info = require('../config/globalinfo.json');
var log = require('./log');
var misc = require('./misc');
var sheets = require('../sheetops');

/**
 * Edits a row from a sheet.
 * @param {Discord.Message} message
 * @param {Number} list
 * @param {Number} ID
 * @param {*} flags
 */
async function edit(message, list, ID, flags) {
	if (list <= 0 || list > info.sheetNames.length) {
		message.channel.send('Cannot edit from a nonexistent sheet!');
		return false;
	}
	let name = info.sheetNames[list];

	try {
		const rows = await sheets.get(name);

		if (ID == 0 || ID > rows.length) {
			message.channel.send(`Cannot get nonexistent row! The last entry in this sheet is \`${list}#${rows.length}\``);
			return false;
		}

		let target = new Row(rows[ID - 1]);
		for (let property in flags) {
			if (flags[property].match(/clear/i)) {
				flags[property] = null;
			}
		}
		let r = new Row(flags);

		target.update(r);
		console.log(target)
		if (flags?.rtag) {
			if (list === 1) {
				message.channel.send(
					"**Don't edit tags in `New Finds`! Make sure it has been QCed before moving them to `Unsorted` to apply tags!**"
				);
			} else if (target.rtag(flags.rtag)) {
				message.channel.send(`Successfully deleted the \`${flags.rtag}\` tag in entry \`${list}#${ID}\`!`);
			} else {
				message.channel.send(`Entry \`${list}#${ID}\` did not contain the tag \`${flags.rtag}\`.`);
			}
		}
		if (flags?.atag) {
			if (list === 1) {
				message.channel.send(
					"**Don't edit tags in `New Finds`! Make sure it has been QCed before moving them to `Unsorted` to apply tags!**"
				);
			} else {
				if (target.atag(flags.atag)) {
					message.channel.send(`Successfully added the \`${flags.atag}\` tag to entry \`${list}#${ID}\`!`);
					console.log('a')
				} else {
					message.channel.send('Improperly formatted tag! Try capitalizing or removing unneeded characters.');
				}
			}
		}
		
		//convert back to A1
		await sheets.overwrite(name, ID + 1, target.toArray());

		message.channel.send(`\`${list}#${ID}\` updated successfully!`);

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
edit({channel:{send:function(string){}}}, 9, 2, {t:'nuuuu'})
