import Row from '../row';
import { Message } from 'discord.js';
import info from '../../config/globalinfo.json';
import { log, logError } from './log';
import { update } from './misc';
import { setInfo } from './add';
import sheets from '../sheetops';
import Jimp from 'jimp';
import validTags from '../../data/tags.json';
import AWS from 'aws-sdk';
import { Flags } from '../index';
import { ManagedUpload } from 'aws-sdk/lib/s3/managed_upload';
import SendData = ManagedUpload.SendData;
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
export default async function edit(message: Message, list: number, ID: number, flags: Flags) {
	if (list <= 0 || list > info.sheetNames.length) {
		message.channel.send('Cannot edit from a nonexistent sheet!');
		return false;
	}
	const name = info.sheetNames[list];
	try {
		const rows = await sheets.get(name);
		//we are editing so we fetch whats in the sheet of course

		if (ID == 0 || ID > rows.length) {
			message.channel.send(`Cannot get nonexistent row! The last entry in this sheet is \`${list}#${rows.length}\``);
			return false;
		}

		//for deleting fields
		const target = new Row(rows[ID - 1]);
		for (const property in flags) {
			if (flags[property as keyof Flags]!.toLowerCase() === "clear") {
				flags[property as keyof Flags] = null;
			}
		}

		//replace tildes
		if (flags.tr?.includes('~')) {
			flags.tr = flags.tr.replace('~', '-');
		}

		//move link to the appropriate flag
		if (flags.l) {
			flags.l = flags.l.replace('http://', 'https://');
			const siteRegex = flags.l.match(/hmarket|nhentai|e-hentai|imgur|fakku|irodoricomics|ebookrenta/);
			if(!siteRegex) {
				message.channel.send('Link from unsupported site detected! Please try to only use links from Hmarket, nhentai, E-hentai, Imgur, FAKKU, Idodori, or Renta!');
				console.log('Link from unsupported site! This should never happen');
			} else {
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
		}

		//misc editing detected!!
		if(flags.addalt || flags.delalt || flags.addseries || flags.delseries || flags.fav || flags.fav === null || flags.r || flags.r === null) {
			const miscField = JSON.parse(target.misc ?? '{}');

			if(flags.addalt) {
				if(!miscField.altLinks) {
					miscField.altLinks = [];
				}
				const altLinks = flags.addalt.split(',').map((s) => s.trim());
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
					const temp: string[] = [];
					const last = series.pop();
					const last2nd = series.pop();
					const title = series.join(', ');
					temp.push(title, last2nd!, last!);
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
            const siteTags = JSON.parse(target.siteTags ?? '{}');
            const char = flags.addcharacter?.toLowerCase() ?? flags.delcharacter?.toLowerCase();

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
                    const charLength = siteTags.characters.length;
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

		if (flags.fetch) {
			const fetchRegex = flags.fetch.match(/^(all|artist|author|character|parody|sitetag|title)/);
			if (!fetchRegex) {
				message.channel.send('Invalid fetching option! Please only use `all`, `artist`, `author`, `character`, `parody`, `sitetag`, or `title`.');
			} else {
				const fetchFields = fetchRegex[0];

				let siteTags: { tags: string[], characters: string[] } = {
					tags: [],
					characters: []
				};

				if (target.siteTags) {
					siteTags = JSON.parse(target.siteTags);
				};

				switch (fetchFields) {
					case 'all':
						target.author = null;
						target.parody = null;
						target.title = null;
						target.siteTags = null;
						target.author = null;
						break;
					case 'artist':
					case 'author':
						target.author = null;
						break;
					case 'character':
						siteTags.characters = [];
						target.siteTags = JSON.stringify(siteTags);
						break;
					case 'parody':
						target.parody = null;
						break;
					case 'sitetag':
						siteTags.tags = [];
						target.siteTags = JSON.stringify(siteTags);
						break;
					case 'title':
						target.title = null;
						break;
					default:
						break;
				}

				await setInfo(message, list, target);
			}
		}

		const r = new Row(flags);

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
				const result = target.atag(flags.atag);
				if (result) {
					message.channel.send(`Successfully added the \`${flags.atag}\` tag to entry \`${list}#${ID}\`!`);
				} else {
					message.channel.send(`That tag \`${flags.atag}\` already exists on this entry. Ignoring...`);
				}
			}
		}
		if (flags?.img) {
			if(list === 4) { // image was updated and it's the final list
				const imageLocation = target.img!;

				console.log(imageLocation)
				message.channel.send('Downloading `' + imageLocation + '` and converting to JPG...');
				const image = await Jimp.read(imageLocation);
				if (image.bitmap.width > 350) {
					await image.resize(350, Jimp.AUTO);
				}
				image.quality(70);
				const data = await image.getBufferAsync(Jimp.MIME_JPEG);

				const params = {
					Bucket: info.awsBucket,
					Key: target.uid + '.jpg',
					Body: data,
					ContentType: 'image/jpeg',
					ACL: 'public-read-write',
				};
				await new Promise<void>((resolve, reject) => {
					s3.upload(params, (err: Error, data: SendData) => {
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
			await update()
			.then((resp)=>{
				message.channel.send(`\`${list}#${ID}\` was pushed to the website with code ${resp.status}`);
				if(resp.status==200)
					return;
				else
					throw resp;

			}).catch((err)=>{
				message.channel.send(`\`${list}#${ID}\` was not updated on the website. Please run \`sauce update\`!`);
				log(err)
			}).finally(()=>{
				log('Update promise resolved.')
			});
		}
		return true;
	} catch (e) {
		logError(message, e);
		return false;
	}
}
