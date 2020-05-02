var Discord = require('discord.js');
var chai = require('chai');
var expect = chai.expect;
var assert = chai.assert;
var sinon = require('sinon');
var info = require('../config/globalinfo.json');
var module = require('../commands/add');

var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const { GoogleSpreadsheet } = require('google-spreadsheet');
const creds = require('../config/gclient_secret.json'); // the file saved above
const doc = new GoogleSpreadsheet(info.spreadsheet);

describe('add.js', function () {
	var channel = { send: function (s) {} };
	let stub = sinon.stub(channel, 'send');
	let message = { channel: channel };
	console.log('got here');
	it('should append a row to a sheet', function () {
       // let p = new Promise((resolve, reject)=>{
        return doc.useServiceAccountAuth(creds).then(()=>{
            return module(doc, message, 9, { l: 'https://wholesomelist.com'});
        }).then((val)=>{
            assert(val);
        })
        
        
	});
	stub.reset();

	it('should append a row to the sheet given extra options', function () {
        return doc.useServiceAccountAuth(creds).then(()=>{
            return module(doc, message, 9, { l: 'https://wholesomelist.com', t:"yeee"});
        }).then((val)=>{
            assert(val);
        })
    });
});
