import { spreadsheet as id } from '../../../config/globalinfo.json';
import getCreds from '../auth/acquire';

/**
 * Gets the entirety of the specified sheet, excluding the header row.
 */
export default async function getSheet(sheetName: string): Promise<string[][]> {
	const sheets = getCreds().sheets;
	const response = await sheets.spreadsheets.values.get({
		spreadsheetId: id,
		range: sheetName,
	});		

	if (response?.status != 200 || response?.data?.values === undefined) {
		throw new Error(response.statusText);
	} else {
		return response.data.values!.slice(1);
		//ignores header rows.
	}
}

//getSheet('Unsorted').then((data) => console.log(data));
