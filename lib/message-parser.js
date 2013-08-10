var Stream = require('stream').Stream;
var util = require('util');

// Creates a reusable parser which inherits from
// the Stream module.
function MessageParser() {
    Stream.call(this);
    this.writable = true;
}

// Set up the inheritance
util.inherits(MessageParser, Stream);

MessageParser.prototype.tokens = {
    SPECIAL: 1,
    QUOTED_STRING: 2,
    DOMAIN_LITERAL: 3,
    COMMENT: 4,
    ATOM: 5,
    WHITE_SPACE: 6
};
