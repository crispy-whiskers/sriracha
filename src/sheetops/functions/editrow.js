const id = require('../../../config/globalinfo.json').spreadsheet;
const getCreds = require('../auth/acquire');

async function editRow(sheetName, rowNum, values) {
	let { auth, sheets } = getCreds();
	let response = await sheets.spreadsheets.values
		.update({
			spreadsheetId: id,
			range: `'${sheetName}'!A${rowNum}`,
			resource: {
				values: [values],
			},
			valueInputOption: 'RAW',
			auth: auth,
		})
		.catch((err) => console.log(err));
	if (response?.status != 200) {
		throw new Error(response.statusText);
	} else {
		return;
	}
}
module.exports = editRow;
//editRow('New Finds', 481, ['new', 'values']).then(data=>console.log(data))
