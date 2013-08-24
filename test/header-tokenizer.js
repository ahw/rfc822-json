var Request = require('request');
var Sinon = require('sinon');
var FileSystem = require('fs');
var HeaderTokenizer = require(__dirname + '/../lib/header-tokenizer');
var util = require('util');

module.exports = {
    setUp: function(callback) {
        this.tokenizer = new HeaderTokenizer();
        callback();
    },

    'Emits field name and body tokens': function(test) {
        var fieldName = 'Content-Type';
        var fieldBody = 'text/plain';

        var wrapper = {tokenHandler: function() {} };
        var spy = Sinon.spy(wrapper, 'tokenHandler');

        this.tokenizer.on('token', spy);
        this.tokenizer.on('done', function() {
            test.ok(spy.firstCall.calledWith({type: 'field_name', value: fieldName}));
            test.ok(spy.secondCall.calledWith({type: 'field_body', value: fieldBody}));
            test.done();
        });

        this.tokenizer.write(fieldName + ':' + fieldBody);
        this.tokenizer.end('\r\n\r\n');
    },

    'Emits multiple tokens': function(test) {
        var fieldName = 'Content-Type';
        var fieldBody = 'text/plain';

        var wrapper = {tokenHandler: function() {} };
        var spy = Sinon.spy(wrapper, 'tokenHandler');

        this.tokenizer.on('token', spy);
        this.tokenizer.on('done', function() {
            test.equal(spy.callCount, 10);
            test.done();
        });

        this.tokenizer.write(fieldName + ':' + fieldBody + '\r\n');
        this.tokenizer.write(fieldName + ':' + fieldBody + '\r\n');
        this.tokenizer.write(fieldName + ':' + fieldBody + '\r\n');
        this.tokenizer.write(fieldName + ':' + fieldBody + '\r\n');
        this.tokenizer.write(fieldName + ':' + fieldBody + '\r\n');
        this.tokenizer.end('\r\n\r\n');
    }

};

// -- var tokenizer = new HeaderTokenizer();
// -- var testEmail = FileSystem.createReadStream(__dirname + '/email1.txt');
// -- testEmail.pipe(tokenizer);
// -- 
// -- tokenizer.on('done', function() {
// --     console.log('Tokenizer sent "done" event');
// -- });
// -- 
// -- tokenizer.on('token', function(token) {
// --     console.log(util.inspect(token, {colors: true}));
// -- });
