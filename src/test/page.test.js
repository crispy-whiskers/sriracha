var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var expect = chai.expect;
var assert = chai.assert;
chai.use(chaiAsPromised).should();
var should = chai.should();


var module = require('../commands/page')

describe('page.js', function(){
    it(`It should take in an 'nhentai.net' gallery link and return the number of pages in that gallery`,
    function(){
        ///assert(true);
        return module('https://nhentai.net/g/258133').should.eventually.equal(22);
    });

    it(`It should take in an imgur gallery and return its length`, function(){
        return module(`https://imgur.com/a/zGqKKBR`).should.eventually.equal(24);
    });

    it(`It should reject invalid links`, function(){
        return module(`https://penis.yeet`).should.eventually.be.rejectedWith(-1);
    });

})
