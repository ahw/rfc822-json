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
    this.buffer = "";
    this.headerBodyDelimiter = '\r\n\r\n';
    this.hasFinishedHeaders = false;
    this.hasEmittedMessage = false;
    this.headerParser = new HeaderParser();
    this.bodyParser = new BodyParser();

    this.headerParser.on('headers', this.receiveHeaders.bind(this));
    this.bodyParser.on('body', this.receiveBody.bind(this));

    this.on('newListener', function(name, listener) {
        if (name === 'message' && this.hasEmittedMessage) {
            listener(this.message);
        }
    });
}

// Set up the inheritance
util.inherits(MessageParser, Stream.Transform);

// Implements the Stream.Transform._transform method.
MessageParser.prototype._transform = function(chunk, encoding, callback) {
    var str = chunk.toString('binary');
    this.buffer += str;

    // Check for the double CRLF which delimits headers and body
    var split = this.buffer.indexOf(this.headerBodyDelimiter);
    if (split >= 0 && !this.hasFinishedHeaders) {
        // Write all of the current buffer up to the delimiter point and
        // close the header parser
        this.headerParser.end(this.buffer.slice(0, split));
        this.hasFinishedHeaders = true;

        // Second half is the body
        this.bodyParser.write(this.buffer.slice(split + this.headerBodyDelimiter.length));
    } else if (this.hasFinishedHeaders) {
        // If we've finished the headers, then the whole thing is part of
        // the body.
        this.bodyParser.write(str);
    }
    callback();
};

MessageParser.prototype._flush = function(callback) {
    var _this = this;
    this.bodyParser.end(function() {
        _this.push(JSON.stringify(_this.message));
        callback();
    });
};

MessageParser.prototype.receiveHeaders = function(headers) {
    this.message.headers = headers;
    // Emit the headers
    this.emit('headers', headers);
};

MessageParser.prototype.receiveBody = function(body) {
    this.message.body = body;
    // Emit the body
    this.emit('body', body);
    // Emit entire the parsed message (headers + body)
    this.emit('message', this.message);
    this.hasEmittedMessage = true;
};

module.exports = MessageParser;
