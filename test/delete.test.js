var Discord = require('discord.js');
var chai = require('chai');
var expect = chai.expect;
var assert = chai.assert;
var sinon = require('sinon');
var info = require('../config/globalinfo.json');

var add = require('../commands/add');

var module = require('../commands/delete');

const { GoogleSpreadsheet } = require('google-spreadsheet');
const creds = require('../config/gclient_secret.json'); // the file saved above
const doc = new GoogleSpreadsheet(info.spreadsheet);

describe('delete.js', function () {
	var channel = { send: function (s) {} };
	let message = { channel: channel };

	it('should delete a row', function () {
		return doc
			.useServiceAccountAuth(creds)
			.then(() => {
				return module(doc, message, 9, 2);
			})
			.then((status) => {
				assert(status);
			});
	});
	it('should reject deleting invalid rows', function () {});
});
