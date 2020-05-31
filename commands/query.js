const { GoogleSpreadsheet } = require('google-spreadsheet');
var Row = require('../row');
var Discord = require('discord.js');
var info = require('../config/globalinfo.json');
var log = require('./log');
var misc = require('./misc');

/**
 *
 * @param {*} arr
 * @param {*} val
 */
function includes(arr, val) {
	if (val === 'A' || val === 'B' || val === 'C' || val === 'D' || val === 'S') {
		return arr[5] === val;
	}
	for (let i = 0; i < arr.length; i++) {
		if (arr[i].trim().toLowerCase().indexOf(val.toLowerCase()) > -1) {
			return true;
		}
	}
	return false;
}

/**
 * Queries a specific sheet.
 * @param {GoogleSpreadsheet} docs
 * @param {Discord.Message} message
 * @param {Number} list
 * @param {*} flags
 */
async function query(docs, message, list, flags) {
    
	await docs.loadInfo();
	let sheet = docs.sheetsById[info.sheetIds[list]];
	let rows = await sheet.getRows();

	async function taxFraud(str) {
		return message.channel.send(str.replace('``````', ''));
	}
	let count = 0;
	let bankAccount = (debt, price, i) => {
		if (price) {
			let check = new Row(price._rawData);
			if (debt.length > 1500) {
				taxFraud(`\`\`\`${debt}\`\`\``);
				debt = '';
			}
			if (includes(price._rawData, flags.q)) {
				debt += `${list}#${i + 1} ${check.link} ${check.title} by ${check.author}` + '\n';
				count++;
			}
		}
		return debt;
	};
	let beginningStr = flags.str ?? '```**Received `list` request for ' + info.sheetNames[list] + '.**\nPlease wait for all results to deliver.```';
	let endStr = flags.estr ?? '\nEnd of Results!';
	let res = rows.reduce(bankAccount, beginningStr);

	if (count == 0) await taxFraud(`\`\`\`${beginningStr}\nNo results in this list!\`\`\``);
	else await taxFraud(`\`\`\`${res}\`\`\` ${endStr}`);
}

/**
 * Queries all used sheets.
 * @param {GoogleSpreadsheet} docs
 * @param {Discord.Message} message
 * @param {*} flags
 */
async function queryAll(docs, message, flags) {
    
	await query(docs, message, 1, {
		q: flags.qa,
		str: '```**Results from `' + info.sheetNames[1] + '`** ```',
		estr: '',
    });
    await query(docs, message, 2, {
		q: flags.qa,
		str: '```**Results from `' + info.sheetNames[2] + '`** ```',
		estr: '',
    });
    await query(docs, message, 3, {
		q: flags.qa,
		str: '```**Results from `' + info.sheetNames[3] + '`** ```',
		estr: '',
    });
    await query(docs, message, 4, {
		q: flags.qa,
		str: '```**Results from `' + info.sheetNames[4] + '`** ```',
		estr: '',
    });
    await query(docs, message, 6, {
		q: flags.qa,
		str: '```**Results from `' + info.sheetNames[6] + '`** ```',
		estr: '',
    });
    message.channel.send('Search finished!');
}

module.exports.query = query;
module.exports.queryAll = queryAll;
