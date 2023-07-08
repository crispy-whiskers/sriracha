import info from '../../config/globalinfo.json';
import { Client, EmbedBuilder, Message, TextChannel } from 'discord.js';

let bot: Client | null = null;

export function setup(dBot: Client) {
	bot = dBot;
}

export function log(msg: string) {
	bot!.channels.fetch(info.logs).then((channel) => (channel as TextChannel).send(msg));
}

export function updatePublicServer(embed: EmbedBuilder) {
	bot!.channels.fetch(info.newListEntries).then((channel) => (channel as TextChannel).send({ embeds: [embed] }));
}

export function logError(message: Message, error: any) {
	console.log('Error happened sent by ' + message?.author?.tag + ' with command: ' + message.content);
	console.log(error);

	message.channel.send('Process failed! Error: ' + (error?.message ?? error?.name ?? error));
}
