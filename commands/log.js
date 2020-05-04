
var bot;
module.exports.setup = function(dBot){
    bot = dBot;
}

module.exports.log = function (msg) {
    bot.channels.get(config.logs).send(msg);
}
module.exports.logError = function (message, error) {
    console.log('Error happened sent by ' + message?.author?.tag + ' with command: ' + message.content)
    console.log(error);
    
    message.channel.send('Process failed! Error: '+error.name)
}