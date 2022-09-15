const info = require('../../../config/globalinfo.json');
const getCreds = require('../auth/acquire');

/**
 * Deletes a row (or rows). If endRowNumber is supplied, it will delete the range inclusively.
 * @param {String} sheetName Name of the sheet the row is in.
 * @param {Number} rowNumber The number of the row from A1 notation.
 * @param {Number} endRowNumber Last row to be deleted in a range.
 */
async function removeRow(sheetName, rowNumber, endRowNumber = rowNumber + 1) {
	let { auth, sheets } = getCreds();
	let requests = [
		{
			deleteRange: {
				range: {
					sheetId: info.sheetIds[info.sheetNames.indexOf(sheetName)],
					// uses the individual GID as opposed to using the sheetName like they do EVERY FUCKING WHERE ELSE
					startRowIndex: rowNumber,
					endRowIndex: endRowNumber,
				},
				shiftDimension: 'ROWS',
			},
		},
	];
	let batchRequest = { requests };
	let response = await sheets.spreadsheets.batchUpdate({
		spreadsheetId: info.spreadsheet,
		resource: batchRequest,
	});
	if (response?.status != 200) {
		throw new Error('Bad status code of ' + response.status);
	} else {
		return;
	}
}
module.exports = removeRow;
//removeRow('New Finds', 481).then(resp=>console.log(resp)).catch(err=>console.log(err))
