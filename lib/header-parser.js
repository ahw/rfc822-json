var Stream = require('stream');
var util = require('util');
var HeaderTokenizer = require(__dirname + '/header-tokenizer');

function HeaderParser() {
    // Call the Stream.Transform constructor
    Stream.Transform.call(this);

    // Initialize stream state
    // this._readableState.objectMode = true; // Means we'll push objects not chunks

    // Initialize state
    this.tokenizer = new HeaderTokenizer();
    this.state = this.states.FIELD_NAME;
    this.currentFieldName;
    this.headers = {};

    // The "this" value in event emitter listener functions is bound to the
    // emitter object. Need to bind the HeaderParser's receiveToken and
    // done functions to the right "this" context.
    var receiveToken = this.receiveToken.bind(this);
    var done = this.done.bind(this);
    this.tokenizer.on('token', receiveToken);
    this.tokenizer.on('done', done);
}

// Set up the inheritance
util.inherits(HeaderParser, Stream.Transform);

HeaderParser.prototype.states = {
    FIELD_NAME: 'FIELD_NAME',
    FIELD_BODY: 'FIELD_BODY'
};

HeaderParser.prototype._transform = function(chunk, encoding, callback) {
    // Just forward data to the tokenizer.
    this.tokenizer.write(chunk);
    callback();
};

HeaderParser.prototype.receiveToken = function(token) {
    var states = this.states;

    switch (this.state) {
        case states.FIELD_NAME:
            if (token.type === 'field_name') {
                this.currentFieldName = token.value;
                this.state = states.FIELD_BODY;
            } else {
                this.emit('error', new Error('Expected a field_name token but got ' + token.type));
            }
            break;

        case states.FIELD_BODY:
            if (token.type === 'field_body') {
                this.headers[this.currentFieldName] = token.value;
                this.currentFieldName = null;
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

HeaderParser.prototype._flush = function(callback) {
    // Close the tokenizer. The tokenizer may emit one final token event,
    // and will definitely emit a single "done" event, both of which should
    // already be handled by this parser.
    this.tokenizer.end();
};

// Bind this function to the tokenizer's "done" event. It assumes the
// tokenizer has already been closed with tokenizer.end().
HeaderParser.prototype.done = function() {
    // Emit the headers as an event
    this.emit('headers', this.headers);
};

module.exports = HeaderParser;
