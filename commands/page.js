var Row = require('../row');
var axios = require('axios').default;
const decode = require('html-entities').decode;
const JSSoup = require('jssoup').default;

var info = require('../config/globalinfo.json');

/**
 *
 * @param {String} url
 * @returns {Number} the length of the gallery. returns -1 if failed.
 */
async function fetch(url) {
	return new Promise((resolve, reject) => {
		if (!url.match(/e-hentai|imgur|fakku|nhentai/)) reject(-1); //not mainstream site. cannot fetch.
		resolve(); //continue next link of promise chain immediately
	}).then(async () => {
		if (url.match(/e-hentai/)) {
			const [galleryID, galleryToken] = url.match(/\/g\/(.*?)\/(.*?)\//).slice(1);
			const response = await axios.post('https://api.e-hentai.org/api.php',
				{
					"method": "gdata",
					"gidlist": [
						[parseInt(galleryID), galleryToken]
					],
					"namespace": 1
				}
			).then((resp) => {
				const code = resp?.data ?? -1;
				if (code === -1) throw code;
				else if (code.error) throw code.error;
				else return code;
			});
					
			const data = response.gmetadata[0];		
			page = data.filecount;
			return page;
		} else if (url.match(/imgur/)) {
			let hashCode = /https:\/\/imgur.com\/a\/([A-z0-9]*)/.exec(url)[1];
			//extract identification part from the link
			return axios
				.get(`https://api.imgur.com/3/album/${hashCode}`, {
					headers: { Authorization: info.imgurClient },
				})
				.then((resp) => {
					//in this case resp.data is a json because we are interacting with an API
					code = resp.data?.data?.images_count ?? -1;
					//fetch the info right away
					if (code == -1) throw code;
					else return code;
				})
				.catch((e) => {
					console.log(e);
				});
		} else if (url.match(/fakku\.net/)) {
			let resp = (await axios.get(url).catch((e) => {
				console.log("Uh oh stinky");
			}))?.data;
			if(!resp) {
				reject(-1);
				return;
			}
			let pageNums = resp.match(/(?<num>\d+) pages/);
			let page = +(pageNums?.groups?.num ?? -1);
			return page;
		} else {
			//ensure good url
			if (!url.match(/^https:\/\/nhentai.net\/g\/\d+/)) reject(-1);
			if (!url.match(/https:\/\/nhentai.net\/g\/\d+\//g)) url += '/';


			let response = axios.get(url).then((resp) => {
				return resp?.data ?? -1;
			}); //if i truly was a good coder id put exp fallback here
			response = await response;
			if(response==-1) {reject(-1); return;}
			let soup = new JSSoup(response);

			let page = soup
					.findAll('a', 'tag')
					.filter((s) => {
						return s?.attrs?.href?.match(/\/search\/(.*)/)
					
					})[0]
					.find('span', 'name').text
					
			return page;		
		}
	});
}
module.exports = fetch;

