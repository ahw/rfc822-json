var Stream = require('stream');
var util = require('util');

// Creates a reusable tokenizer which inherits from
// the Stream module.
function MessageTokenizer() {
    // Call the Stream.Writable constructor
    Stream.Writable.call(this);

    // Initialize state
    this.state = this.states.ATOM;
}

// Set up the inheritance
util.inherits(MessageTokenizer, Stream.Writable);

MessageTokenizer.prototype.states = {
    SPECIAL: 1,
    QUOTED_STRING: 2,
    DOMAIN_LITERAL: 3,
    COMMENT: 4,
    ATOM: 5,
};

// Implements the Stream.Writable._write method.
MessageTokenizer.prototype._write = function(chunk) {
    var str = chunk.toString('binary');
    this.tokenize(str);
}

// The tokenize function simply takes in a string and feeds each character
// to the MessageTokenizer.receiveChar function.
MessageTokenizer.prototype.tokenize = function(str) {
    for (var i = 0; i < str.length; i++) {
        this.receiveChar(str[i]);
    }
}

// The MessageTokenizer.receiveChar function is the heart of the
// MessageTokenizer class. It takes in a string and analyzes each character
// sequentially, emitting various MessageTokens when appropriate. This
// function is intended to be called internally only, which is why the name
// is prefixed with an underscore.
MessageTokenizer.prototype.receiveChar = function(ch) {
    switch(this.state) {
        case this.states.SPECIAL:
            break;
        case this.states.QUOTED_STRING:
            break;
        case this.states.DOMAIN_LITERAL:
            break;
        case this.COMMENT:
            break;
        case this.ATOM:
            break;
        default:
            // Error
    }
}

// Testing
var Request = require('request');
var FileSystem = require('fs');
var tokenizer = new MessageTokenizer();
var e = FileSystem.createReadStream(__dirname + '/../test/email1.txt');
e.pipe(tokenizer);

tokenizer = new MessageTokenizer();
Request.get('http://www.amazon.com').pipe(tokenizer);
