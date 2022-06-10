var Row = require('../row');
var Discord = require('discord.js');
var info = require('../config/globalinfo.json');
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

const underageCharacters = require('../config/underage.json');


/**
 * Secondhand function to accept flag object.
 * @param {Discord.Message} message
 * @param {Number} list
 * @param {*} flags
 */
async function flagAdd(message, flags) {
	if (!flags.hasOwnProperty('l')) {
		message.channel.send('Please provide a link with the `-l` flag!');
		return false;
	}

	flags.l = flags.l.replace('http://', 'https://');

	if(flags.atag) {
		message.channel.send('Don\'t use the `-atag` flag when adding - it won\'t work! Add the entry and then modify the tags.');
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
			for (let x = 0; x < 3; x++) {
				try {
					row.page = await pFetch(row.link);
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

		row.uid = uuidv4()

		// Chop off trailing slashes in the link
		row.link = row.link.replace(/\/$/, "");

		// Chop off any mobile imgur links
		row.link = row.link.replace("m.imgur.com", "imgur.com");

		let imageLocation = null;

		console.log('Detecting location of cover image...');
		if (typeof row.img !== 'undefined') {
			imageLocation = row.img;
		} else if (row.link.match(/nhentai\.net\/g\/\d{1,6}\/\d+/)) {
			let resp = (await axios.get(row.link)).data.match(/(?<link>https:\/\/i\.nhentai\.net\/galleries\/\d+\/\d+\..{3})/);
			if (typeof resp?.groups?.link === 'undefined') {
				message.channel.send('Unable to fetch cover image. Try linking the cover image with the -img tag.');
				reject(`Unable to fetch cover image for \`${row.link}\``);
				return;
			}
			imageLocation = resp.groups.link;
		} else if (row.link.match(/nhentai/) !== null) {
			//let numbers = +(row.link.match(/nhentai\.net\/g\/(\d{1,6})/)[1]);
			let resp = (await axios.get(row.link)).data.match(/(?<link>https:\/\/t\d?\.nhentai\.net\/galleries\/\d+\/cover\..{3})/);
			if (typeof resp?.groups?.link === 'undefined') {
				message.channel.send('Unable to fetch cover image. Try linking the cover image with the -img tag.');
				reject(`Unable to fetch cover image for \`${row.link}\``);
				return;
			}
			imageLocation = resp.groups.link;
		} else if (row.link.match(/imgur/) !== null) {
			let hashCode = /https:\/\/imgur.com\/a\/([A-z0-9]*)/.exec(row.link)[1];
			//extract identification part from the link
			let resp = await axios.get(`https://api.imgur.com/3/album/${hashCode}/images`, {
				headers: { Authorization: info.imgurClient },
			})
			imageLocation = resp.data.data[0].link;
		} else if(row.link.match(/fakku\.net/)) {
			let resp = (await axios.get(row.link).catch((e) => {
				console.log("Uh oh stinky");
			}))?.data;
			if(!resp) {
				message.channel.send("Unable to fetch FAKKU cover image. Try linking with -img.")
				reject(`Unable to fetch cover image for \`${row.link}\``);
				return;
			}
			let imageLink = resp.match(/(?<link>https?:\/\/t\.fakku\.net.*?thumb\..{3})/);
			if(typeof imageLink?.groups?.link === 'undefined'){
				message.channel.send('Unable to fetch FAKKU cover image. Try linking the cover image with the -img tag.')
				reject(`Unable to fetch cover image for \`${row.link}\``);
				return;
			}
			imageLocation = imageLink.groups.link;
		} else {
			message.channel.send('dont use alternative sources idot');
			reject('Bad image source: `'+row.link+'`');
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
 * If a row does not have an author, title, or parody, sets it properly.
 * @param {Discord.Message} message
 * @param {Number} list
 * @param {Row} row
 */
function setInfo(message, list, row) {
	return new Promise(async (resolve, reject) => {
		if (!row.parody || !row.author || !row.title) {
			try {
				let title = '';
				let author = '';
				let parodies = [];
				let chars = [];
				if (row.link.match(/nhentai/) !== null) {
					const response = axios.get(row.link).then((resp) => {
						const code = resp?.data ?? -1;
						if (code === -1) throw code;
						else return code;
					});
					let body = await response;

					let soup = new JSSoup(body);

					title = decode(
						soup.find('h1', 'title')
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
							return decode(s.find('span', 'name').text);
						});
				} else if (row.link.match(/fakku/) !== null) {
					const response = axios.get(row.link).then((resp) => {
						const code = resp?.data ?? -1;
						if (code === -1) throw code;
						else return code;
					});
					const body = await response;
					const soup = new JSSoup(body);

					title = decode(soup.find('h1').text);
					author = decode(soup.find('title').text.match(/by (.+) - FAKKU/)[1].trim());
					parodies = soup.findAll('a')
						.filter((s) => {
							return s?.attrs?.href?.match(/\/series\/.+/)
						}).map((s) => {
							return decode(s.text.trim());
						});
				} else if (row.link.match(/exhentai|e-hentai/) !== null) {
					const response = axios.get(row.link).then((resp) => {
						const code = resp?.data ?? -1;
						if (code === -1) throw code;
						else return code;
					});
					const body = await response;
					const soup = new JSSoup(body);

					title = decode(soup
						.find('h1')
						.text.match(
							/^(?:\s*(?:=.*?=|<.*?>|\[.*?]|\(.*?\)|\{.*?})\s*)*(?:[^[|\](){}<>=]*\s*\|\s*)?([^\[|\](){}<>=]*?)(?:\s*(?:=.*?=|<.*?>|\[.*?]|\(.*?\)|\{.*?})\s*)*$/
						)[1].trim()
					);

					author = soup
						.findAll('a')
						.filter((s) => {
							return s?.attrs?.href.match(/artist/);
						})
						.map((s) => {
							return decode(s.text.replace(/(?:^|\s+)(\w{1})/g, (letter) => letter.toUpperCase()));
						})
						.join(', ');

					parodies = soup
						.findAll('a')
						.filter((s) => {
							return s?.attrs?.href.match(/parody/);
						})
						.map((s) => {
							return decode(s.text.replace(/(?:^|\s+)(\w{1})/g, (letter) => letter.toUpperCase()));
						})
						.filter((s) => s !== 'Original');

					chars = soup
						.findAll('a')
						.filter((s) => {
							return s?.attrs?.href.match(/character/);
						})
						.map((s) => {
							return decode(s.text.replace(/(?:^|\s+)(\w{1})/g, (letter) => letter.toUpperCase()));
						});
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
						row.parody = parodies.join(", ");
						message.channel.send(`Updated missing parody \`${row.parody}\`!`);
					} else {
						message.channel.send(`No parodies detected.`);
					}
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
						characterStr += detectedCharacters[i][0];
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
				const site = row?.link?.match(/(\w+)\.(?:com|net|org)/)[1] ?? 'some website';
				if (e.response.status === 503) {
					message.channel.send(`Failed to connect to ${site}: 503 error (likely nhentai has cloudflare up) Failed to get title and author.`);
					console.log(e);
				} else {
					message.channel.send(`Failed to get title and author from ${site}!`);
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

module.exports.add = add;
module.exports.fAdd = flagAdd;
