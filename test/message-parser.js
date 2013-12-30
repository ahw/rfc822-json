var Sinon = require('sinon');
var FileSystem = require('fs');
var MessageParser = require(__dirname + '/../lib/message-parser');
var util = require('util');

module.exports = {
    setUp: function(callback) {
        this.parser = new MessageParser();
        callback();
    },

    'Basic test': function(test) { test.done(); }
};
