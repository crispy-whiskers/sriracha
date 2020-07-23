var Row = require('../row');
var Discord = require('discord.js');
var info = require('../config/globalinfo.json');
var log = require('./log');
var misc = require('./misc');
var query = require('./query')
var sheets = require('../sheetops');

/**
 * Lists a sheet from the spreadsheet or lists a row from a sheet or searches 
 * @param {Discord.Message} message
 * @param {Number} list
 * @param {Number} ID
 * @param {*} flags
 */
async function list(message, list, ID, flags) {
    

    if(list > info.sheetNames.length || list <= 0){
        message.channel.send('Cannot read a nonexistent sheet!')
        return false;
    }

    if(typeof list === 'undefined' && typeof flags.qa === 'undefined'){
        message.channel.send('List was not supplied!');
        return false;
    }

    let name = info.sheetNames[list];
    
    try{
        
        //Specific ID fetch and return
        if(typeof ID !== 'undefined'){

            let rows = await sheets.get(name);

            if (ID <= 0 || ID > rows.length) {
                message.channel.send(`Cannot get nonexistent row! The last entry in this sheet is \`${list}#${rows.length}\``);
                return false;
            }

            let target = new Row(rows[ID]);

            await message.channel.send(misc.embed(target, list, ID, message))
            return true;

        }

        //Query
        if(flags?.q || flags?.qa){
            if(flags.q){
                return query.query(message, list, flags);
            }
            if(flags.qa){
                return query.queryAll(message, flags);
            }
        }

        if(list == 4) {
            await message.channel.send("https://wholesomelist.com");
            return true;
        }
        if(list == 1) {
            await message.channel.send("no chat bomb, thanks");
            return true;
        }

        //List 
        const rows = await sheets.get(name);

        if(rows.length == 0){
            message.channel.send('No entries in this list!')
            return true;
        }

        async function taxFraud(str){
            
            return message.channel.send(str.replace('``````', ''));
        }
    
        let bankAccount =  (debt, price, i) => {
            if(i==0) return 0; 
            if(price){
            let check = new Row(price)
            if(debt.length > 1500){
                taxFraud(`\`\`\`${debt}\`\`\``)
                debt = '';
            }
            debt+=(`${list}#${i} ${check.link} ${check.title} by ${check.author}`+'\n');
        }
            return debt;
        }
        let res = rows.reduce(bankAccount, '```**Received `list` request for '+info.sheetNames[list]+'.**\nPlease wait for all results to deliver.```');
        
        await taxFraud('```'+res+'```');
        await message.channel.send('All results delivered!.')
        return true;
    } catch(e){
        log.logError(message,e);
        return false;
    }

}

module.exports = list;
