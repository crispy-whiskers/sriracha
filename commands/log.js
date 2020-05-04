var info = require('../config/globalinfo.json')

var bot;
module.exports.setup = function(dBot){
    bot = dBot;
}

module.exports.log = function (msg) {
    bot.channels.fetch(info.logs).then((channel) => channel.send(msg));
}
module.exports.updatePublicServer = function (embed) {
    bot.channels.fetch(info.newListEntries).then((channel) => channel.send(embed));
}
module.exports.logError = function (message, error) {
    console.log('Error happened sent by ' + message?.author?.tag + ' with command: ' + message.content)
    console.log(error);
    
    message.channel.send('Process failed! Error: '+error.name)
}