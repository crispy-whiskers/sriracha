import axios, { AxiosResponse, AxiosError } from 'axios';
import info from '../../config/globalinfo.json';

export async function fetchEHApi(link: string): Promise<Record<string, any>> {
	const match = link.match(/\/g\/(\d+)\/([0-9a-f]{10})\/?$/);
	if (!match) {
		throw new Error(`Improper E-Hentai link! ${link} is not valid.`);
	}
	const [galleryID, galleryToken] = match.slice(1);
	return axios
		.post('https://api.e-hentai.org/api.php', {
			method: 'gdata',
			gidlist: [
				[parseInt(galleryID), galleryToken],
			],
			namespace: 1,
		})
		.then((resp: AxiosResponse) => {
			const respdata = resp?.data;
			if (!respdata) throw new Error(`No response body found.`);
			if (respdata.error) throw new Error(`The following error was found in the body: returned the following error: ${respdata.error}`);
			if (respdata.gmetadata[0]?.error) throw new Error(`The E-Hentai API had the following error: ${respdata.gmetadata[0].error}`);
			return respdata.gmetadata[0] as Record<string, any>;
		})
		.catch((e: Error | AxiosError) => {
			console.log(e);
			throw new Error(`Failed to connect to E-Hentai's API: ${e}`);
		});
}

export async function fetchIMApi(link: string): Promise<Record<string, any>> {
	const imgurMatch = /https:\/\/imgur.com\/a\/([A-z0-9]*)/.exec(link);
	if (!imgurMatch) {
		throw new Error(`Improper imgur link! ${link} is not valid.`);
	}
	const hashCode = imgurMatch[1];

	return axios.get(`https://api.imgur.com/3/album/${hashCode}`, {
		headers: { Authorization: info.imgurClient },
	})
		.then((resp: AxiosResponse) => {
			return resp.data.data as Record<string, any>;
		})
		.catch((e: Error | AxiosError) => {
			console.log(e);
			throw new Error(`Failed to connect to Imgur's API: ${e}`);
		});
}

export async function fetchNHApi(link: string): Promise<Record<string, any>> {
	const nhMatch = link.match(/g\/(\d{3,6})/)![1];
	if (!nhMatch) {
		throw new Error(`Improper nhentai link! ${link} is not valid.`);
	}

	return axios.get(`https://nhentai.net/api/gallery/${nhMatch}`)
		.then((resp: AxiosResponse) => {
			const respdata = resp?.data;
			if (!respdata) throw new Error(`No response body found.`);
			return respdata;
		})
		.catch((e: Error | AxiosError) => {
			console.log(e);
			throw new Error(`Failed to connect to Nhentai's API: ${e}`);
		});
}
