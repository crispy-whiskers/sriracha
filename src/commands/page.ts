import axios from 'axios';
import { fetchEHApi, fetchIMApi } from '../api/api';

// const JSSoup = require('jssoup').default;

/**
 * Returns the length of the gallery. returns -1 if failed.
 */
export default async function fetchPages(url: string) {
	return new Promise((resolve, reject) => {
		if (!url.match(/e-hentai|imgur|fakku|nhentai/)) reject(-1); //not mainstream site. cannot fetch.
	}).then(async () => {
		if (url.match(/e-hentai/)) {
			const data = await fetchEHApi(url);
			return data.filecount;
		} else if (url.match(/imgur/)) {
			const data = await fetchIMApi(url);
			return data.images_count ?? -1;
		} else if (url.match(/fakku\.net/)) {
			const resp = (
				await axios.get(url).catch((e) => {
					console.log('Uh oh stinky');
				})
			)?.data;
			if (!resp) {
				throw new Error('No response body found for FAKKU.');
			}
			const pageNums = resp.match(/(?<num>\d+) pages/);
			return +(pageNums?.groups?.num ?? -1);
		} else {
			return -1;
			// //ensure good url
			// if (!url.match(/^https:\/\/nhentai.net\/g\/\d+/)) return;
			// if (!url.match(/https:\/\/nhentai.net\/g\/\d+\//g)) url += '/';
			//
			//
			// const response = await axios.get(url).then((resp) => {
			// 	return resp?.data;
			// });
			// if(!response) { throw new Error("No response body found.") }
			// const soup = new JSSoup(response);
			//
			// const page = soup
			// 		.findAll('a', 'tag')
			// 		.filter((s) => {
			// 			return s?.attrs?.href?.match(/\/search\/(.*)/)
			//
			// 		})[0]
			// 		.find('span', 'name').text
			//
			// return page;
		}
	});
}
