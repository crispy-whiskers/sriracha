import axios, { AxiosError } from 'axios';
import { fetchEHApi, fetchChestApi, fetchNHApi } from './api';

// const JSSoup = require('jssoup').default;

/**
 * Returns the length of the gallery. returns -1 if failed.
 */
export default async function fetchPages(url: string) {
	return new Promise<void>((resolve, reject) => {
		if (!url.match(/e-hentai|imgchest|fakku|nhentai/)) reject(-1);
		//not mainstream site. cannot fetch.
		resolve();
	}).then(async () => {
		try {
			if (url.match(/e-hentai/)) {
				const data = await fetchEHApi(url);
				return data.filecount;
			} else if (url.match(/imgchest/)) {
				const data = await fetchChestApi(url);
				return data.image_count ?? -1;
			} else if (url.match(/fakku\.net/)) {
				const resp = (
					await axios.get(url).catch((e: Error | AxiosError) => {
						console.log('Uh oh stinky', e);
					})
				)?.data;
				if (!resp) {
					throw new Error('No response body found for FAKKU.');
				}
				const pageNums = resp.match(/(?<num>\d+) pages/);
				return +(pageNums?.groups?.num ?? -1);
			} else {
				const data = await fetchNHApi(url);
				return data.num_pages ?? -1;
			}
		} catch (e) {
			return -1;
		}
	});
}
