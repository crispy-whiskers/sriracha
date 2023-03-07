import Row from '../row';
import { Message, MessageReaction, User } from 'discord.js';
import info from '../../config/globalinfo.json';
import { logError } from './log';
import { entryEmbed } from './misc';
import sheets from '../sheetops';

/**
 * Features a row from a sheet.
 */
export default async function lc(message: Message, list: number, ID: number) {
	if (list <= 0 || list > info.sheetNames.length) {
		message.channel.send('Cannot lc from a nonexistent sheet!');
		return false;
	}
	const name = info.sheetNames[list];

	try {
		const rows = await sheets.get(name);

		if (ID <= 0 || ID > rows.length) {
			message.channel.send('Cannot lc nonexistent row!');
			return false;
		}

		const filter = (reaction: MessageReaction, user: User) => {
			return ['🇯🇵', '🇺🇸', '❌'].includes(reaction.emoji.name!) && user.id === message.author.id;
		};
		const r = new Row(rows[ID - 1]);

		message.channel.send('**React with the corresponding language.**');

		await message.channel.send({ embeds: [entryEmbed(r, list, ID, message)] }).then(async (message) => {
			await message.react('🇺🇸');
			await message.react('🇯🇵');
			await message.react('❌');
			message
				.awaitReactions({ filter, max: 1, time: 60000, errors: ['time'] })
				.then((collected) => {
					const reaction = collected.first()!;

					if (reaction.emoji.name === '🇯🇵') {
						message.channel.send(`.lc -l ${r.eh ?? r.nh ?? r.im} -a ${r.author} -t ${r.title} -jp`);
					} else if (reaction.emoji.name === '🇺🇸') {
						message.channel.send(`.lc -l ${r.eh ?? r.nh ?? r.im} -a ${r.author} -t ${r.title} -en`);
					} else {
						message.channel.send('Cancelled process.');
						return;
					}
				})
				.catch(() => {
					message.channel.send('Stopped listening for reactions.');
				});
		});

		return true;
	} catch (e) {
		logError(message, e);
		return false;
	}
}
module.exports = lc;
