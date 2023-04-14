import { spreadsheet as id } from '../../../config/globalinfo.json';
import getCreds from '../auth/acquire';

export default async function appendRow(sheetName: string, array: (string | number)[]): Promise<number> {
	const sheets = getCreds().sheets;
	const response = await sheets.spreadsheets.values.append({
		spreadsheetId: id,
		range: sheetName,
		requestBody: {
			values: [array],
		},
		valueInputOption: 'RAW',
	});

	if (response?.status != 200) {
		throw new Error('Bad status code of ' + response.status);
	} else {
		return +response?.data?.updates!.updatedRange!.match(/\d+/)![0];
	}
}

//appendRow('New Finds', ['TEST', 'VALUE']).then(row=>console.log(row))
