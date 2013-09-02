var Stream = require('stream');
var util = require('util');

var HeaderParser = require(__dirname + '/header-parser');
var BodyParser = require(__dirname + '/body-parser');

// Creates a reusable parser which inherits from
// the Stream module.
function MessageParser() {
    // Call the Stream.Transform constructor
    Stream.Transform.call(this);

    // Initialize state
    this.message = {};
    this.state = this.states.HEADERS;
    this.headerParser = new HeaderParser();
    this.bodyParser = new BodyParser();

    var receiveHeaders = this.receiveHeaders.bind(this);
    var receiveBody = this.receiveBody.bind(this);
    this.headerParser.on('headers', receiveHeaders);
    this.bodyParser.on('body', receiveBody);
}

// Set up the inheritance
util.inherits(MessageParser, Stream.Transform);

MessageParser.prototype.states = {
    HEADERS: 'HEADERS',
    BODY: 'BODY',
    DONE: 'DONE'
};

// Implements the Stream.Transform._transform method.
MessageParser.prototype._transform = function(chunk, encoding, callback) {
    var str = chunk.toString('binary');
    // Check for the double CRLF which delimits headers and body
    var split = str.indexOf('\r\n\r\n');
    if (split >= 0) {
        // First half is the headers
        this.headerParser.write(str.slice(0, split));
        // Close the header parser.
        this.headerParser.end();
        // Second half is the body
        this.bodyParser.write(str.slice(split + 1));
    } else if (this.state = this.states.HEADERS) {
        // Assert: this is all just headers.
        this.headerParser.write(str);
    } else if (this.state = this.states.BODY) {
        // Assert: this is all just body.
        this.bodyParser.write(str);
    }
    callback();
};

MessageParser.prototype._flush = function(callback) {
    this.bodyParser.end();
    callback();
};

MessageParser.prototype.receiveHeaders = function(headers) {
    this.message.headers = headers;
    // Emit the headers
    this.emit('headers', headers);
};

MessageParser.prototype.receiveBody = function(body) {
    this.message.body = body;
    this.state = this.states.DONE;
    // Emit the body
    this.emit('body', body);

    // Emit the parsed message
    this.emit('message', this.message);
};

// Testing
var FileSystem = require('fs');
var parser = new MessageParser();
parser.on('message', console.log);
var e = FileSystem.createReadStream(__dirname + '/../test/email1.txt');
// e.pipe(parser);
parser.write('foo:bar\r\n\r\nhere is a message body');
parser.end();
