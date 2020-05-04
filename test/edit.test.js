var Discord = require('discord.js');
var chai = require('chai');
var expect = chai.expect;
var assert = chai.assert;
var sinon = require('sinon');
var info = require('../config/globalinfo.json');


var module= require('../commands/edit')
var add = require('../commands/add')
const { GoogleSpreadsheet } = require('google-spreadsheet');
const creds = require('../config/gclient_secret.json'); // the file saved above
const doc = new GoogleSpreadsheet(info.spreadsheet);

describe('edit.js', function(){
    var channel = { send: function (s) {} };
	let message = { channel: channel };
    it('should edit a row of a sheet', function(){
        return doc
			.useServiceAccountAuth(creds)
			.then(() => {
				return module(doc, message, 9, 2, {t:'fucc u'});
			}).then((val)=>{
                assert(val);
            })
    });

})
