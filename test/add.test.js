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

describe('add.js', function () {
	var channel = { send: function (s) {} };
	let message = { channel: channel };

	it('should append a row to the sheet given the row', function () {
		return module
			.add(message, 9, new Row(['https://wholesomelist.com', 'yeeee']))

			.then((val) => {
				assert(val);
			});
	});

	it('should append a row to a sheet given options', function () {
		// let p = new Promise((resolve, reject)=>{

		return expect(module
			.fAdd(message, { l: 'https://wholesomelist.com', s: 9, t: 'yeeeeo' })).to.eventually.exist;
			
	});
});
