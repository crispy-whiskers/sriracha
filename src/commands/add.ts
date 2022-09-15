var Row = require('../row');
var Discord = require('discord.js');
var info = require('../../config/globalinfo.json');
var log = require('./log');
var pFetch = require('./page');
var misc = require('./misc');
var del = require('./delete');
var sheets = require('../sheetops');
var axios = require('axios').default;
var Jimp = require('jimp');
const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk');
const s3 = new AWS.S3({
	accessKeyId: info.awsId,
	secretAccessKey: info.awsSecret
});
const decode = require('html-entities').decode;
const JSSoup = require('jssoup').default;

const underageCharacters = require('../../data/underage.json');
const renameParodies = require('../../data/parodies.json');
const ignoredTags = require('../../data/ignoredtags.json');

/**
 * Secondhand function to accept flag object.
 * @param {Discord.Message} message
 * @param {Number} list
 * @param {*} flags
 */
async function flagAdd(message, flags) {
	if (!flags.hasOwnProperty('l') && !flags.hasOwnProperty('l1') && !flags.hasOwnProperty('l2') && !flags.hasOwnProperty('l3') && !flags.hasOwnProperty('l4')) {
		message.channel.send('Please provide a link with one of the following flags: `-l`, `-l1` (Hmarket), `-l2` (nhentai), `-l3` (E-Hentai), or `-l4` (Imgur)!');
		return false;
	}

	if (flags.hasOwnProperty('l')) {
		flags.l = flags.l.replace('http://', 'https://');
		let site = flags.l.match(/hmarket|nhentai|e-hentai|imgur|fakku|irodoricomics|ebookrenta/)[0];
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
			default:
				message.channel.send('Link from unsupported site detected! Please try to only use links from Hmarket, nhentai, E-hentai, Imgur, FAKKU, Idodori, or Renta!');
				console.log('Link from unsupported site! This should never happen');
				break;
		}
	}
	if (flags.hasOwnProperty('l1')) {
		flags.l1 = flags.l1.replace('http://', 'https://');
	}
	if (flags.hasOwnProperty('l2')) {
		flags.l2 = flags.l2.replace('http://', 'https://');
	}
	if (flags.hasOwnProperty('l3')) {
		flags.l3 = flags.l3.replace('http://', 'https://');
	}
	if (flags.hasOwnProperty('l4')) {
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
	let row = new Row(flags);
	let list = flags?.s ?? 1;

	return add(message, list, row);
}

/**
 * Prepatory things to do before pushing a row to the final list.
 * @param {Discord.Message} message
 * @param {Number} list
 * @param {Row} row
 */
function prepUploadOperation(message, list, row) {
	return new Promise(async (resolve, reject) => {

		if (list != 4 && list != 9) { //if its not going to the final/licensed list, do nothing
			resolve();
			return;
		}

		if (row.page === -1) {
			let urlPage = row.eh ?? row.im ?? row.nh;
			for (let x = 0; x < 3; x++) {
				try {
					row.page = await pFetch(urlPage);
					if (row.page == -1) continue;
					break;
				} catch (e) {
					await new Promise((resolve, reject) => setTimeout(resolve, 500));
				}
			}
			if (row.page == -1) {
				message.channel.send('Failed to get page numbers! Please set it manually with `-pg`.');
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
		}

		let imageLocation = null;

		console.log('Detecting location of cover image...');
		if (typeof row.img !== 'undefined') {
			imageLocation = row.img;
		} else if (row?.eh?.match(/e-hentai/)) {
			let data = await eh_fetcher(row.eh);

			if (data == null) {
				message.channel.send('Unable to fetch cover image. Try linking the cover image with the -img tag.');
				reject(`Unable to fetch cover image for \`${row.eh}\``);
				return;
			}

			let galleryID = data.gid;

			page_token = data.thumb.match(/.*?\/\w{2}\/(\w{10}).*$/)[1];

			page_url = `https://e-hentai.org/s/${page_token}/${galleryID}-1`;

			const response = axios.get(page_url).then((resp) => {
				const code = resp?.data ?? -1;
				if (code === -1) throw code;
				else return code;
			});

			let body = await response;

			let soup = new JSSoup(body);

			let image = soup
					.findAll("img")
					.filter((s) => s?.attrs?.id === 'img')[0];

			imageLocation = image['attrs']['src'];

		} else if (row?.im?.match(/imgur/)) {
			let hashCode = /https:\/\/imgur.com\/a\/([A-z0-9]*)/.exec(row.im)[1];
			//extract identification part from the link
			let resp = await axios.get(`https://api.imgur.com/3/album/${hashCode}/images`, {
				headers: { Authorization: info.imgurClient },
			})
			imageLocation = resp.data.data[0].link;
		} else if (row?.nh?.match(/nhentai\.net\/g\/\d{1,6}\/\d+/)) {
			let resp = (await axios.get(row.nh)).data.match(/(?<link>https:\/\/i\.nhentai\.net\/galleries\/\d+\/\d+\..{3})/);
			if (typeof resp?.groups?.link === 'undefined') {
				message.channel.send('Unable to fetch cover image. Try linking the cover image with the -img tag.');
				reject(`Unable to fetch cover image for \`${row.nh}\``);
				return;
			}
			imageLocation = resp.groups.link;
		} else if (row?.nh?.match(/nhentai/)) {
			//let numbers = +(row.nh.match(/nhentai\.net\/g\/(\d{1,6})/)[1]);
			let resp = (await axios.get(row.nh)).data.match(/(?<link>https:\/\/t\d?\.nhentai\.net\/galleries\/\d+\/cover\..{3})/);
			if (typeof resp?.groups?.link === 'undefined') {
				message.channel.send('Unable to fetch cover image. Try linking the cover image with the -img tag.');
				reject(`Unable to fetch cover image for \`${row.nh}\``);
				return;
			}
			imageLocation = resp.groups.link;
		} else if (row?.nh?.match(/fakku\.net/)) {
			let resp = (await axios.get(row.nh).catch((e) => {
				console.log("Uh oh stinky");
			}))?.data;
			if (!resp) {
				message.channel.send("Unable to fetch FAKKU cover image. Try linking with -img.")
				reject(`Unable to fetch cover image for \`${row.nh}\``);
				return;
			}
			let imageLink = resp.match(/(?<link>https?:\/\/t\.fakku\.net.*?thumb\..{3})/);
			if (typeof imageLink?.groups?.link === 'undefined'){
				message.channel.send('Unable to fetch FAKKU cover image. Try linking the cover image with the -img tag.')
				reject(`Unable to fetch cover image for \`${row.nh}\``);
				return;
			}
			imageLocation = imageLink.groups.link;
		} else {
			message.channel.send('dont use alternative sources idot');
			reject('Bad image source: `'+row.nh+'`');
			return;
		}

		console.log(imageLocation)
		message.channel.send('Downloading `' + imageLocation + '` and converting to JPG...');
		let image = await Jimp.read(imageLocation);
		if (image.bitmap.width > 350) {
			await image.resize(350, Jimp.AUTO);
		}
		image.quality(70);
		let data = await image.getBufferAsync(Jimp.MIME_JPEG);

		const params = {
			Bucket: info.awsBucket,
			Key: row.uid + '.jpg',
			Body: data,
			ContentType: 'image/jpeg',
			ACL: 'public-read-write',
		};
		await new Promise((resolve, reject) => {
			s3.upload(params, (err, data) => {
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
function setInfo(message, list, row) {
	return new Promise(async (resolve, reject) => {
		if ((row?.eh?.match(/e-hentai/) || row?.nh?.match(/nhentai|fakku/)) && (list != 4 && list != 9) && (!row.parody || !row.author || !row.title || !row.siteTags)) {
			try {
				let title = '';
				let author = '';
				let parodies = [];
				let chars = [];
				let siteTags = {
					tags: [],
					characters: []
				};
				if (row?.eh?.match(/e-hentai/)) {
					let data = await eh_fetcher(row.eh);

					if ('error' in data) throw 'Failed to connect to E-hentai\'s API';

					title = decode(
						data.title.match(
							/^(?:\s*(?:=.*?=|<.*?>|\[.*?]|\(.*?\)|\{.*?})\s*)*(?:[^[|\](){}<>=]*\s*\|\s*)?([^\[|\](){}<>=]*?)(?:\s*(?:=.*?=|<.*?>|\[.*?]|\(.*?\)|\{.*?})\s*)*$/
						)[1].trim());

					author = data.tags
						.filter((s) => s.match(/artist/))
						.map((s) => decode(s.match(/artist:(.*)/)[1].replace(/(?:^|\s+)(\w{1})/g, (letter) => letter.toUpperCase())))
						.join(", ");

					parodies = data.tags
						.filter((s) => s.match(/parody/))
						.map((s) => decode(s.match(/parody:(.*)/)[1].replace(/(?:^|\s+)(\w{1})/g, (letter) => letter.toUpperCase())))
						.filter((s) => s !== 'Original');

					chars = data.tags
						.filter((s) => s.match(/character/))
						.map((s) => decode(s.match(/character:(.*)/)[1]));

					tags = data.tags
						.filter((s) => s.match(/(female|male|mixed|other):/))
						.filter((s) => !ignoredTags.some(x => s.includes(x)));

				} else if (row?.nh?.match(/nhentai/)) {
					const response = axios.get(row.nh).then((resp) => {
						const code = resp?.data ?? -1;
						if (code === -1) throw code;
						else return code;
					});
					let body = await response;

					let soup = new JSSoup(body);

					title = decode(
						soup
							.find('h1', 'title')
							.text.match(
							/^(?:\s*(?:=.*?=|<.*?>|\[.*?]|\(.*?\)|\{.*?})\s*)*(?:[^[|\](){}<>=]*\s*\|\s*)?([^\[|\](){}<>=]*?)(?:\s*(?:=.*?=|<.*?>|\[.*?]|\(.*?\)|\{.*?})\s*)*$/
						)[1].trim()
					);

					author = decode(
						soup
							.findAll('a', 'tag')
							.filter((s) => {
								return s?.attrs?.href?.match(/\/artist\/(.*)\//);
							})
							.map((s) => {
								return s.find('span', 'name').text.replace(/(?:^|\s+)(\w{1})/g, (letter) => letter.toUpperCase());
							})
							.join(", ")
					);

					parodies = soup
						.findAll('a', 'tag')
						.filter((s) => {
							return s?.attrs?.href?.match(/\/parody\/(.*)\//);
						})
						.map((s) => {
							return decode(s.find('span', 'name').text.replace(/(?:^|\s+)(\w{1})/g, (letter) => letter.toUpperCase()));
						})
						.filter((s) => s !== "Original");

					chars = soup
						.findAll('a', 'tag')
						.filter((s) => {
							return s?.attrs?.href?.match(/\/character\/(.*)\//);
						}).map((s) => {
							return decode(s.find('span', 'name').text.toLowerCase());
						});

					tags = soup
						.findAll('a', 'tag')
						.filter((s) => {
							return s?.attrs?.href?.match(/\/tag\/(.*)\//);
						})
						.map((s) => {
							return decode(s.find('span', 'name').text);
						})
						.filter((s) => !ignoredTags.includes(s));

				} else if (row?.nh?.match(/fakku/)) {
					const response = axios.get(row.nh).then((resp) => {
						const code = resp?.data ?? -1;
						if (code === -1) throw code;
						else return code;
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
						.filter((s) => {
							return s?.attrs?.href?.match(/\/series\/.+/);
						})
						.map((s) => {
							return decode(s.text.replace(/\sseries/i, '').trim());
						})
						.filter((s) => s !== "Original Work");

					tags = soup
						.findAll('a')
						.filter((s) => {
							return s?.attrs?.href?.match(/\/tags\/.+/) || s?.attrs?.title?.match(/Read With.+/i);
						})
						.map((s) => {
							return decode(s.text.replace(/Read With.+/i, 'unlimited').toLowerCase().trim());
						})
						.filter((s) => s !== "Hentai");

				}

				if (!row.title) {
					row.title = title;
					message.channel.send(`Updated missing title \`${row.title}\`!`);
				}
				if (!row.author) {
					row.author = author;
					message.channel.send(`Updated missing author \`${row.author}\`!`);
				}
				if (!row.parody) {
					if (parodies.length >= 1) {
						let parodies2 = [...parodies]; //parodies will be used in the detectedCharacters block below, so we don't want to modify it
						for (let u = 0; u < parodies2.length; u++) {
							for (const [key, value] of Object.entries(renameParodies)) {
								if (`${value}`.includes(parodies2[u])) {
									parodies2[u] = `${key}`;
									break;
								}
							}
						}
						let newParodies = [...new Set(parodies2)]; //removes duplicates if they exist
						row.parody = newParodies.join(", ");
						message.channel.send(`Updated missing parody \`${row.parody}\`!`);
					} else {
						message.channel.send(`No parodies detected.`);
					}
				}
				if (tags?.length > 0) {
					siteTags.tags = [...tags];
				}
				if (chars?.length > 0) {
					siteTags.characters = [...chars];
				}
				if ((!row.siteTags) && (siteTags.tags?.length > 0 || siteTags.characters?.length > 0)) {
					row.siteTags = JSON.stringify(siteTags);
					message.channel.send(`Updated missing tags!`);
				}

				let detectedCharacters = [];

				for (let i = 0; i < chars.length; i++) {
					let curChar = chars[i].toLowerCase();
					if (curChar in underageCharacters) {
						curList = underageCharacters[curChar];

						for (let j = 0; j < parodies.length; j++) {
							for (let k = 0; k < curList.length; k++) {
								let seriesList = curList[k]['series'];
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

					const embed = new Discord.MessageEmbed()
						.setTitle(`Underage character(s) detected!`)
						.setDescription(characterStr +
							"\n*If there is a note, make sure none of the exceptions apply before deleting.*")

					message.channel.send(embed);
				}
			} catch (e) {
				const site = row?.hm?.match(/(\w+)\.io/)[1] ?? row?.nh?.match(/(\w+)\.net/)[1] ?? row?.eh?.match(/\/\/(.*?)\.org/)[1] ?? row?.im?.match(/(\w+)\.com/)[1] ?? 'some website';
				if (e?.response?.status === 503) {
					message.channel.send(`Failed to connect to ${site}: 503 error (likely nhentai has cloudflare up) Failed to get missing information.`);
					console.log(`Error 503: Couldn\'t connect to ${site}!`);
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
function postUploadOperation(message, list, row) {
	return new Promise(async (resolve, reject) => {
		if (list != 4){
			if (list === 9) {
				await misc.update();
				message.channel.send("Updated website!")
			}
			resolve();
			return;
		}
		await misc.update();
		//update public server
		let embed = misc.embed(row, -1, -1, message);
		embed.setFooter('Wholesome God List');

		log.updatePublicServer(embed);

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
async function add(message, list, row) {
	if (list <= 0 || list > info.sheetNames.length) {
		message.channel.send('Cannot add to a nonexistent sheet!');
		return false;
	}

	try {
		await prepUploadOperation(message, list, row);

		await setInfo(message, list, row);

		let newRow = await sheets.append(info.sheetNames[list], row.toArray());
		await message.channel.send(`Successfully added \`${list}#${newRow - 1}\`!`);

		await postUploadOperation(message, list, row);

		return true;
	} catch (e) {
		log.logError(message, e);
		return false;
	}
}

function eh_fetcher(link) {
	const [galleryID, galleryToken] = link.match(/\/g\/(\d+)\/([0-9a-f]{10})\/?$/).slice(1);
	return axios
		.post('https://api.e-hentai.org/api.php', {
			method: 'gdata',
			gidlist: [[parseInt(galleryID), galleryToken]],
			namespace: 1,
		})
		.then((resp) => {
			const respdata = resp?.data;
			if (!respdata) throw new Error(`No response body found.`);
			if (respdata.error) throw new Error(`The following error was found in the body: returned the following error: ${code.error}`);
			if (respdata.gmetadata[0]?.error) throw new Error(`The E-Hentai API had the following error: ${respdata.gmetadata[0].error}`);
			return respdata.gmetadata[0];
		})
		.catch((e) => {
			console.log(e);
			throw new Error(`Failed to connect to E-Hentai's API: ${e}`);
		});
}

module.exports.add = add;
module.exports.fAdd = flagAdd;