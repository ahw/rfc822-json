var Sinon = require('sinon');
var FileSystem = require('fs');
var HeaderParser = require(__dirname + '/../lib/header-parser');
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

        this.parser.write(testEmail);
    }
};

