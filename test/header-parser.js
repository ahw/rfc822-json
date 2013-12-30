var Sinon = require('sinon');
var FileSystem = require('fs');
var HeaderParser = require(__dirname + '/../lib/header-parser');
var Assert = require('assert');
var util = require('util');

module.exports = {
    setUp: function(callback) {
        this.parser = new HeaderParser();
        callback();
    },

    'Emits parsed headers object': function(test) {
        testEmail = '';
        testEmail += 'foo:foo\r\n';
        testEmail += 'bar:bar\r\n';
        testEmail += '\r\n';

        this.parser.on('headers', function(headers) {
            test.ok(headers instanceof Object);
            test.equal(headers.foo, 'foo');
            test.equal(headers.bar, 'bar');
            test.done();
        });

        this.parser.end(testEmail);
    },

    'Emits error for two field names in a row': function(test) {
        this.parser.on('error', function(error) {
            test.done();
        });
        this.parser.receiveToken({type:'field_name', value:'foo'});
        this.parser.receiveToken({type:'field_name', value:'foo'});
    },

    'Emits error for two field bodies in a row': function(test) {
        this.parser.on('error', function(error) {
            test.done();
        });
        this.parser.state = this.parser.states.FIELD_BODY;
        this.parser.receiveToken({type:'field_body', value:'foo'});
        this.parser.receiveToken({type:'field_body', value:'foo'});
    },

    'Creates an array of values for duplicate header field names': function(test) {
        this.parser.write('Received: by 1.2.3.4 Sun, 21 Nov 2010 13:23:13 -0800 (PST)\r\n');
        this.parser.write('Received: by 2.3.4.5 Sun, 21 Nov 2010 13:23:13 -0800 (PST)\r\n');
        this.parser.end('Received: by 3.4.5.6 Sun, 21 Nov 2010 13:23:13 -0800 (PST)\r\n');

        this.parser.on('headers', function(headers) {
            Assert.equal(headers['Received'].length, 3);
            Assert.equal(typeof headers['Received'], 'object');
            console.dir(headers);
            test.done();
        });
    }
};

