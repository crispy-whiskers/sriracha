const { GoogleSpreadsheet } = require('google-spreadsheet');
var Discord = require('discord.js');
var log = require('./commands/log');
var info = require('./config/globalinfo.json');
const bot = new Discord.Client();

var debugMode = true;

const creds = require('./config/gclient_secret.json'); // the file saved above
const doc = new GoogleSpreadsheet(info.spreadsheet);

const add = require('./commands/add');
const del = require('./commands/delete');
const edit = require('./commands/edit');
const feat = require('./commands/feature');
const lc = require('./commands/lc');
const ls = require('./commands/list');
const misc = require('./commands/misc');
const move = require('./commands/move');

bot.on('ready', async () => {
	await bot.user.setStatus('online');
	await doc.useServiceAccountAuth(creds);
	await bot.user.setActivity({
		name: 'you sort | sauce help',
		type: 'WATCHING',
	});
	log.setup(bot);
	console.log(`Logged in as ${bot.user.tag}`);
});

function clean(clothing) {
	return clothing.trim().replace(/~/g, '-');
}

/**
 * Cleans the laundry.
 * @param {Iterator} laundry
 */
function laundromat(laundry) {
	if(laundry === undefined)	
		return; //cant wash nothing

	let cycle = laundry.next();
	let receipt = {};
	while (!cycle.done) {
		let clothes = cycle.value;
		let name = clean(clothes[1]);
		let price = clean(clothes[2]);
		receipt[name] = price;
		cycle = laundry.next();
	}
	return receipt;
}

/**
 * Drags NaNs off an overbooked plane.
 * @param {String} passenger 
 */
function airportSecurity(passenger){
	if(!passenger || passenger.length==0){
		//sorry, we need that seat
		return undefined;
	}
	//hmm, youre good
	return +passenger;
}


/**
 * Validates args to make sure there are no falsy values.
 * @param  {...any} args
 */
function validate(message, ...args) {
	for (var arg in args) {
		if (!args) {
			message.channel.send('Invalid command! Make sure all required parameters are present.');
			return false;
		}
	}
	return true;
}

bot.on('message', function (message) {
	if (message.author.bot) return;
	if (message.author.tag === 'catto#6269' || message.author.tag === 'Stinggyray#1000') {
		if (message.content.match('^[Ss]auce stop')) {
			message.channel.send('oh sheet').then((msg) => {
				process.exit(0);
			});
		}
	}

	//handle debug mode logic
	let args = message.content.match(
		debugMode
			? /^(?:[Ss]aace)\s+(?<command>move|add|list|delete|feature|random|lc|help|stats|update)?\s*(?:(?<listId>\d)(?:#(?<entryId>\d+))?(?:\s+(?<destId>\d)?)?)?\s*(?<flags>.*?)\s*$/
			: /^(?:[Ss]auce)\s+(?<command>move|add|list|delete|feature|random|lc|help|stats|update)?\s*(?:(?<listId>\d)(?:#(?<entryId>\d+))?(?:\s+(?<destId>\d)?)?)?\s*(?<flags>.*?)\s*$/
	);

	if (!args?.groups) return;
	console.log(args);

	let cmd = args.groups?.command ?? 'edit';

	let flags = args.groups?.flags === '' ? undefined : args.groups?.flags.matchAll(/-(a|t|l|w|p|tr|pg|q|qa)\s+([^-]+)/g);

	//make sure flags are valid
	if (flags && !args.groups?.flags.match(/^(?:-(a|t|l|w|p|tr|pg|q|qa)\s+([^-]+))+$/)) {
		message.channel.send('Invalid flags! Make sure to replace all instances of `-` with `~`.');
		return;
	}
	flags = laundromat(flags); //cleans the flags, but i own the laundromat so i dont pay

	

	let list = airportSecurity(args.groups.listId);
	let ID = airportSecurity(args.groups.entryId);
	let dest = airportSecurity(args.groups.destId);

	if ((list ?? 1) >= info.sheetNames.length || (dest ?? 1) >= info.sheetNames.length) {
		message.channel.send('Invalid sheet/status number!');
	}

	switch (cmd) {
		case 'move':
			if (validate(message, list, ID, dest)) {
			}
			break;
		case 'add':
			list = list ?? 1;
			if (validate(message, flags)) {
				add(doc, message, flags);
			}
			break;
		case 'delete':
			if (validate(message, list, ID)) {
			}
			break;
		case 'feature':
			if (validate(message, list, ID)) {
			}
			break;
		case 'lc':
			if (validate(message, list, ID)) {
			}
			break;
		case 'edit':
			if (validate(message, list, ID)) {
			}
			break;
		case 'list':
			if (validate(message, list)) {
				
				ls(doc, message, list, ID, flags);
			}
			break;
		case 'random':
			break;

		//misc commands that take no args
		case 'help':
		case 'stats':
		case 'update':
			break;
	}
});

bot.login(require('./config/botauth.json').token);
