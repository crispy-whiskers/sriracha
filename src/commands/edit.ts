var Row = require('../row');
var Discord = require('discord.js');
var info = require('../../config/globalinfo.json');
var log = require('./log');
var misc = require('./misc');
var sheets = require('../sheetops');
var Jimp = require('jimp');
var validTags = require('../../data/tags.json');
const AWS = require('aws-sdk');
const s3 = new AWS.S3({
	accessKeyId: info.awsId,
	secretAccessKey: info.awsSecret
});

/**
 * Edits a row from a sheet.
 * @param {Discord.Message} message
 * @param {Number} list
 * @param {Number} ID
 * @param {*} flags
 */
async function edit(message, list, ID, flags) {
	if (list <= 0 || list > info.sheetNames.length) {
		message.channel.send('Cannot edit from a nonexistent sheet!');
		return false;
	}
	let name = info.sheetNames[list];
	try {
		const rows = await sheets.get(name);
		//we are editing so we fetch whats in the sheet of course

		if (ID == 0 || ID > rows.length) {
			message.channel.send(`Cannot get nonexistent row! The last entry in this sheet is \`${list}#${rows.length}\``);
			return false;
		}

		//for deleting fields
		let target = new Row(rows[ID - 1]);
		for (let property in flags) {
			if (flags[property].toLowerCase() === "clear") {
				flags[property] = null;
			}
		}

		//replace tildes
		if (flags.tr?.includes('~')) {
			flags.tr = flags.tr.replace('~', '-');
		}

		//misc editing detected!!
		if(flags.addalt || flags.delalt || flags.addseries || flags.delseries || flags.fav || flags.fav === null || flags.r || flags.r === null) {
			let miscField = JSON.parse(target.misc ?? '{}');

			if(flags.addalt) {
				if(!miscField.altLinks) {
					miscField.altLinks = [];
				}
				let altLinks = flags.addalt.split(',').map((s) => s.trim());
				miscField.altLinks.push({
					link: altLinks[0],
					name: altLinks[1]
				});
				//create object structure if necessary and push the necessary info to the array
			}

			if(flags.delalt) {
				if (miscField.altLinks) {
					for (let i = miscField.altLinks.length - 1; i >= 0; i--) {
						if (miscField.altLinks[i].name === flags.delalt) {
							miscField.altLinks.splice(i, 1);
						} //delete operations calls for splicing the array to the requested field
					}
				}
				if (miscField.altLinks.length === 0) {
					delete miscField.altLinks; //get rid of the object structure if theres nothing left after delete
				}
			}

			if(flags.addseries) {
				if (!miscField.series) {
					miscField.series = [];
				}
				let series = flags.addseries.split(',').map((s) => s.trim());

				if(series.length > 2) {
					let temp = [];
					let last = series.pop();
					let last2nd = series.pop();
					let title = series.join(', ');
					temp.push(title, last2nd, last);
					series = temp;
				}
				miscField.series.push({
					name: series[0],
					type: series[1],
					number: +series[2]
				});	//same as adding an altlink above
			}

			if(flags.delseries) {
				if (miscField.series) {
					for (let i = miscField.series.length - 1; i >= 0; i--) {
						if (miscField.series[i].name === flags.delseries) {
							miscField.series.splice(i, 1);
						} //same as delalt operation above
					}
				}
				if (miscField.series.length === 0) {
					delete miscField.series;
				}
			}
			if (flags.fav === null) {
				delete miscField.favorite;
			} //favorites are just a single field, easy to add and remove
			if(flags.fav) {
				miscField.favorite = flags.fav;
			}

			if (flags.r === null) {
				delete miscField.r;
			}
			if(flags.r) {
				miscField.reason = flags.r;
			}

			if(Object.keys(miscField).length === 0) {
				target.misc = null;
			} else {
				target.misc = JSON.stringify(miscField);
			}
		}

        //edit the character array in the siteTags field
        if (flags.addcharacter || flags.delcharacter) {
            let siteTags = JSON.parse(target.siteTags ?? '{}');
            let char = flags.addcharacter?.toLowerCase() ?? flags.delcharacter?.toLowerCase();

            if(flags.addcharacter) {
                if(!siteTags.characters) {
                    siteTags.characters = [];
                }
                if (siteTags.characters.includes(char)) {
                    message.channel.send('Character is already in the entry!');
                }
                else {
                    siteTags.characters.push(char);
                    siteTags.characters.sort();
                    message.channel.send('Added `' + char + '` to the entry!');
                }
            }

            if(flags.delcharacter) {
                if (siteTags.characters) {
                    charLength = siteTags.characters.length;
                    for (let i = charLength - 1; i >= 0; i--) {
                        if (siteTags.characters[i] === char) {
                            siteTags.characters.splice(i, 1);
                            message.channel.send('Deleted `' + char + '` from the entry!');
                        }
                    }
                    if (charLength == siteTags.characters.length) {
                    message.channel.send('Couldn\'t find `' + char + '` in the entry!');
                    }
                }
            }

            if(Object.keys(siteTags).length === 0) {
                target.siteTags = null;
            } else {
                target.siteTags = JSON.stringify(siteTags);
            }
        }

		let r = new Row(flags);

		target.update(r);
		if (flags?.rtag) {
			flags.rtag = flags.rtag.replace(/(?:^|\s+)(\w{1})/g, (letter) => letter.toUpperCase()); //make sure the tag is capitalized
			if (list === 1) {
				message.channel.send(
					"**Don't edit tags in `New Finds`! Make sure it has been QCed before moving them to `Unsorted` to apply tags!**"
				);
			} else if (target.rtag(flags.rtag)) {
				message.channel.send(`Successfully deleted the \`${flags.rtag}\` tag in entry \`${list}#${ID}\`!`);
			} else {
				message.channel.send(`Entry \`${list}#${ID}\` did not contain the tag \`${flags.rtag}\`.`);
			}
		}
		if (flags?.atag) {
			flags.atag = flags.atag.replace(/(?:^|\s+)(\w{1})/g, (letter) => letter.toUpperCase()); //make sure the tag is capitalized
			if (list === 1) {
				message.channel.send(
					"**Don't edit tags in `New Finds`! Make sure it has been QCed before moving them to `Unsorted` to apply tags!**"
				);
			} else if (!validTags.includes(flags.atag)) {
				message.channel.send(`**Invalid tag \`${flags.atag}\` detected!** Try removing unneeded characters.`);
			} else {
				result = target.atag(flags.atag);
				if (result) {
					message.channel.send(`Successfully added the \`${flags.atag}\` tag to entry \`${list}#${ID}\`!`);
				} else {
					message.channel.send(`That tag \`${flags.atag}\` already exists on this entry. Ignoring...`);
				}
			}
		}
		if (flags?.img) {
			if(list === 4) { // image was updated and it's the final list
				let imageLocation = target.img;

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
					Key: target.uid + '.jpg',
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

						target.img = "https://wholesomelist.com/asset/" + target.uid + ".jpg";
						resolve();
						return;
					});
				});
				message.channel.send(`Uploaded! The thumbnail can now be found at \`${target.img}\``);
			}
		}

		//convert back to A1 notation
		await sheets.overwrite(name, ID + 1, target.toArray());

		message.channel.send(`\`${list}#${ID}\` updated successfully!`);

		if (list == 4 || list == 9) {
			await misc.update()
			.then((resp)=>{
				message.channel.send(`\`${list}#${ID}\` was pushed to the website with code ${resp.status}`);
				if(resp.status==200)
					return;
				else
					throw resp;

			}).catch((err)=>{
				message.channel.send(`\`${list}#${ID}\` was not updated on the website. Please run \`sauce update\`!`);
				log.log(`Site update failed for \`${list}#${ID}\`\n`+resp.status == 200 ? 'successful update' : `failed update, code ${resp.status}`);
				log.log(err)
			}).finally(()=>{
				log.log('Update promise resolved.')
			});
		}
		return true;
	} catch (e) {
		log.logError(message, e);
		return false;
	}
}
module.exports = edit;