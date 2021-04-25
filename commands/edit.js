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
			if (flags[property].toLowerCase() === "clear") {
				flags[property] = null;
			}
		}

		//misc editing detected!!
		if(flags.addalt || flags.delalt || flags.addseries || flags.delseries || flags.summary || flags.fav || flags.fav === null) {
			let miscField = JSON.parse(target.misc ?? '{}');
			
			if(flags.addalt) {
				if(!miscField.altLinks) {
					miscField.altLinks = [];
				}
				let altLinks = flags.addalt.split(',').map((s) => s.trim());
				miscField.altLinks.push({
					link: altLinks[0],
					name: altLinks[1]
				});	
				//create object structure if necessary and push the necessary info to the array
			}

			if(flags.delalt) {
				if (miscField.altLinks) {
					for (let i = miscField.altLinks.length - 1; i >= 0; i--) {
						if (miscField.altLinks[i].name === flags.delalt) {
							miscField.altLinks.splice(i, 1);
						} //delete operations calls for splicing the array to the requested field
					}
				}
				if (miscField.altLinks.length === 0) {
					delete miscField.altLinks; //get rid of the object structure if theres nothing left after delete
				}
			}

			if(flags.addseries) {
				if (!miscField.series) {
					miscField.series = [];
				}
				let series = flags.addseries.split(',').map((s) => s.trim());
				miscField.series.push({
					name: series[0],
					type: series[1],
					number: +series[2]
				});	//same as adding an altlink above
			}

			if(flags.delseries) {
				if (miscField.series) {
					for (let i = miscField.series.length - 1; i >= 0; i--) {
						if (miscField.series[i].name === flags.delseries) {
							miscField.series.splice(i, 1);
						} //same as delalt operation above
					}
				}
				if (miscField.series.length === 0) {
					delete miscField.series;
				}
			}
			if (flags.fav === null) {
				delete miscField.favorite;
			} //favorites are just a single field, easy to add and remove
			if(flags.fav) {
				miscField.favorite = flags.fav;
			}

			if(flags.summary) {
				miscField.summary = flags.summary;
			}

			if(flags.summary === null ){
				delete miscField.summary;
			}

			if(Object.keys(miscField).length === 0) {
				target.misc = null;
			} else {
				target.misc = JSON.stringify(miscField);
			}
		}

		let r = new Row(flags);

		target.update(r);
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
