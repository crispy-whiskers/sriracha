import Discord, { Message, ActivityType, GatewayIntentBits } from 'discord.js';
import { log, setup } from './commands/log';
import info from '../config/globalinfo.json';
import botauth from '../config/botauth.json';
// const tierlist = ['S', 'S-', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-'];

const debugMode = false;

// import creds from '../config/gclient_secret.json' // the file saved above

import { flagAdd } from './commands/add';
import del from './commands/delete';
import edit from './commands/edit';
import feat, { clear as featureClear } from './commands/feature';
import lc from './commands/lc';
import ls from './commands/list';
import misc from './commands/misc';
import move from './commands/move';
import rand from './commands/rand';

const bot = new Discord.Client({
	intents: [
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.MessageContent
	],
	presence: {
		status: 'online',
		activities: [
			{
				name: 'you sort | sauce help',
				type: ActivityType.Watching,
			},
		],
	},
});

bot.once('ready', async () => {
	setup(bot);
	console.log(`Logged in as ${bot.user?.tag}`);
	console.log('Debug mode is ' + (debugMode ? 'ON' : 'OFF'));
});

function clean(clothing: string): string {
	return clothing.trim();
}

export interface Flags {
	a?: string | null;
	t?: string | null;
	l?: string | null;
	l1?: string | null;
	l2?: string | null;
	l3?: string | null;
	l4?: string | null;
	n?: string | null;
	p?: string | null;
	tr?: string | null;
	pg?: string | null;
	s?: string | null;
	q?: string | null;
	qa?: string | null;
	atag?: string | null;
	rtag?: string | null;
	img?: string | null;
	addalt?: string | null;
	delalt?: string | null;
	addseries?: string | null;
	delseries?: string | null;
	fav?: string | null;
	r?: string | null;
	addcharacter?: string | null;
	delcharacter?: string | null;
	str?: string | null;
	estr?: string | null;
	fetch?: string | null;
	addsitetag?: string | null;
	delsitetag?: string | null;
	suggest?: string | null;
}

/**
 * Returns an object with the flags and their respective values
 */
function laundromat(laundry: IterableIterator<RegExpMatchArray> | undefined): undefined | Flags {
	if (!laundry) {
		// message doesn't have any valid flags or they lack values
		return; 
	}

	let cycle = laundry.next();
	const receipt: Flags = {};

	// We add all flags and values to the object until we run out of them
	while (!cycle.done) {
		const clothes = cycle.value;
		const name = clean(clothes[1]);
		const price = clean(clothes[2]);
		receipt[name as keyof Flags] = price;
		cycle = laundry.next();
	}

	return receipt;
}

/**
 * Drags NaNs off an overbooked plane.
 */
function airportSecurity(passenger: string): number | undefined {
	if (!passenger || passenger.length == 0) {
		//sorry, we need that seat
		return undefined;
	}

	//hmm, youre good
	return +passenger;
}

/**
 * Validates args to make sure there are no falsy values.
 */
function validate(message: Discord.Message, ...args: (Flags | number | Discord.Client<boolean> | undefined)[]): boolean {
	for (const arg in args) {
		if (!args[arg]) {
			message.channel.send('Invalid command! Make sure all required parameters are present.');
			return false;
		}
	}

	return true;
}

bot.on('messageCreate', function (message: Message) {
	if (message.author.bot && message.author.tag !== 'LC streamliner#0250') {
		// Ignore LC streamliner bot
		return;
	}
	if (message.guild?.id !== info.serverId) {
		// ignore messages from other servers
		return;
	}

	// sauce stop communism
	if (message.content.match('^[Ss]auce stop')) {
		bot.user?.setStatus('invisible');
		message.channel.send('oh sheet').then(() => {
			process.exit(0);
		});

		return;
	}

	//handle debug mode logic
	const args = message.content.match(
		debugMode
			? /^(?:[Ss]aace)\s+(?<command>move|add|list|delete|feature clear|feature|random|lc|help|stats|update|tags)?\s*(?:(?<listId>\d)(?:#(?<entryId>\d+))?(?:\s+(?<destId>\d)?)?)?\s*(?<flags>.*?)\s*$/
			: /^(?:[Ss]auce)\s+(?<command>move|add|list|delete|feature clear|feature|random|lc|help|stats|update|tags)?\s*(?:(?<listId>\d)(?:#(?<entryId>\d+))?(?:\s+(?<destId>\d)?)?)?\s*(?<flags>.*?)\s*$/
	);

	if (!args?.groups) {
		// no commands in message
		return;
	}

	//console.log(args);
	console.log(`Command detected. Message: \n"${message.content}"`);

	let cmd = args.groups?.command ?? 'edit';

	const flagStr: string = args.groups?.flags;

	const unwashedFlags =
		flagStr === ''
			? undefined
			: flagStr.matchAll(/-(a|t|l|l1|l2|l3|l4|n|p|tr|pg|s|q|qa|atag|rtag|img|addalt|delalt|addseries|delseries|fav|r|addcharacter|delcharacter|fetch|addsitetag|delsitetag|suggest)\s+((?:[^-]|-(?!(?:a|t|l|l1|l2|l3|l4|n|p|tr|pg|s|q|qa|atag|rtag|img|addalt|delalt|addseries|delseries|fav|r|addcharacter|delcharacter|fetch|addsitetag|delsitetag|suggest)\s+))+)/g);

	if (unwashedFlags && !args.groups?.flags.match(/^(?:-(a|t|l|l1|l2|l3|l4|n|p|tr|pg|s|q|qa|atag|rtag|img|addalt|delalt|addseries|delseries|fav|r|addcharacter|delcharacter|fetch|addsitetag|delsitetag|suggest)\s+((?:[^-]|-(?!(?:a|t|l|l1|l2|l3|l4|n|p|tr|pg|s|q|qa|atag|rtag|img|addalt|delalt|addseries|delseries|fav|r|addcharacter|delcharacter|fetch|addsitetag|delsitetag|suggest)\s+))+))+$/)) {
		message.channel.send('Invalid flags! What are you, Nepal?');
		return;
	}
	const flags = laundromat(unwashedFlags); // Converts the matches into an object with the flags and its values

	if (cmd === 'edit') {
		if (!flags || flags.q || flags.qa) {
			cmd = 'list';
		}
	}

	// Check if the values are valid numbers
	let list = airportSecurity(args.groups.listId);
	const ID = airportSecurity(args.groups.entryId);
	const dest = airportSecurity(args.groups.destId);

	if ((list ?? 1) >= info.sheetNames.length || (dest ?? 1) >= info.sheetNames.length) {
		message.channel.send('Invalid sheet/status number!');
	}

	console.log(`${cmd} command called by ${message.author.tag} on ${list ?? 'x'}#${ID ?? 'x'} with flags ${JSON.stringify(flags) ?? 'N/A'}`);
	log(`\`${cmd}\` command called by \`${message.author.tag}\` on \`${list ?? 'x'}#${ID ?? 'x'}\` with flags \`${JSON.stringify(flags) ?? 'N/A'}\``);
	message.channel.sendTyping();

	switch (cmd) {
		case 'move':
			if (validate(message, list, ID, dest)) {
				move(message, list!, ID!, dest!);
			}
			break;
		case 'add':
			list ??= 1;
			if (validate(message, flags)) {
				flagAdd(message, flags!);
			}
			break;
		case 'delete':
			if (validate(message, list, ID)) {
				del(message, list!, ID!);
			}
			break;
		case 'feature':
			console.log(ID);
			if (validate(message, list, ID)) {
				feat(message, list!, ID!);
			}
			break;
		case 'feature clear':
			if (validate(message)) {
				featureClear(message);
			}
			break;
		case 'lc':
			if (validate(message, list, ID)) {
				lc(message, list!, ID!);
			}
			break;
		case 'edit':
			if (validate(message, list, ID, flags)) {
				edit(message, list!, ID!, flags!);
			}
			break;
		case 'list':
			if (validate(message)) {
				ls(message, list!, ID!, flags!);
			}
			break;
		case 'random':
			list ??= 4;
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
				misc(message, cmd, bot);
			}
			break;
	}
});

bot.login(botauth.token);
