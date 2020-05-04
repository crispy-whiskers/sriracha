var Discord = require('discord.js');
var chai = require('chai');
var expect = chai.expect;
var assert = chai.assert;
var sinon = require('sinon');
var axios = require('axios').default;
var info = require('../config/globalinfo.json');

var module= require('../commands/feature')

const { GoogleSpreadsheet } = require('google-spreadsheet');
const creds = require('../config/gclient_secret.json'); // the file saved above
const doc = new GoogleSpreadsheet(info.spreadsheet);


describe('feature.js', function(){
    var channel = { send: function (s) {} };
    let message = { channel: channel };
    it('should reject non-list 4 doujins', function(){
        return doc
			.useServiceAccountAuth(creds)
			.then(() => {
				return module(doc, message, 9, 1, {l:'https://prajwaldesai.com/wp-content/uploads/2014/01/error-code.jpeg'});
			})
			.then((val) => {
				assert(!val);
			});
    });

    it('should reject if not given a link', function(){
        return doc
			.useServiceAccountAuth(creds)
			.then(() => {
				return module(doc, message, 9, 1, {});
			})
			.then((val) => {
				assert(!val);
			});

    });

    it('should reject on bad IDs', function(){
        return doc
        .useServiceAccountAuth(creds)
        .then(() => {
            return module(doc, message, 9, 0, {l:'https://prajwaldesai.com/wp-content/uploads/2014/01/error-code.jpeg'});
        })
        .then((val) => {
            assert(!val);
        });
    })
    
    
});