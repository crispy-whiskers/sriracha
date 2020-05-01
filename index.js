var Discord = require('discord.js');
const bot = new Discord.Client();

bot.on('ready', function (evt) {
	bot.user.setStatus('available');
	bot.user.setPresence({
		game: {
			name: 'you sort  sauce help',
			type: 'WATCHING',
		},
	});
});

function clean(clothing){
    return clothing.trim();
}

/**
 * Cleans the matches returned in a flag regex match.
 * @param {Iterator} laundry 
 */
function laundromat(laundry){
    let cycle = laundry.next();
    let receipt = {};
    while(!cycle.done){
        let clothes = cycle.value;
        let name = clean(clothes[1]);
        let price = clean(clothes[2]);
        receipt[name] = price;
        cycle = laundry.next();
    }
    return receipt;
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
    
    let args = message.content.match(/^(?:[Ss]a[au]ce)\s+(?<command>move|add|list|delete|feature|random|lc|help|stats|update)?\s*(?:(?<listId>\d)#(?<entryId>\d+)(?:\s+(?<destId>\d)?))?\s*(?<flags>.*)$/)
    if(!args?.groups)
        return;
    console.log(args);
    
    let cmd = args.groups?.command ?? 'edit';

    let flags = args.groups?.flags.matchAll(/-(a|t|l|w|p|tr|pg)\s+([^-]+)/g);
    flags = laundromat(flags); //cleans the flags

    switch(cmd){
        case 'move':
            break;
        case 'add':
            break;
        case 'delete':
            break;
        case 'feature':
            break;
        case 'lc':
            break;
        case 'edit':
            break;
        case 'list':
            break;


        case 'random':
        case 'help':
        case 'stats':
        case 'update':

            break;
    }

});

bot.login(require('./config/botauth.json'));
