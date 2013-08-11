var Stream = require('stream');
var util = require('util');
var HeaderTokenizer = require(__dirname + '/header-tokenizer');

function HeaderParser() {
    // Call the Stream.Writable constructor
    Stream.Writable.call(this);

    // Initialize state
    this.tokenizer = new HeaderTokenizer();
    this.state = this.states.FIELD_NAME;
    this.currentFieldName;
    this.currentHeader;
    this.headers = [];

    // The "this" value in event emitter listener functions is bound to the
    // emitter object. Need to bind the HeaderParser's receiveToken and
    // finishParsing functions to the right "this" context.
    var receiveToken = this.receiveToken.bind(this);
    var finishParsing = this.finishParsing.bind(this);
    this.tokenizer.on('token', receiveToken);
    this.tokenizer.on('done', finishParsing);
}

// Set up the inheritance
util.inherits(HeaderParser, Stream.Writable);

HeaderParser.prototype.states = {
    FIELD_NAME: 'FIELD_NAME',
    FIELD_BODY: 'FIELD_BODY'
};

HeaderParser.prototype._write = function(chunk) {
    // Just forward data to the tokenizer.
    this.tokenizer.write(chunk);
};

HeaderParser.prototype.receiveToken = function(token) {
    var states = this.states;

    switch (this.state) {
        case states.FIELD_NAME:
            if (token.type === 'field_name') {
                this.currentFieldName = token.value;
                this.currentHeader = {};
                this.currentHeader[this.currentFieldName] = "";
                this.state = states.FIELD_BODY;
            } else {
                this.emit('error', new Error('Expected a field_name token but got ' + token.type));
            }
            break;

        case states.FIELD_BODY:
            if (token.type === 'field_body') {
                this.currentHeader[this.currentFieldName] = token.value;
                this.headers.push(this.currentHeader);
                this.currentFieldName = null;
                this.currentHeader = null;
                this.state = states.FIELD_NAME;
            } else {
                this.emit('error', new Error('Expected a field_body token but got ' + token.type));
            }
            break;

        default:
            // Should never get here, but just in case...
            this.emit('error', new Error('Unknown state "' + this.state + '" in HeaderParser'));
    }
};

HeaderParser.prototype.finishParsing = function() {
    this.emit('headers', this.headers);
    // Close the tokenizer
    this.tokenizer.end();
};

module.exports = HeaderParser;
