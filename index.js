var Discord = require('discord.js');
const bot = new Discord.Client();

var debugMode = false;

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
    return clothing.trim().replace(/~/g, '-');
}

/**
 * Cleans the matches returned in a regex matchAll.
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

/**
 * Validates args to make sure there are no falsy values.
 * @param  {...any} args
 */
function validate(message, ...args){
    for(var arg in args){
        if(!args) {
            message.channel.send('Invalid command! Make sure all required parameters are present.')
            return false;
        }
    }
    return true;
}


bot.on('message', function (message){
	if (message.author.bot) return;
	if (message.author.tag === 'catto#6269' || message.author.tag === 'Stinggyray#1000') {
		if (message.content.match('^[Ss]auce stop')) {
			message.channel.send('oh sheet').then((msg) => {
				process.exit(0);
			});
		}
    }
    
    //handle debug mode logic
    let args = message.content.match(debugMode ? 
        /^(?:[Ss]aace)\s+(?<command>move|add|list|delete|feature|random|lc|help|stats|update)?\s*(?:(?<listId>\d)(?:#(?<entryId>\d+))?(?:\s+(?<destId>\d)?))?\s*(?<flags>.*)\s*$/ : 
        /^(?:[Ss]auce)\s+(?<command>move|add|list|delete|feature|random|lc|help|stats|update)?\s*(?:(?<listId>\d)(?:#(?<entryId>\d+))?(?:\s+(?<destId>\d)?))?\s*(?<flags>.*)\s*$/)

    if(!args?.groups)
        return;
    console.log(args);
    
    let cmd = args.groups?.command ?? 'edit';
    
    let flags = args.groups?.flags.matchAll(/-(a|t|l|w|p|tr|pg|q|qa)\s+([^-]+)/g);
    //make sure flags are valid
    if(flags && !args.groups?.flags.match(/^(?:-(a|t|l|w|p|tr|pg|q|qa)\s+([^-]+))+$/)) {
        message.channel.send('Invalid flags! Make sure to replace all instances of `-` with `~`.')
        return;
    }
    flags = laundromat(flags); //cleans the flags

    let list = +args.listId
    let entry = +args.entryId
    let dest = +args.destId

    switch(cmd){
        case 'move': 
            if(validate(message, list, entry, dest)){
                
            }
            break;
        case 'add':
            list = list ?? 1
            if(validate(message, list)){
                
            }
            break;
        case 'delete':
            if(validate(message, list, entry)){

            }
            break;
        case 'feature':
            if(validate(message, list, entry)){
                
            }
            break;
        case 'lc': 
            if(validate(message, list, entry)){
                
            }
            break;
        case 'edit':
            if(validate(message, list, entry)){
                
            }
            break;
        case 'list':
            if(validate(message, list)){

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

bot.login(require('./config/botauth.json'));
