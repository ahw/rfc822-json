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
    },

    'Collapses simple internal whitespace': function(test) {
        var fieldName = 'Content-Type';
        var fieldBody = 'foo     bar';

        var wrapper = {tokenHandler: function() {} };
        var spy = Sinon.spy(wrapper, 'tokenHandler');

        this.tokenizer.on('token', spy);
        this.tokenizer.on('done', function() {
            test.ok(spy.secondCall.calledWith({type: 'field_body', value: 'foo bar'}));
            test.done();
        });

        this.tokenizer.write(fieldName + ':' + fieldBody);
        this.tokenizer.end('\r\n\r\n');
    },

    'Handles field body folding': function(test) {
        var fieldName = 'Content-Type';
        var fieldBody = 'foo\r\n\tbar\r\n    baz';

        var wrapper = {tokenHandler: function() {} };
        var spy = Sinon.spy(wrapper, 'tokenHandler');

        this.tokenizer.on('token', spy);
        this.tokenizer.on('done', function() {
            test.ok(spy.secondCall.calledWith({type: 'field_body', value: 'foo bar baz'}));
            test.equal(spy.callCount, 2);
            test.done();
        });

        this.tokenizer.write(fieldName + ':' + fieldBody);
        this.tokenizer.end('\r\n\r\n');
    },

    'Collapses complex internal whitespace (CR, LF chars)': function(test) {
        var fieldName = 'Content-Type';
        var fieldBody = 'one\rtwo\nthree\r four\n five\r\tsix\n\tseven\r\reight\n\nnine';

        var wrapper = {tokenHandler: function() {} };
        var spy = Sinon.spy(wrapper, 'tokenHandler');

        this.tokenizer.on('token', spy);
        this.tokenizer.on('done', function() {
            test.ok(spy.secondCall.calledWith({type: 'field_body', value: 'one two three four five six seven eight nine'}));
            test.equal(spy.callCount, 2);
            test.done();
        });

        this.tokenizer.write(fieldName + ':' + fieldBody);
        this.tokenizer.end('\r\n\r\n');
    },

    'Trims outside whitespace in field body': function(test) {
        var fieldName = 'Content-Type';
        var fieldBody = '    foo     ';

        var wrapper = {tokenHandler: console.log };
        var spy = Sinon.spy(wrapper, 'tokenHandler');

        this.tokenizer.on('token', spy);
        this.tokenizer.on('done', function() {
            test.ok(spy.secondCall.calledWith({type: 'field_body', value: 'foo'}));
            test.done();
        });

        this.tokenizer.write(fieldName + ':' + fieldBody);
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
