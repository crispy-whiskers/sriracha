const id = require('../../config/globalinfo.json').spreadsheet
const getCreds = require('../auth/acquire')

/**
 * 
 * @param {String} sheetName name of the spreadsheet the row is in.
 * @param {*} rowNumber the row number, where the first row in the sheet is numbered 0 as the header.
 * @returns {Array} a 2D array representing the entire sheet.
 */
async function getSheet(sheetName){
    let {auth, sheets} = getCreds();
    let response = await sheets.spreadsheets.values.get({
        spreadsheetId: id,
        range: sheetName
    });

    if(response?.status != 200 || response?.data?.values === undefined){
        throw new Error('Bad response!');
    } else {
        return response.data.values;
    }

}
module.exports = getSheet
//getSheet('New Finds').then(data=>console.log(data))