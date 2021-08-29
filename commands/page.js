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
		if (url.indexOf('nhentai') == -1 && url.indexOf('imgur') == -1) reject(-1); //not mainstream site. cannot fetch.
		resolve(); //continue next link of promise chain immediately
	}).then(async () => {
		if (url.indexOf('nhentai') > -1) {

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
					
			return page
			
		} else {
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
		}
	});
}
module.exports = fetch;

fetch('https://nhentai.net/g/272353/').then(v=>{
	console.log(v)
})
fetch('https://nhentai.net/g/222222/').then(v=>{
	console.log(v)
})