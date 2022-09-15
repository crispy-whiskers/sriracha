var Discord = require('discord.js');
var chai = require('chai');
var expect = chai.expect;
var assert = chai.assert;
var sinon = require('sinon');
var info = require('../../config/globalinfo.json');

var add = require('../commands/add');

var module = require('../commands/delete');

describe('delete.ts', function () {
	var channel = { send: function (s) {} };
	let message = { channel: channel };

	it('should delete a row', function () {
		return module(message, 9, 2).then((status) => {
			assert(status);
		});
	});

});
