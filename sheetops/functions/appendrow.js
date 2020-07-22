const { google } = require('googleapis');
const id = require('../../config/globalinfo.json').spreadsheet
const getCreds = require('../auth/acquire')

function appendRow(sheetName, array){
    const auth = getCreds();
    const sheets = google.sheets({ version: 'v4', auth });
    sheets.spreadsheets.values.append({
        spreadsheetId:id,
        range:sheetName,
        resource: {
            values: [array],
        },
        auth: auth,   
    }).then(data=>{
        console.log(data)
    })
}
appendRow('New Finds', ['TEST', 'VALUE'])