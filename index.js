var Discord = require('discord.js');
var log = require('./commands/log');
var info = require('./config/globalinfo.json');
const bot = new Discord.Client();
const tierlist = ['S', 'S-', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-'];

var debugMode = false;

const creds = require('./config/gclient_secret.json'); // the file saved above

const add = require('./commands/add');
const del = require('./commands/delete');
const edit = require('./commands/edit');
const feat = require('./commands/feature');
const lc = require('./commands/lc');
const ls = require('./commands/list');
const misc = require('./commands/misc');
const move = require('./commands/move');
const rand = require('./commands/rand');

bot.on('ready', async () => {
	await bot.user.setStatus('online');
	await bot.user.setActivity({
		name: 'you sort | sauce help',
		type: 'WATCHING',
	});
	log.setup(bot);
	console.log(`Logged in as ${bot.user.tag}`);
	console.log('Debug mode is ' + (debugMode ? 'ON' : 'OFF'));
});

function clean(clothing) {
	return clothing.trim();
}

/**
 * Cleans the laundry.
 * @param {Iterator} laundry
 */
function laundromat(laundry) {
	if (laundry === undefined) return; //cant wash nothing

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
function airportSecurity(passenger) {
	if (!passenger || passenger.length == 0) {
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
		if (!args[arg]) {
			message.channel.send('Invalid command! Make sure all required parameters are present.');
			return false;
		}
	}
	return true;
}

bot.on('message', function (message) {
	if (message.author.bot && message.author.tag !== 'LC streamliner#0250') return;
	if (message.guild.id !== info.serverId) return;

	// sauce stop communism
	if (message.content.match('^[Ss]auce stop')) {
		bot.user.setStatus('invisible').then((s) => {
			message.channel.send('oh sheet').then((msg) => {
				process.exit(0);
			});
		});
		return;
	}

	//handle debug mode logic
	let args = message.content.match(
		debugMode
			? /^(?:[Ss]aace)\s+(?<command>move|add|list|delete|feature clear|feature|random|lc|help|stats|update|tags)?\s*(?:(?<listId>\d)(?:#(?<entryId>\d+))?(?:\s+(?<destId>\d)?)?)?\s*(?<flags>.*?)\s*$/
			: /^(?:[Ss]auce)\s+(?<command>move|add|list|delete|feature clear|feature|random|lc|help|stats|update|tags)?\s*(?:(?<listId>\d)(?:#(?<entryId>\d+))?(?:\s+(?<destId>\d)?)?)?\s*(?<flags>.*?)\s*$/
	);

	if (!args?.groups) return;
	//console.log(args);
	console.log(`Command detected. Message: \n"${message.content}"`);

	let cmd = args.groups?.command ?? 'edit';

	let flags =
		args.groups?.flags === ''
			? undefined
			: args.groups?.flags.matchAll(/-(a|t|l|l1|l2|l3|l4|n|p|tr|pg|s|q|qa|atag|rtag|img|addalt|delalt|addseries|delseries|fav|r)\s+((?:[^-]|-(?!(?:a|t|l|l1|l2|l3|l4|n|p|tr|pg|s|q|qa|atag|rtag|img|addalt|delalt|addseries|delseries|fav|r)\s+))+)/g);

	if (flags && !args.groups?.flags.match(/^(?:-(a|t|l|l1|l2|l3|l4|n|p|tr|pg|s|q|qa|atag|rtag|img|addalt|delalt|addseries|delseries|fav|r)\s+((?:[^-]|-(?!(?:a|t|l|l1|l2|l3|l4|n|p|tr|pg|s|q|qa|atag|rtag|img|addalt|delalt|addseries|delseries|fav|r)\s+))+))+$/)) {
		message.channel.send('Invalid flags! What are you, Nepal?');
		return;
	}
	flags = laundromat(flags); //cleans the flags, but i own the laundromat so i dont pay

	if (cmd === 'edit') {
		if (!flags || flags.q || flags.qa) {
			cmd = 'list';
		}
	}

	let list = airportSecurity(args.groups.listId);
	let ID = airportSecurity(args.groups.entryId);
	let dest = airportSecurity(args.groups.destId);

	if ((list ?? 1) >= info.sheetNames.length || (dest ?? 1) >= info.sheetNames.length) {
		message.channel.send('Invalid sheet/status number!');
	}

	console.log(`${cmd} command called by ${message.author.tag} on ${list ?? 'x'}#${ID ?? 'x'} with flags ${JSON.stringify(flags) ?? 'N/A'}`);
	log.log(
		`\`${cmd}\` command called by \`${message.author.tag}\` on \`${list ?? 'x'}#${ID ?? 'x'}\` with flags \`${JSON.stringify(flags) ?? 'N/A'}\``
	);
	switch (cmd) {
		case 'move':
			if (validate(message, list, ID, dest)) {
				move(message, list, ID, dest);
			}
			break;
		case 'add':
			list = list ?? 1;
			if (validate(message, flags)) {
				add.fAdd(message, flags);
			}
			break;
		case 'delete':
			if (validate(message, list, ID)) {
				del(message, list, ID);
			}
			break;
		case 'feature':
			console.log(ID)
			if (validate(message, list, ID)) {
				feat.feature(message, list, ID);
			}
			break;
		case 'feature clear':
			if (validate(message)) {
				feat.clear(message);
			}
			break;
		case 'lc':
			if (validate(message, list, ID)) {
				lc(message, list, ID);
			}
			break;
		case 'edit':
			if (validate(message, list, ID, flags)) {
				edit(message, list, ID, flags);
			}
			break;
		case 'list':
			if (validate(message)) {
				ls(message, list, ID, flags);
			}
			break;
		case 'random':
			list = list ?? 4;
			if (validate(message)) {
				rand(message, list);
			}
			break;

		//misc commands that take no args
		case 'help':
		case 'stats':
		case 'update':
		case 'tags':
			if (validate(message, bot)) {
				misc.misc(message, cmd, bot);
			}
			break;
	}
});

bot.login(require('./config/botauth.json').token);
