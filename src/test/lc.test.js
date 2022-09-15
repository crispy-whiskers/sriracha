var Discord = require('discord.js');
var chai = require('chai');
var expect = chai.expect;
var assert = chai.assert;
var sinon = require('sinon');
var info = require('../config/globalinfo.json');
var module = require('../commands/lc');

describe('lc.js', function () {
	var channel = { send: function (s) {} };
	let message = { channel: channel };

	it('should reject invalid IDs', function () {
		return module(message, 4, 528093759).then((val) => {
			assert(!val);
		});
	});
});
