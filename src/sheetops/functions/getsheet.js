const id = require('../../../config/globalinfo.json').spreadsheet;
const getCreds = require('../auth/acquire');

/**
 * Gets the entirety of the specified sheet, excluding the header row.
 * @param {String} sheetName name of the spreadsheet the row is in.
 * @returns {Promise<Array>} a 2D array representing the entire sheet.
 */
async function getSheet(sheetName) {
	let { auth, sheets } = getCreds();
	let response = await sheets.spreadsheets.values.get({
		spreadsheetId: id,
		range: sheetName,
	});

	if (response?.status != 200 || response?.data?.values === undefined) {
		throw new Error(response.statusText);
	} else {
		return response.data.values.slice(1);
		//ignores header rows.
	}
}
module.exports = getSheet;
//getSheet('Unsorted').then((data) => console.log(data));
