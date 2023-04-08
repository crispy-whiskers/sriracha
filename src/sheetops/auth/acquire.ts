import { google } from 'googleapis';
import client from '../../../config/gclient_secret.json';
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

/**
 * Uses JSON Web Tokens to authenticate a Google Sheets communicator
 */
export default function getMailman() {
	const auth = new google.auth.JWT({
		email: client.client_email,
		key: client.private_key, 
		scopes: SCOPES
	});
	const sheets = google.sheets({ version: 'v4', auth: auth });

	return { auth: auth, sheets: sheets };
}
