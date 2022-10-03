import Row from '../row';
import Discord, { Message } from 'discord.js';
import info from '../../config/globalinfo.json';
import { logError, updatePublicServer } from './log';
import pFetch from '../utils/page';
import { entryEmbed, update } from './misc';
import del from './delete';
import sheets from '../sheetops';
import axios, { AxiosResponse } from 'axios';
import Jimp from 'jimp';
import { v4 as uuidv4 } from 'uuid';
import AWS from 'aws-sdk';
const s3 = new AWS.S3({
	accessKeyId: info.awsId,
	secretAccessKey: info.awsSecret
});
import { decode } from 'html-entities';
const JSSoup = require('jssoup').default;

import underageCharacters from '../../data/underage.json';
import renameParodies from '../../data/parodies.json';
import renameCharacters from '../../data/characters.json';
import ignoredTags from '../../data/ignoredtags.json';
import { Flags } from '../index';
import { fetchEHApi, fetchIMApi } from '../utils/api';


/**
 * Secondhand function to accept flag object.
 * @param {Discord.Message} message
 * @param {Number} list
 * @param {*} flags
 */
export async function flagAdd(message: Message, flags: Flags) {
	if (!flags.l && !flags.l1 && !flags.l2 && !flags.l3 && !flags.l4) {
		message.channel.send('Please provide a link with one of the following flags: `-l`, `-l1` (Hmarket), `-l2` (nhentai), `-l3` (E-Hentai), or `-l4` (Imgur)!');
		return false;
	}

	if (flags.l) {
		flags.l = flags.l.replace('http://', 'https://');
		const siteRegex = flags.l.match(/hmarket|nhentai|e-hentai|imgur|fakku|irodoricomics|ebookrenta/);
		if(!siteRegex) {
			message.channel.send('Link from unsupported site detected! Please try to only use links from Hmarket, nhentai, E-hentai, Imgur, FAKKU, Idodori, or Renta!');
			console.log('Link from unsupported site! This should never happen');
			return;
		}

		const site = siteRegex[0];

		switch (site) {
			case 'hmarket':
				flags.l1 = flags.l;
				delete flags.l;
				break;
			case 'nhentai':
			case 'fakku':
			case 'irodoricomics':
			case 'ebookrenta':
				flags.l2 = flags.l;
				delete flags.l;
				break;
			case 'e-hentai':
				flags.l3 = flags.l;
				delete flags.l;
				break;
			case 'imgur':
				flags.l4 = flags.l;
				delete flags.l;
				break;
		}
	}
	if (flags.l1) {
		flags.l1 = flags.l1.replace('http://', 'https://');
	}
	if (flags.l2) {
		flags.l2 = flags.l2.replace('http://', 'https://');
	}
	if (flags.l3) {
		flags.l3 = flags.l3.replace('http://', 'https://');
	}
	if (flags.l4) {
		flags.l4 = flags.l4.replace('http://', 'https://');
	}

	if (flags.atag) {
		message.channel.send('Don\'t use the `-atag` flag when adding - it won\'t work! Add the entry and then modify the tags.');
	}
	if (flags.addseries) {
		message.channel.send('Don\'t use the `-addseries` flag when adding - it won\'t work! Add the entry and then add the series.');
	}
	if (flags.addalt) {
		message.channel.send('Don\'t use the `-addalt` flag when adding - it won\'t work! Add the entry and then add the alt links.');
	}
	if (flags.addcharacter) {
		message.channel.send('Don\'t use the `-addcharacter` flag when adding - it won\'t work! Add the entry and then add the missing characters.');
	}
	const row = new Row(flags);
	const list = +(flags?.s ?? 1);

	return add(message, list, row);
}

/**
 * Prepatory things to do before pushing a row to the final list.
 * @param {Discord.Message} message
 * @param {Number} list
 * @param {Row} row
 */
function prepUploadOperation(message: Message, list: number, row: Row) {
	// eslint-disable-next-line no-async-promise-executor
	return new Promise<void>(async (resolve, reject) => {
		if (list != 4 && list != 9) { //if its not going to the final/licensed list, do nothing
			resolve();
			return;
		}

		if (row.page === -1) {
			const urlPage = (row.eh ?? row.im ?? row.nh)!;
			await pFetch(urlPage).then((pages) => {
				row.page = pages;
			});

			if (row.page === -1) {
				message.channel.send('Failed to get page numbers! Please set it manually with `-pg`.');
				reject("*dies of page fetch failure*");
				return;
			}
		}

		if (row.uid && row?.img?.match(/wholesomelist/)) {
			message.channel.send("UUID and image already detected! Not running upload sequence.");
			resolve();
			return;
		}

		if (!row.uid) {
			row.uid = uuidv4();
		}

		// Chop off trailing slashes in the links
		if (row.hm) {
			row.hm = row.hm.replace(/\/$/, "");
		}
		if (row.nh) {
			row.nh = row.nh.replace(/\/$/, "");
		}
		if (row.eh) {
			row.eh = row.eh.replace(/\/$/, "");
		}
		if (row.im) {
			row.im = row.im.replace(/\/$/, "");
		}

		// Chop off any mobile imgur links
		if (row.im) {
			row.im = row.im.replace("m.imgur.com", "imgur.com");
		} else if (row?.nh?.match(/imgur/)) { // This should be removed once the migration is done, I'm only keeping it to avoid issues
			row.nh = row.nh.replace("m.imgur.com", "imgur.com");
			message.channel.send("Imgur links go in column 4! Please add the link to the correct column using `-l4`.");
			resolve();
			return;
		}

		let imageLocation = null;

		console.log('Detecting location of cover image...');
		if (typeof row.img !== 'undefined') {
			imageLocation = row.img;
		} else if (row?.eh?.match(/e-hentai/)) {
			const data = await fetchEHApi(row.eh);

			if (data == null) {
				message.channel.send('Unable to fetch E-Hentai cover image. Try linking the cover image with the -img tag.');
				reject(`Unable to fetch cover image for \`${row.eh}\``);
				return;
			}

			const galleryID = data.gid;
			const pageToken = data.thumb.match(/.*?\/\w{2}\/(\w{10}).*$/)[1];

			const pageUrl = `https://e-hentai.org/s/${pageToken}/${galleryID}-1`;
			const response = axios.get(pageUrl).then((resp) => {
				const respdata = resp?.data ?? -1;
				if (respdata === -1) throw respdata;
				else return respdata;
			});

			const body = await response;
			const soup = new JSSoup(body);

			const image = soup
				.findAll("img")
				.filter((s: { attrs: { id: string; }; }) => s?.attrs?.id === 'img')[0];

			imageLocation = image['attrs']['src'];

		} else if (row?.im?.match(/imgur/)) {
			//extract identification part from the link
			const resp = await fetchIMApi(row.im);
			imageLocation = resp.link;
		} else if (row?.nh?.match(/nhentai\.net\/g\/\d{1,6}\/\d+/)) {
			message.channel.send("nhentai seems to be the only option for link fetching, and it's no longer supported due to Cloudflare. Add alternate links or manually set the image with -img.");
			reject("Attempted to fetch cover from nhentai");
			return;

			// const resp = (await axios.get(row.nh)).data.match(/(?<link>https:\/\/i\.nhentai\.net\/galleries\/\d+\/\d+\..{3})/);
			// if (typeof resp?.groups?.link === 'undefined') {
			// 	message.channel.send('Unable to fetch cover image. Try linking the cover image with the -img tag.');
			// 	reject(`Unable to fetch cover image for \`${row.nh}\``);
			// 	return;
			// }
			// imageLocation = resp.groups.link;
		} else if (row?.nh?.match(/nhentai/)) {
			message.channel.send("nhentai seems to be the only option for link fetching, and it's no longer supported due to Cloudflare. Add alternate links or manually set the image with -img.");
			reject("Attempted to fetch cover from nhentai");
			return;

			//let numbers = +(row.nh.match(/nhentai\.net\/g\/(\d{1,6})/)[1]);
			// const resp = (await axios.get(row.nh)).data.match(/(?<link>https:\/\/t\d?\.nhentai\.net\/galleries\/\d+\/cover\..{3})/);
			// if (typeof resp?.groups?.link === 'undefined') {
			// 	message.channel.send('Unable to fetch cover image. Try linking the cover image with the -img tag.');
			// 	reject(`Unable to fetch cover image for \`${row.nh}\``);
			// 	return;
			// }
			// imageLocation = resp.groups.link;
		} else if (row?.nh?.match(/fakku\.net/)) {
			const resp = (await axios.get(row.nh).catch(() => {
				console.log("Uh oh stinky");
			}))?.data;
			if (!resp) {
				message.channel.send("Unable to fetch FAKKU cover image. Try linking with -img.")
				reject(`Unable to fetch cover image for \`${row.nh}\``);
				return;
			}
			const imageLink = resp.match(/(?<link>https?:\/\/t\.fakku\.net.*?thumb\..{3})/);
			if (typeof imageLink?.groups?.link === 'undefined') {
				message.channel.send('Unable to fetch FAKKU cover image. Try linking the cover image with the -img tag.')
				reject(`Unable to fetch cover image for \`${row.nh}\``);
				return;
			}
			imageLocation = imageLink.groups.link;
		} else {
			message.channel.send('dont use alternative sources idot');
			reject('Bad image source: `' + row.nh + '`');
			return;
		}

		console.log(imageLocation)
		message.channel.send('Downloading `' + imageLocation + '` and converting to JPG...');
		const image = await Jimp.read(imageLocation);
		if (image.bitmap.height < image.bitmap.width) {
			message.channel.send("The width of this cover image is greater than the height! This results in suboptimal pages on the site. Please crop and upload an album cover manually using -img!");
			reject("Epic Image Width Fail");
			return;
			// TODO chop this in half automatically and let the user decide
		}

		if (image.bitmap.width > 350) {
			await image.resize(350, Jimp.AUTO);
		}
		image.quality(70);
		const data = await image.getBufferAsync(Jimp.MIME_JPEG);

		const params = {
			Bucket: info.awsBucket,
			Key: row.uid + '.jpg',
			Body: data,
			ContentType: 'image/jpeg',
			ACL: 'public-read-write',
		};
		await new Promise<void>((resolve, reject) => {
			s3.upload(params, (err: Error) => {
				if (err) {
					reject(err);
					return;
				}

				row.img = "https://wholesomelist.com/asset/" + row.uid + ".jpg";
				resolve();
				return;
			});
		});
		message.channel.send(`Uploaded! The thumbnail can now be found at \`${row.img}\``);
		resolve();
	})
}

/**
 * If a row does not have an author, title, parody, or siteTags, sets them properly.
 * @param {Discord.Message} message
 * @param {Number} list
 * @param {Row} row
 */
export async function setInfo(message: Message, list: number, row: Row) {
	// eslint-disable-next-line no-async-promise-executor
	return new Promise<void>(async (resolve, reject) => {
		if ((row?.eh?.match(/e-hentai/) || row?.nh?.match(/nhentai|fakku/)) && (list != 4 && list != 9) && (!row.parody || !row.author || !row.title || !row.siteTags)) {
			try {
				let title = '';
				let author = '';
				let parodies: string[] = [];
				let chars: string[] = [];
				let tags: string[] = [];
				const siteTags: { tags: string[], characters: string[] } = {
					tags: [],
					characters: []
				};
				if (row?.eh?.match(/e-hentai/)) {
					const data = await fetchEHApi(row.eh);

					title = decode(
						data.title.match(
							/^(?:\s*(?:=.*?=|<.*?>|\[.*?]|\(.*?\)|\{.*?})\s*)*(?:[^[|\](){}<>=]*\s*\|\s*)?([^[|\](){}<>=]*?)(?:\s*(?:=.*?=|<.*?>|\[.*?]|\(.*?\)|\{.*?})\s*)*$/
						)[1].trim());

					author = data.tags
						.filter((s: string) => s.match(/artist/))
						.map((s: string) => decode(s.match(/artist:(.*)/)![1].replace(/(?:^|\s+)(\w{1})/g, (letter) => letter.toUpperCase())))
						.join(", ");

					parodies = data.tags
						.filter((s: string) => s.match(/parody/))
						.map((s: string) => decode(s.match(/parody:(.*)/)![1].replace(/(?:^|\s+)(\w{1})/g, (letter) => letter.toUpperCase())))
						.filter((s: string) => s !== 'Original');

					chars = data.tags
						.filter((s: string) => s.match(/character/))
						.map((s: string) => decode(s.match(/character:(.*)/)![1]));

					tags = data.tags
						.filter((s: string) => s.match(/(female|male|mixed|other):/))
						.filter((s: string) => !ignoredTags.some(x => s.includes(x))); // filter out irrelevant tags

				} else if (row?.nh?.match(/nhentai/)) {
					message.channel.send("Only nhentai link found, not auto-setting info.");
					resolve();
					// const response = axios.get(row.nh).then((resp) => {
					// 	const code = resp?.data ?? -1;
					// 	if (code === -1) throw code;
					// 	else return code;
					// });
					// const body = await response;
					//
					// const soup = new JSSoup(body);
					//
					// title = decode(
					// 	soup
					// 		.find('h1', 'title')
					// 		.text.match(
					// 		/^(?:\s*(?:=.*?=|<.*?>|\[.*?]|\(.*?\)|\{.*?})\s*)*(?:[^[|\](){}<>=]*\s*\|\s*)?([^\[|\](){}<>=]*?)(?:\s*(?:=.*?=|<.*?>|\[.*?]|\(.*?\)|\{.*?})\s*)*$/
					// 	)[1].trim()
					// );
					//
					// author = decode(
					// 	soup
					// 		.findAll('a', 'tag')
					// 		.filter((s) => {
					// 			return s?.attrs?.href?.match(/\/artist\/(.*)\//);
					// 		})
					// 		.map((s) => {
					// 			return s.find('span', 'name').text.replace(/(?:^|\s+)(\w{1})/g, (letter) => letter.toUpperCase());
					// 		})
					// 		.join(", ")
					// );
					//
					// parodies = soup
					// 	.findAll('a', 'tag')
					// 	.filter((s) => {
					// 		return s?.attrs?.href?.match(/\/parody\/(.*)\//);
					// 	})
					// 	.map((s) => {
					// 		return decode(s.find('span', 'name').text.replace(/(?:^|\s+)(\w{1})/g, (letter) => letter.toUpperCase()));
					// 	})
					// 	.filter((s) => s !== "Original");
					//
					// chars = soup
					// 	.findAll('a', 'tag')
					// 	.filter((s) => {
					// 		return s?.attrs?.href?.match(/\/character\/(.*)\//);
					// 	}).map((s) => {
					// 		return decode(s.find('span', 'name').text.toLowerCase());
					// 	});
					//
					// siteTags.tags = soup
					// 	.findAll('a', 'tag')
					// 	.filter((s) => {
					// 		return s?.attrs?.href?.match(/\/tag\/(.*)\//);
					// 	})
					// 	.map((s) => {
					// 		return decode(s.find('span', 'name').text);
					// 	})
					// 	.filter((s) => !ignoredTags.includes(s));

				} else if (row?.nh?.match(/fakku/)) {
					const response = axios.get(row.nh).then((resp: AxiosResponse) => {
						const respdata = resp?.data;
						if (!respdata) throw new Error(`No response body found.`);
						else return respdata;
					});
					const body = await response;
					const soup = new JSSoup(body);

					title = decode(
						soup
							.find('h1')
							.text);

					author = decode(
						soup
							.find('title')
							.text.match(
							/by (.+) - FAKKU/
							)[1].trim());

					parodies = soup
						.findAll('a')
						.filter((s: any) => {
							return s?.attrs?.href?.match(/\/series\/.+/);
						})
						.map((s: any) => {
							return decode(s.text.replace(/\sseries/i, '').trim());
						})
						.filter((s: string) => s !== "Original Work");

					tags = soup
						.findAll('a')
						.filter((s: any) => {
							return s?.attrs?.href?.match(/\/tags\/.+/) || s?.attrs?.title?.match(/Read With.+/i);
						})
						.map((s: any) => {
							return decode(s.text.replace(/Read With.+/i, 'unlimited').toLowerCase().trim());
						})
						.filter((s: string) => s !== "hentai");

				}

				if (!row.title && title) {
					row.title = title;
					message.channel.send(`Updated missing title \`${row.title}\`!`);
				}
				if (!row.author && author) {
					row.author = author;
					message.channel.send(`Updated missing author \`${row.author}\`!`);
				}
				if (!row.parody && parodies) {
					if (parodies.length >= 1) {
						const parodies2 = [...parodies]; //parodies will be used in the detectedCharacters block below, so we don't want to modify it
						for (let u = 0; u < parodies2.length; u++) {
							for (const [key, value] of Object.entries(renameParodies)) {
								if (`${value}`.includes(parodies2[u])) {
									parodies2[u] = `${key}`;
									break;
								}
							}
						}
						const newParodies = [...new Set(parodies2)]; //removes duplicates if they exist
						row.parody = newParodies.join(", ");
						message.channel.send(`Updated missing parody \`${row.parody}\`!`);
					} else {
						message.channel.send(`No parodies detected.`);
					}
				}
				if (tags?.length > 0) {
					siteTags.tags = [...tags];
				}
				
				const chars2: string[] = [...chars]; //chars will be used in the detectedCharacters block
				
				if (chars2?.length > 0) {
					for (let t = 0; t < chars2.length; t++) {
						for (const [key, value] of Object.entries(renameCharacters)) {
							if (`${key}` == chars2[t]) {
								chars2[t] = `${value}`;
								break;
							}
						}
					}
					siteTags.characters = [...chars2];
				}
				if (!row.siteTags && (siteTags.tags?.length > 0 || siteTags.characters?.length > 0)) {
					row.siteTags = JSON.stringify(siteTags);
					message.channel.send(`Updated missing tags!`);
				} else if (row.siteTags && (chars2?.length > 0 || tags?.length > 0)) {
					const siteTagsParsed = JSON.parse(row.siteTags);
					if ((siteTagsParsed.tags?.length === 0 || !siteTagsParsed.tags) && (tags?.length > 0)) {
						siteTagsParsed.tags = [...tags];
					}
					if ((siteTagsParsed.characters?.length === 0 || !siteTagsParsed.characters) && (chars2?.length > 0)) {
						siteTagsParsed.characters = [...chars2];
					}

					row.siteTags = JSON.stringify(siteTagsParsed);
					message.channel.send(`Updated missing tags!`);
				}

				const detectedCharacters = [];

				for (let i = 0; i < chars.length; i++) {
					const curChar = chars[i].toLowerCase();
					if (curChar in underageCharacters) {
						const curList = underageCharacters[curChar as keyof typeof underageCharacters];

						for (let j = 0; j < parodies.length; j++) {
							for (let k = 0; k < curList.length; k++) {
								const seriesList = curList[k]['series'];
								for (let l = 0; l < seriesList.length; l++) {
									if (seriesList[l].toLowerCase().trim() === parodies[j].toLowerCase().trim()) {
										detectedCharacters.push([curChar, seriesList[l], curList[k]['age'], curList[k]['note']]);
									}
								}
							}
						}
					}
				}

				if (detectedCharacters.length >= 1) {
					let characterStr = "";
					for (let i = 0; i < detectedCharacters.length; i++) {
						characterStr += "• " + detectedCharacters[i][0].replace(/(?:^|\s+)(\w{1})/g, (letter) => letter.toUpperCase());
						characterStr += ", aged " + detectedCharacters[i][2];
						characterStr += ", from " + detectedCharacters[i][1];

						if (detectedCharacters[i][3]) {
							characterStr += " (Note: " + detectedCharacters[i][3] + ")"
						}

						characterStr += "\n"
					}

					const embed = new Discord.EmbedBuilder()
						.setTitle(`Underage character(s) detected!`)
						.setDescription(characterStr +
							"\n*If there is a note, make sure none of the exceptions apply before deleting.*")

					message.channel.send({ embeds: [ embed ] });
				}
			} catch (e) {
				const site = row?.hm?.match(/(\w+)\.io/)![1] ?? row?.nh?.match(/(\w+)\.net/)![1] ?? row?.eh?.match(/\/\/(.*?)\.org/)![1] ?? row?.im?.match(/(\w+)\.com/)![1] ?? 'some website';
				// @ts-expect-error just checking
				if (e?.response?.status === 503) {
					message.channel.send(`Failed to connect to ${site}: 503 error (likely nhentai has cloudflare up) Failed to get missing information.`);
					console.log(`Error 503: Couldn't connect to ${site}!`);
				} else {
					message.channel.send(`Failed to get missing information from ${site}!`);
					console.log(e);
				}
			}
		}
		resolve();
	})
}

/**
 * Do everything needed after the upload to the final list.
 * @param {Discord.Message} message
 * @param {Number} list
 * @param {Row} row
 */
function postUploadOperation(message: Message, list: number, row: Row) {
	// eslint-disable-next-line no-async-promise-executor
	return new Promise<void>(async (resolve, reject) => {
		if (list != 4){
			if (list === 9) {
				await update();
				message.channel.send("Updated website!")
			}
			resolve();
			return;
		}
		await update();
		//update public server
		const embed = entryEmbed(row, -1, -1, message);
		embed.setFooter({ text: 'Wholesome God List' });

		updatePublicServer(embed);

		const upRows = await sheets.get('SITEDATA2');

		if (upRows.length > 10) {
			await del(message, 8, 1);
		}

		await sheets.append('SITEDATA2', [row.title, 'https://wholesomelist.com/list/'+row.uid, row.author, row.tier, Date.now()]);
		message.channel.send('Updated public server / website!');
		resolve();
		return;
	})
}

/**
 * Main function that takes a row.
 * @param {Discord.Message} message
 * @param {Number} list
 * @param {Row} row
 */
export default async function add(message: Message, list: number, row: Row) {
	if (list <= 0 || list > info.sheetNames.length) {
		message.channel.send('Cannot add to a nonexistent sheet!');
		return false;
	}

	try {
		await prepUploadOperation(message, list, row);

		await setInfo(message, list, row);

		const newRow = await sheets.append(info.sheetNames[list], row.toArray());
		await message.channel.send(`Successfully added \`${list}#${newRow - 1}\`!`);

		await postUploadOperation(message, list, row);

		return true;
	} catch (e) {
		logError(message, e);
		return false;
	}
}
