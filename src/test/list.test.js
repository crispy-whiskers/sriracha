var Discord = require('discord.js');
var chai = require('chai');
var expect = chai.expect;
var assert = chai.assert;
var sinon = require('sinon');

var module = require('../commands/list');
var info = require('../../config/globalinfo.json');

describe('list.ts', function () {
	var channel = { send: function (s) {} };
	let message = { channel: channel };

	it('should reject nonexistent sheets', function () {
		return module(message, 129380, 2).then((val) => {
			assert(!val);
		});
	});

	it('should reject bad calls', function () {
		return module(message, -1, 2).then((val) => {
			assert(!val);
		});
	});

	// describe('list fetch', function () {});
	// describe('general query', function () {
	// 	it('should fetch numerous results from a query', function () {});
	// 	it('should display specific information when there is only one result', function () {});
	// });
	// describe('wide query', function () {
	// 	it('should call numerous queries across all [work] sheets', function () {});
	// });
	// describe('specified ID fetch', function () {
	// 	it('should fetch a single row', function () {});
	// 	it('should be able to correctly detect badly formatted values', function () {});
	// });
});
