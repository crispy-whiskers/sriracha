const { google } = require('googleapis');
const id = require('../../config/globalinfo.json').spreadsheet
const getCreds = require('../auth/acquire')
const client = require('../../config/gclient_secret.json')

const SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
  ];
function appendRow(sheetName, array){
    //const auth = getCreds();
    const auth = new google.auth.JWT(client.client_email, null, client.private_key,SCOPES )
    const sheets = google.sheets({ version: 'v4', auth: auth });
    sheets.spreadsheets.values.append({
        spreadsheetId:id,
        range:sheetName,
        resource: {
            values: [array],
        },
         valueInputOption:'RAW'
    }).then(data=>{
        console.log(data)
    })
}
appendRow('New Finds', ['TEST', 'VALUE'])