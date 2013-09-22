var Stream = require('stream');
var Splitter = require('stream-splitter');
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
    this.hasFinishedHeaders = false;
    this.headerParser = new HeaderParser();
    this.bodyParser = new BodyParser();

    this.headerParser.on('headers', this.receiveHeaders.bind(this));
    this.bodyParser.on('body', this.receiveBody.bind(this));
}

// Set up the inheritance
util.inherits(MessageParser, Stream.Transform);

// Implements the Stream.Transform._transform method.
MessageParser.prototype._transform = function(chunk, encoding, callback) {
    str = chunk.toString('binary');
    var delimiter = '\r\n\r\n';

    // Check for the double CRLF which delimits headers and body
    var split = str.indexOf(delimiter);
    if (split >= 0 && !this.hasFinishedHeaders) {
        // Write all of the current buffer plus this stuff and close the header parser
        console.log('Writing to the header...');
        this.headerParser.end(this.buffer + str.slice(0, split));
        this.hasFinishedHeaders = true;
        // Second half is the body
        console.log('Writing to the body...');
        this.bodyParser.write(str.slice(split + delimiter.length));
    } else if (this.hasFinishedHeaders) {
        console.log('Writing to the body...');
        this.bodyParser.write(str);
    } else {
        // We we haven't gotten a double CRLF yet then we have to just
        // appending to our internal buffer and until we do. Some day our
        // prince will come.
        console.log('Still searching for the split...');
        this.buffer += str;
    }
    callback();
};

MessageParser.prototype._flush = function(callback) {
    var _this = this;
    this.bodyParser.end(function() {
        console.log('Pushing the entire message');
        _this.push(JSON.stringify(_this.message));
        callback();
    });
};

MessageParser.prototype.receiveHeaders = function(headers) {
    console.log('Receiving headers', headers);
    this.message.headers = headers;
    // Emit the headers
    this.emit('headers', headers);
};

MessageParser.prototype.receiveBody = function(body) {
    console.log('Receiving the body', body);
    this.message.body = body;
    // Emit the body
    this.emit('body', body);
    // Emit the parsed message
    this.emit('message', this.message);
};

module.exports = MessageParser;

// Testing
// -- var Request = require('request');
// -- var FileSystem = require('fs');
// -- var parser = new MessageParser();
// -- parser.on('message', console.log);
// -- var e = Request.get('http://email.andrewhallagan.com/emails/445?path=%5BGmail%5D%2FAll%20Mail');
// -- e.pipe(parser);
// parser.write('foo:bar\r\n\r\nhere is a message body');
// parser.end();
