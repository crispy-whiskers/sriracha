var Discord = require('discord.js');
var chai = require('chai');
var expect = chai.expect;
var assert = chai.assert;
var sinon = require('sinon');
var info = require('../config/globalinfo.json');

var module = require('../commands/add');
var Row = require('../row');

var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const { GoogleSpreadsheet } = require('google-spreadsheet');
const creds = require('../config/gclient_secret.json'); // the file saved above
const doc = new GoogleSpreadsheet(info.spreadsheet);

describe('add.js', function () {
	var channel = { send: function (s) {} };
	let stub = sinon.stub(channel, 'send');
	let message = { channel: channel };

	it('should append a row to the sheet given the row', function () {
		return doc
			.useServiceAccountAuth(creds)
			.then(() => {
				return module.add(doc, message, 9, new Row(['https://wholesomelist.com', 'yeeee']));
			})
			.then((val) => {
				assert(val);
			});
	});

	it('should append a row to a sheet given options', function () {
		// let p = new Promise((resolve, reject)=>{
		return doc
			.useServiceAccountAuth(creds)
			.then(() => {
				return module.fAdd(doc, message, { l: 'https://wholesomelist.com', s: 9, t: 'yeeee' });
			})
			.then((val) => {
				assert(val);
			});
	});
	stub.reset();
});
