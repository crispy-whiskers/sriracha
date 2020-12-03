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

/**
 * Secondhand function to accept flag object.
 * @param {Discord.Message} message
 * @param {Number} list
 * @param {*} flags
 */
async function flagAdd(message, flags) {
	if (!flags.hasOwnProperty('l')) {
		message.channel.send('Please provide a link with the `-l` flag!');
	}

	flags.l = flags.l.replace('http://', 'https://');
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

		if (list != 4) { //if its not going to the final list, do nothing
			resolve();
			return;
		}


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

		row.uid = uuidv4()

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
			let resp = (await axios.get(row.link)).data.match(/(?<link>https:\/\/t\.nhentai\.net\/galleries\/\d+\/cover\..{3})/);
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
		} else {
			message.channel.send('dont use alternative sources idot');
			reject('Bad image source: `'+row.link+'`');
			return;
		}

		console.log(imageLocation)
		message.channel.send('Downloading `' + imageLocation + '` and converting to PNG...');
		let image = await Jimp.read(imageLocation);
		if (image.bitmap.width > 350) {
			await image.resize(350, Jimp.AUTO);
		}
		let data = await image.getBufferAsync(Jimp.MIME_PNG);

		const params = {
			Bucket: info.awsBucket,
			Key: row.uid + '.png',
			Body: data,
			ContentType: 'image/png',
			ACL: 'public-read-write',
		};
		await new Promise((resolve, reject) => {
			s3.upload(params, (err, data) => {
				if (err) {
					reject(err);
					return;
				}

				row.img = data.Location;
				resolve();				
				return;
			});
		});
		message.channel.send(`Uploaded! The thumbnail can now be found at \`${row.img}\``);
		resolve();
	})
}

/**
 * If a row does not have an author or title, sets it properly.
 * @param {Discord.Message} message 
 * @param {Number} list 
 * @param {Row} row 
 */
function setAuthorTitle(message, list, row) {
	return new Promise(async (resolve, reject) => {
		if (row.link.match(/nhentai/) !== null && list === 1 && !row.author && !row.title) {
			try {
				const response = axios.get(url).then((resp) => {
					const code = resp?.data ?? -1;
					if (code === -1) throw code;
					else return code;
				});
				const titleComponents = response.match(/<h1 class="title"><span class="before">(?<before>.+?)<\/span><span class="pretty">(?<pretty>.+?)<\/span><span class="after">(?<after>.+?)<\/span><\/h1>/)
				const longTitle = `${titleComponents.groups.before} ${titleComponents.groups.pretty} ${titleComponents.groups.after}`;
				row.title = longTitle.match(/^(?:\s*(?:=.*?=|<.*?>|\[.*?]|\(.*?\)|\{.*?})\s*)*(?:[^[|\](){}<>=]*\s*\|\s*)?([^\[|\](){}<>=]*?)(?:\s*(?:=.*?=|<.*?>|\[.*?]|\(.*?\)|\{.*?})\s*)*$/)[1].trim;
				const lowerAuthor = response.body.match(/Artists:\s*<span class="tags"><a href=".+?" class=".+?"><span class="name">(.+)<\/span><span class="count">/)[1];
				row.author = lowerAuthor.replace(/\b\w/g, c => c.toUpperCase());
			} catch (e) {
				message.channel.send('Failed to get title and author from nhentai!');
			}
		}
		resolve();
		return;

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

		await sheets.append('SITEDATA2', [row.title, row.link, row.author, row.tier, Date.now()]);
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

		await setAuthorTitle(message, list, row);

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
