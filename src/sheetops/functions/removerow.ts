import * as info from '../../../config/globalinfo.json';
import getCreds from '../auth/acquire';

/**
 * Deletes a row (or rows). If endRowNumber is supplied, it will delete the range inclusively.
 */
export default async function removeRow(sheetName: string, rowNumber: number, endRowNumber = rowNumber + 1) {
	const sheets = getCreds().sheets;
	const requests = [
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
	const batchRequest = { requests };
	const response = await sheets.spreadsheets.batchUpdate({
		spreadsheetId: info.spreadsheet,
		requestBody: batchRequest,
	});

	if (response?.status != 200) {
		throw new Error('Bad status code of ' + response.status);
	} else {
		return;
	}
}

//removeRow('New Finds', 481).then(resp=>console.log(resp)).catch(err=>console.log(err))
