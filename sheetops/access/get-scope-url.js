const fs = require('fs');
const { google } = require('googleapis');

const credentials = JSON.parse(fs.readFileSync('./auth/credentials.json', 'utf-8'));

const {
  client_secret: clientSecret,
  client_id: clientId,
  redirect_uris: redirectUris,
} = credentials.installed;

const oAuth2Client = new google.auth.OAuth2(
    clientId, clientSecret, redirectUris[0],
);

// Generate a url that asks permissions for Gmail scopes
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
];

const url = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
});

console.info(`authUrl: ${url}`);