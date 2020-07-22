const info = require('../../config/globalinfo.json');
const getCreds = require('../auth/acquire');

/**
 *
 * @param {String} sheetName Name of the sheet the row is in.
 * @param {Number} rowNumber Number of the row.
 */
async function removeRow(sheetName, rowNumber) {
    let {auth, sheets} = getCreds();
	let requests = [
		{
			deleteRange: {
				range: {
                    sheetId: info.sheetIds[info.sheetNames.indexOf(sheetName)], 
                    // uses the individual GID as opposed to using the sheetName like they do EVERY FUCKING WHERE ELSE
					startRowIndex: rowNumber,
					endRowIndex: rowNumber + 1,
				},
				shiftDimension: 'ROWS',
			},
		},
    ];
    let batchRequest = {requests}
    let response = await sheets.spreadsheets.batchUpdate({
        spreadsheetId: info.spreadsheet,
        resource:batchRequest
    });

    if(response?.status != 200){
        throw new Error('Bad status code of '+response.status);
    } else {
        return;
        
    }
    
}
module.exports = removeRow
//removeRow('New Finds', 484);
