const id = require('../../config/globalinfo.json').spreadsheet
const getCreds = require('../auth/acquire')
/**
 * 
 * @param {String} sheetName the name of the sheet. 
 * @param {Array} array 
 */
async function appendRow(sheetName, array){
    let {auth, sheets} = getCreds();
    let response = await sheets.spreadsheets.values.append({
        spreadsheetId:id,
        range:sheetName,
        resource: {
            values: [array],
        },
         valueInputOption:'RAW'
    });
    
    if(response?.status != 200){
        throw new Error('Bad status code of '+response.status)
    } else {
        return +response?.data?.updates?.updatedRange.match(/\d\d\d/)[0]

    }
}
module.exports = appendRow;
//appendRow('New Finds', ['TEST', 'VALUE']).then(row=>console.log(row))