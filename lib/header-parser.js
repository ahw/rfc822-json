var Stream = require('stream');
var util = require('util');
var HeaderTokenizer = require(__dirname + '/header-tokenizer');

function HeaderParser() {
    // Call the Stream.Transform constructor
    Stream.Transform.call(this);

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

    this.on('newListener', function(name, listener) {
        if (name === 'headers' && this.state === this.states.DONE) {
            // Re-fire the handler function.
            listener(this.headers);
        }
    });
}

// Set up the inheritance
util.inherits(HeaderParser, Stream.Transform);

HeaderParser.prototype.states = {
    FIELD_NAME: 'FIELD_NAME',
    FIELD_BODY: 'FIELD_BODY',
    DONE: 'DONE'
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
                var previousHeaderValue = this.headers[this.currentFieldName];
                // Note that some header fields are repeated multiple times
                // with different values within the same message (e.g., the
                // "Received" header). In that case, the value associated
                // with such a header field name will be an array of strings
                // instead of a simple string. For example:
                //
                //  {
                //      'Content-Type': 'text/plain',
                //      'Received': ['value-1', 'value-2']
                //  }
                if (previousHeaderValue && typeof previousHeaderValue === 'string') {
                    // Assert: this is the second header value for this
                    // particular field name. Create a list with the two
                    // entries we've encountered thus far.
                    this.headers[this.currentFieldName] = [previousHeaderValue, token.value];
                } else if (previousHeaderValue && typeof previousHeaderValue === 'object') {
                    // Assert: we already have a list of header field values
                    // associated with this header name. Append this one to
                    // that list.
                    this.headers[this.currentFieldName].push(token.value);
                } else {
                    // Assert: there is no entry for this header field name
                    // yet. Just create a simple string value.
                    this.headers[this.currentFieldName] = token.value;
                }

                // Clear out the field name and set the state.
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
    // Close the tokenizer. The tokenizer MAY emit one final token event,
    // but will definitely emit a single "done" event. In any case, both
    // these events will bubble up to the event handlers defined in the
    // HeaderParser's constructor and will be handled accordingly. To kick
    // these events off, we simply need to end the tokenizer's stream.
    this.tokenizer.end();
};

// This function is bound to the tokenizer's "done" event. It assumes the
// tokenizer has already been closed with tokenizer.end() and emits a
// "headers" event with the email headers.
HeaderParser.prototype.done = function() {
    // Emit the headers as an event
    this.emit('headers', this.headers);
    this.state = this.states.DONE;
};

module.exports = HeaderParser;
