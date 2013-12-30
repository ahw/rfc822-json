var Sinon = require('sinon');
var FileSystem = require('fs');
var BodyParser = require(__dirname + '/../lib/body-parser');
var util = require('util');

module.exports = {
    setUp: function(callback) {
        this.parser = new BodyParser();
        callback();
    },

    'Emits parsed body object': function(test) {
        this.parser.on('body', function(body) {
            test.ok(typeof body === 'string');
            test.done();
        });

        this.parser.write('here is a test body');
        this.parser.end('here is some more');
    }
};

