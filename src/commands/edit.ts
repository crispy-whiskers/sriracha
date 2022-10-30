import Row from '../row';
import { Message } from 'discord.js';
import info from '../../config/globalinfo.json';
import { log, logError } from './log';
import { update } from './misc';
import { fetchInfo } from './fetch';
import sheets from '../sheetops';
import { AxiosResponse, AxiosError } from 'axios';
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

	const namespaceWeight = {
		male: 0,
		female: 1,
		mixed: 2,
		other: 3
	};

	function sortTags(array: string[]) {
		return array.sort(function(a: string, b: string) {
			const aPrefix = (namespaceWeight[a.split(':')[0] as keyof typeof namespaceWeight]);
			const bPrefix = (namespaceWeight[b.split(':')[0] as keyof typeof namespaceWeight]);
			if (aPrefix == bPrefix) {
				return a.localeCompare(b);
			}
			return aPrefix < bPrefix ? -1 : aPrefix > bPrefix ? 1 : 0;
		});
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
			if (!siteRegex) {
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
		if (flags.addalt || flags.delalt || flags.addseries || flags.delseries || flags.fav || flags.fav === null || flags.r || flags.r === null) {
			const miscField = JSON.parse(target.misc ?? '{}');

			if (flags.addalt) {
				if (flags.addalt.includes('http')) {
					flags.addalt = flags.addalt.replace('http://', 'https://');
					if (!miscField.altLinks) {
						miscField.altLinks = [];
					}
					const altLinks = flags.addalt.split(',').map((s) => s.trim());
					miscField.altLinks.push({
						link: altLinks[0],
						name: altLinks[1]
					});
					//create object structure if necessary and push the necessary info to the array
				} else {
					message.channel.send(`Failed to add the alternative link to entry \`${list}#${ID}\`. The alt is missing a link!`);
				}
			}

			if (flags.delalt) {
				if (miscField.altLinks) {
					const altLength = miscField.altLinks.length;
					for (let i = altLength - 1; i >= 0; i--) {
						if (miscField.altLinks[i].name === flags.delalt) {
							miscField.altLinks.splice(i, 1);
						} //delete operations calls for splicing the array to the requested field
					}
					if (altLength == miscField.altLinks.length) {
						message.channel.send(`Entry \`${list}#${ID}\` did not contain the alt link \`${flags.delalt}\`!`);
					} else {
						if (miscField.altLinks.length === 0) {
							delete miscField.altLinks; //get rid of the object structure if theres nothing left after delete
						}
					}
				}
			}

			if (flags.addseries) {
				if (!miscField.series) {
					miscField.series = [];
				}
				const series = flags.addseries.split(',').map((s) => s.trim());

				if (series.length > 2) {
					series.unshift(series.splice(0, series.length - 2).join(', '));
				}
				if (series[1].toLowerCase() == 'series' || series[1] == 'anthology') {
					miscField.series.push({
						name: series[0],
						type: series[1],
						number: +series[2]
					});	//same as adding an altlink above
				} else {
					message.channel.send(`Failed to add the \`${series[0]}\` series to entry \`${list}#${ID}\`! \`${series[1]}\` is not a valid type!`);
				}
			}

			if (flags.delseries) {
				if (miscField.series) {
					const seriesLength = miscField.series.length;
					for (let i = seriesLength - 1; i >= 0; i--) {
						if (miscField.series[i].name === flags.delseries) {
							miscField.series.splice(i, 1);
						} //same as delalt operation above
					}
					if (seriesLength == miscField.series.length) {
						message.channel.send(`Entry \`${list}#${ID}\` did not contain the series \`${flags.delseries}\`!`);
					} else {
						if (miscField.series.length === 0) {
							delete miscField.series; //get rid of the object structure if theres nothing left after delete
						}
					}
				}
			}
			if (flags.fav === null) {
				delete miscField.favorite;
			} //favorites are just a single field, easy to add and remove
			if (flags.fav) {
				miscField.favorite = flags.fav;
			}

			if (flags.r === null) {
				delete miscField.r;
			}
			if (flags.r) {
				miscField.reason = flags.r;
			}

			if (Object.keys(miscField).length === 0) {
				target.misc = null;
			} else {
				target.misc = JSON.stringify(miscField);
			}
		}

		//edit the sitetags field
		if (flags.addcharacter || flags.delcharacter || flags.addsitetag || flags.delsitetag) {
			const siteTags = JSON.parse(target.siteTags ?? '{}');

			if (flags.addcharacter || flags.delcharacter) {
				const char = flags.addcharacter?.toLowerCase() ?? flags.delcharacter?.toLowerCase();

				if (flags.addcharacter) {
					if (!siteTags.tags) {
						siteTags.tags = [];
					}
					if (!siteTags.characters) {
						siteTags.characters = [];
					}
					if (siteTags.characters.includes(char)) {
						message.channel.send(`Character \`${char}\` already exists on this entry!`);
					} else {
						siteTags.characters.push(char);
						siteTags.characters.sort();
						message.channel.send(`Successfully added \`${char}\` to entry \`${list}#${ID}\`!`);
					}
				}

				if (flags.delcharacter) {
					if (siteTags.characters) {
						const charLength = siteTags.characters.length;
						for (let i = charLength - 1; i >= 0; i--) {
							if (siteTags.characters[i] === char) {
								siteTags.characters.splice(i, 1);
								message.channel.send(`Successfully deleted \`${char}\` in entry \`${list}#${ID}\`!`);
							}
						}
						if (charLength == siteTags.characters.length) {
							message.channel.send(`Entry \`${list}#${ID}\` did not contain the character \`${char}\`!`);
						}
					}
				}
			}

			if (flags.addsitetag) {
				const newTag = flags.addsitetag.toLowerCase();

				if (!siteTags.tags || siteTags.tags.length === 0) {
					siteTags.tags = [newTag];
				} else {
					if (siteTags.tags.includes(newTag)) {
						message.channel.send(`That site tag \`${newTag}\` already exists on this entry. Ignoring...`);
					} else if (newTag.includes(':') && siteTags.tags[0].includes(':')) {
						const prefix = newTag.split(':')[0];
						if (!(prefix in namespaceWeight)) {
							message.channel.send(`Failed to add the \`${newTag}\` site tag to entry \`${list}#${ID}\`! \`${prefix}\` is not a valid namespace!`);
						} else {
							siteTags.tags.push(newTag);
							sortTags(siteTags.tags);
							message.channel.send(`Successfully added the \`${newTag}\` site tag to entry \`${list}#${ID}\`!`);
						}
					} else if (newTag.includes(':') && !siteTags.tags[0].includes(':')) {
						message.channel.send(`Failed to add \`${newTag}\` to entry \`${list}#${ID}\`! Site tags in the entry don't have namespaces!`);
					} else if (!newTag.includes(':') && siteTags.tags[0].includes(':')) {
						message.channel.send(`Failed to add \`${newTag}\` to entry \`${list}#${ID}\`! Site tag is missing a namespace (male, female, mixed, or other)!`);
					} else {
						siteTags.tags.push(newTag);
						message.channel.send(`Successfully added the \`${newTag}\` site tag to entry \`${list}#${ID}\`!`);
					}
				}

				if (!siteTags.characters) {
					siteTags.characters = [];
				}
			}

			if (flags.delsitetag) {
				const delTag = flags.delsitetag.toLowerCase();

				if (!siteTags.tags || siteTags.tags.length === 0) {
					message.channel.send(`Entry \`${list}#${ID}\` does not contain site tags!`);
				} else {
					const sitetagsLength = siteTags.tags.length;

					if (!delTag.includes(':') && siteTags.tags[0].includes(':')) {
						message.channel.send(`Failed to delete \`${delTag}\` from  entry \`${list}#${ID}\`! Site tag is missing a namespace (male, female, mixed, or other)!`);
					} else {
						if (delTag.includes(':') && !siteTags.tags[0].includes(':')) {
							siteTags.tags = siteTags.tags.filter((s: string) => !s.includes(delTag.split(':')[1]));
						} else {
							siteTags.tags = siteTags.tags.filter((s: string) => !s.includes(delTag));
						}
						if (siteTags.tags.length == sitetagsLength) {
							message.channel.send(`Entry \`${list}#${ID}\` did not contain the site tag \`${delTag}\`!`);
						} else {
							message.channel.send(`Successfully deleted the \`${delTag}\` site tag from entry \`${list}#${ID}\`!`);
						}
					}
				}
			}

			if (Object.keys(siteTags).length === 0) {
				target.siteTags = null;
			} else {
				target.siteTags = JSON.stringify(siteTags);
			}
		}

		if (flags.fetch) {
			const fetchRegex = flags.fetch.match(/^(all|artist|author|character|parody|sitetag|tag|title)/);

			if (!fetchRegex) {
				message.channel.send('Invalid fetching option! Please only use `all`, `artist/author`, `characters`, `parody`, `sitetags/tags`, or `title`.');
			} else {
				const fetched = await fetchInfo(message, target);

				if ('error' in fetched || !fetched) {
					message.channel.send(`Unable to fetch the requested fields! ${fetched.error ?? ''}`);
				} else {
					const fetchFields = fetchRegex[0];
					let siteTags: { tags: string[], characters: string[] } = {
						tags: [],
						characters: []
					};

					if (target.siteTags) {
						siteTags = JSON.parse(target.siteTags);
					}

					switch (fetchFields) {
						case 'all':
							target.author = fetched.author;
							target.parody = fetched.parodies.join(', ');
							target.title = fetched.title;
							target.siteTags = JSON.stringify(fetched.siteTags);
							break;
						case 'artist':
						case 'author':
							target.author = fetched.author;
							break;
						case 'character':
							siteTags.characters = [...fetched.siteTags.characters];
							target.siteTags = JSON.stringify(siteTags);
							break;
						case 'parody':
							target.parody = fetched.parodies.join(', ');
							break;
						case 'sitetag':
							siteTags.tags = [...fetched.siteTags.tags];
							target.siteTags = JSON.stringify(siteTags);
							break;
						case 'title':
							target.title = fetched.title;
							break;
						default:
							break;
					}

					message.channel.send('Successfully fetched the requested fields!');
				}
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
				message.channel.send(`**Invalid tag \`${flags.atag}\` detected!** For a list of valid tags, use \`sauce tags\`.`);
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
			if (list === 4 || list === 9) { // image was updated and it's one of the final lists
				const imageLocation = target.img!;

				console.log(imageLocation);
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
				.then((resp: AxiosResponse)=>{
					message.channel.send(`\`${list}#${ID}\` was pushed to the website with code ${resp.status}`);
					if(resp.status==200)
						return;
					else
						throw resp;

				}).catch((err: Error | AxiosError)=>{
					message.channel.send(`\`${list}#${ID}\` was not updated on the website. Please run \`sauce update\`!`);
					logError(message, err);
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
