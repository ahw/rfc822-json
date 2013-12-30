var Stream = require('stream');
var util = require('util');

function BodyParser() {
    // Call the Stream.Transform constructor
    Stream.Transform.call(this);

    this.body = "";
}

// Set up the inheritance
util.inherits(BodyParser, Stream.Transform);

BodyParser.prototype._transform = function(chunk, encoding, callback) {
    // Just append this chunk to the body
    this.body += chunk.toString('binary');
    callback();
};

BodyParser.prototype._flush = function(callback) {
    // Emit body event
    this.emit('body', this.body.trim());
};

module.exports = BodyParser;
