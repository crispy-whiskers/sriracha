const { google } = require('googleapis');
let cachedAuth;
/**
 * @returns {google.auth.OAuth2}
 */
async function getMailman() {
	if (cachedAuth === undefined) {
		let credentials = require('./credentials.json');
		let token = require('./token.json');
		//theoretically, token *shouldn't* expire, as the old sriracha's token still hasnt (???), at least for read operations
		let { client_secret, client_id, redirect_uris } = credentials.installed;
		const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
		oAuth2Client.setCredentials(token);
		cachedAuth = oAuth2Client;
		return oAuth2Client;
	} else return cachedAuth;
}
module.exports = getMailman;