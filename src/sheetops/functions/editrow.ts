import { spreadsheet as id } from '../../../config/globalinfo.json';
import getCreds from '../auth/acquire';

export default async function editRow(sheetName: string, rowNum: number, values: (string|number)[]) {
	const { auth, sheets } = getCreds();
	const response = await sheets.spreadsheets.values
		.update({
			spreadsheetId: id,
			range: `'${sheetName}'!A${rowNum}`,
			requestBody: {
				values: [values],
			},
			valueInputOption: 'RAW',
			auth: auth,
		})
		.catch((err) => console.log(err));

	if (response?.status != 200) {
		throw new Error(response?.statusText);
	} else {
		return;
	}
}

//editRow('New Finds', 481, ['new', 'values']).then(data=>console.log(data))
