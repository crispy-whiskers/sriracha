var Discord = require('discord.js');
var chai = require('chai');
var expect = chai.expect;
var assert = chai.assert;
var sinon = require('sinon');
var info = require('../config/globalinfo.json');

var module = require('../commands/edit');
var add = require('../commands/add');

describe('edit.js', function () {
	var channel = { send: function (s) {} };
	let message = { channel: channel };
	it('should edit a row of a sheet', function () {
		return module(message, 9, 2, { t: 'fucc u', p:'penis' }).then((val) => {
			assert(val);
		});
	});
	it('should append tags correctly', function(){
		return module(message, 9, 2, { atag:'help' }).then((val) => {
			assert(val);
		});
	})
});
