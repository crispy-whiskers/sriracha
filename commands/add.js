const { GoogleSpreadsheet } = require("google-spreadsheet");
var Row = require("../row");
var Discord = require("discord.js");
var info = require("../config/globalinfo.json");
var log = require("./log");
var pFetch = require("./page");
var misc = require("./misc");
var del = require("./delete");

/**
 * Secondhand function to accept flag object.
 * @param {GoogleSpreadsheet} docs
 * @param {Discord.Message} message
 * @param {Number} list
 * @param {*} flags
 */
async function flagAdd(docs, message, flags) {
	if (!flags.hasOwnProperty("l")) {
		message.channel.send("Please provide a link with the `-l` flag!");
	}

	flags.l = flags.l.replace("http://", "https://");
	let row = new Row(flags);
	let list = flags?.s ?? 1;

	return add(docs, message, list, row);
}

/**
 * Main function that takes a row.
 * @param {GoogleSpreadsheet} docs
 * @param {Discord.Message} message
 * @param {Number} list
 * @param {Row} row
 */
async function add(docs, message, list, row) {
	await docs.loadInfo();

	if (list <= 0 || list > info.sheetNames.length) {
		message.channel.send("Cannot add to a nonexistent sheet!");
		return false;
	}

	if (list == 4) {
		for (let x = 0; x < 3; x++) {
			try {
				row.page = await pFetch(row.link);
				if (row.page == -1) continue;
				break;
			} catch (e) {
				await new Promise((resolve, reject) => setTimeout(resolve, 500));
			}
		}
		if (row.page == -1) {
			message.channel.send("Failed to get page numbers! Please set it manually with `-pg`.");
		}
	}

	try {
		let sheet = docs.sheetsById[info.sheetIds[list]];
		let newRow = await sheet.addRow(row.toArray());
		await message.channel.send(`Successfully added \`${list}#${newRow.rowNumber - 1}\`!`);

		if (list == 4) {
			await misc.update();
			//update public server
			let embed = misc.embed(row, -1, -1, message);
			embed.setFooter("Wholesome God List");

			log.updatePublicServer(embed);

			let s = docs.sheetsById["" + info.sheetIds[8]];
			const featRows = await s.getRows();

			if (featRows.length > 10) {
				await del(docs, message, 8, 0);
			}

			await s.addRow([row.title, row.link, row.author, row.tier, +Date.now()]);
			message.channel.send("Updated public server / website!");
		}

		return true;
	} catch (e) {
		log.logError(message, e);
		return false;
	}
}

module.exports.add = add;
module.exports.fAdd = flagAdd;
