var Stream = require('stream');
var util = require('util');

// Creates a reusable parser which inherits from
// the Stream module.
function MessageParser() {
    // Call the Stream.Writable constructor
    Stream.Writable.call(this);

    // Initialize state
    this.state = this.states.HEADER;
}

// Set up the inheritance
util.inherits(MessageParser, Stream.Writable);

// The possible parsing states. We are either parsing the message header or
// the message body.
MessageParser.prototype.states = {
    HEADER: 1,
    BODY: 2,
};

// Implements the Stream.Writable._write method.
MessageParser.prototype._write = function(chunk) {
    var str = chunk.toString('binary');
    this.parse(str);
}

// The parse function simply takes in a string and adds it to the message
// header or the message body.
MessageParser.prototype.parse = function(str) {
    switch (this.state) {
        case this.states.HEADER:
            break;
        case this.states.BODY:
            break;
        default:
            // Error
    }
}

// Testing
var Request = require('request');
var FileSystem = require('fs');
var tokenizer = new MessageParser();
var e = FileSystem.createReadStream(__dirname + '/../test/email1.txt');
e.pipe(tokenizer);

tokenizer = new MessageParser();
Request.get('http://www.amazon.com').pipe(tokenizer);
