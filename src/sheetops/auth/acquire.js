const { google } = require('googleapis');
let cachedAuth, sheetsAPI;
const client = require('../../../config/gclient_secret.json');
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
/**
 * Uses JSON Web Tokens to authenticate a Google Sheets communicator
 */
function getMailman() {
	const auth = new google.auth.JWT(client.client_email, null, client.private_key, SCOPES);
	const sheets = google.sheets({ version: 'v4', auth: auth });
	return { auth: auth, sheets: sheets };
}
module.exports = getMailman;
