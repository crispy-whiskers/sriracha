const { GoogleSpreadsheet } = require('google-spreadsheet');
var Row = require('../row');
var Discord = require('discord.js');
var info = require('../config/globalinfo.json');
var log = require('./log');
var misc = require('./misc');
var query = require('./query')


/**
 * Lists a sheet from the spreadsheet or lists a row from a sheet or searches 
 * @param {GoogleSpreadsheet} docs
 * @param {Discord.Message} message
 * @param {Number} list
 * @param {Number} ID
 * @param {*} flags
 */
async function list(docs, message, list, ID, flags) {

    if(list > info.sheetNames.length || list <= 0){
        message.channel.send('Cannot read a nonexistent sheet!')
        return false;
    }

    if(typeof list === 'undefined' && typeof flags.qa === 'undefined'){
        message.channel.send('List was not supplied!');
        return false;
    }

    await docs.loadInfo();
    
    try{

        
        let sheet = docs.sheetsById[info.sheetIds[list]];

        
        if(typeof ID !== 'undefined'){

            let rows = await sheet.getRows();

            if (ID <= 0 || ID > rows.length) {
                message.channel.send('Cannot get nonexistent row!');
                return false;
            }

            let target = new Row(rows[ID -1]._rawData);

            

            await message.channel.send(misc.embed(target, list, ID, message))
            return true;

        }
        console.log(flags)
        if(flags?.q || flags?.qa){
            if(flags.q){
                console.log('wtf')
                return query.query(docs, message, list, flags);
            }
            if(flags.qa){
                console.log('help')
                return query.queryAll(docs, message, flags);
            }
        }

        const rows = await sheet.getRows();

        if(rows.length == 0){
            message.channel.send('No entries in this list!')
            return true;
        }

        async function taxFraud(str){
            
            return message.channel.send(str.replace('``````', ''));
        }
    
        let bankAccount =  (debt, price, i) => {
            if(price){
            let check = new Row(price._rawData)
            if(debt.length > 1500){
                taxFraud(`\`\`\`${debt}\`\`\``)
                debt = '';
            }
            debt+=(`${list}#${i+1} ${check.link} ${check.title} by ${check.author}`+'\n');
        }
            return debt;
        }

        let res = rows.reduce(bankAccount, '```**Received `list` request for '+info.sheetNames[list]+'.**\nPlease wait for all results to deliver.```');
        
        await taxFraud('```'+res+'```');
        await message.channel.send('End of results.')
        return true;
    } catch(e){
        log.logError(message,e);
        return false;
    }

}

module.exports = list;
	