var Sinon = require('sinon');
var FileSystem = require('fs');
var MessageParser = require(__dirname + '/../lib/message-parser');
var util = require('util');
var Assert = require('assert');

module.exports = {
    setUp: function(callback) {
        this.parser = new MessageParser();
        this.messageStream = FileSystem.createReadStream(__dirname + '/email1.txt');
        callback();
    },

    'Fires a headers event': function(test) {
        this.parser.on('headers', function(headers) {
            Assert.ok(headers);
            Assert.equal(typeof headers, 'object');
            test.done();
        });
        this.messageStream.pipe(this.parser);
    },

    'Fires a body event': function(test) {
        this.parser.on('body', function(body) {
            Assert.ok(body);
            Assert.equal(typeof body, 'string');
            test.done();
        });
        this.messageStream.pipe(this.parser);
    },

    'Parses a whole email': function(test) {
        this.parser.on('message', function(message) {
            Assert.ok(message.headers);
            Assert.ok(message.body);
            test.done();
        });

        this.messageStream.pipe(this.parser);
    },

    'Re-fires message event if handler attached too late': function(test) {
        this.parser.write('Content-Type: text/plain\r\n');
        this.parser.write('Content-Length: 123\r\n');
        this.parser.write('\r\n');
        this.parser.write('\r\n');
        this.parser.end('This is the body');

        this.parser.on('message', function(message) {
            console.dir(message);
            Assert.ok(message.headers, 'Message has no parsed headers');
            Assert.ok(message.body, 'Message has no parsed body');
            test.done();
        });
    }
};
