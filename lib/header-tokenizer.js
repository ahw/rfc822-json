var Stream = require('stream');
var util = require('util');
var sprintf = require('sprintf').sprintf;

// Creates a reusable tokenizer which inherits from
// the Stream module.
function HeaderTokenizer() {
    // Call the Stream.Transform constructor
    Stream.Transform.call(this);

    // Initialize state
    this.state = this.states.FIELD_NAME;
    this.currentToken = {type: 'field_name', value: ""};

    // If someone attaches a new event listener for the 'done' event after
    // we are already in the DONE state, then just re-fire the event.
    this.on('newListener', function(name, listener) {
        if (name === 'done' && this.state === this.states.DONE) {
            listener();
        }
    });
}

// Set up the inheritance
util.inherits(HeaderTokenizer, Stream.Transform);

// Helper object to hold the regular expressions for matching various
// character types.
HeaderTokenizer.prototype.charTypes = {
    colon: /\:/,
    newline: /\n/,
    whitespace: /\s/,
    carraigeReturn: /\r/,
    printableAscii: /[\x21-\x7e]/
};

HeaderTokenizer.prototype.states = {
    // While processing a field name the tokenizer is in this state.
    FIELD_NAME: 'FIELD_NAME',

    // While processing printable characters in the field body the tokenizer
    // is in this state.
    FIELD_BODY: 'FIELD_BODY',

    // While processing whitespace characters in the field body the
    // tokenizer is in this state. All consecutive whitespace characters are
    // collapsed into a single space.
    WHITESPACE: 'WHITESPACE',

    // While processing a <CR> in the field body the tokenizer is in this
    // state.
    CARRAIGE_RETURN: 'CARRAIGE_RETURN',

    // While processing stuff after a <CR><LF> the tokenizer is in this
    // state. Note that header field bodies are allowed to "fold," meaning
    // that they can carry onto multiple lines as long as the "folded over"
    // portion is indented with at least one linear white space character.
    CRLF: 'CRLF',

    // While processing stuff after a <CR><LF><CR> the tokenizer is in this
    // state. Significant because the tokenizer expects a <LF> and will emit
    // an error if it receives anything else.
    CRLF_CR: 'CRLF_CR',

    // After consuming an empty line, the tokenizer emits a "done" event and
    // transitions to this trap state. TODO: deprecate the "done" event
    // since the message parser will probably never even send the header
    // tokenier the require CRLFCRLF characters required to get to this done
    // state.
    DONE: 'DONE'
};

// Implements the Stream.Transform._transform method.
HeaderTokenizer.prototype._transform = function(chunk, encoding, callback) {
    var str = chunk.toString('binary');
    this.tokenize(str);
    callback();
};

HeaderTokenizer.prototype._flush = function(callback) {
    // Assert: we are done consuming the readable stream. Emit the current
    // token. If we have already entered the DONE state then do not emit
    // anything. We do this check because there are two cases when we want
    // to emit the 'done' event:
    //  1. After encountering <CR><LF><CR><LF> sequence in an email message.
    //  When this happens, the HeaderTokenizer immediately enters the DONE
    //  state.
    //  2. After encountering the end of a stream in an email message which
    //  contained no message body (and thus potentially no <CR><LF><CR><LF>
    //  sequence).
    if (this.state !== this.states.DONE) {
        this.state = this.states.DONE;
        this.currentToken.value = this.currentToken.value.trim();
        this.emit('token', this.currentToken);
        this.emit('done');
        callback();
    }
};

// The tokenize function simply takes in a string and feeds each character
// to the HeaderTokenizer#receiveChar function.
HeaderTokenizer.prototype.tokenize = function(str) {
    for (var i = 0; i < str.length; i++) {
        this.receiveChar(str[i]);
    }
};

// Helper function for debugging. Just prints out some state info.
HeaderTokenizer.prototype.printState = function() {
    var s = sprintf("%-10s token_type = %-10s, token_value = %s", this.state, this.currentToken.type, this.currentToken.value);
    console.log(s);
};

// This function is the heart of the HeaderTokenizer class. It consumes
// the characters of an email message sequentially, emitting 
// "token" events when it has finished tokenizing header field names and
// header field bodies. The "token" events have a 
// header token object of the form `{type:'field_body', value:'blah'}` as
// the argument for their listener functions.
HeaderTokenizer.prototype.receiveChar = function(ch) {
    var states = this.states; // Cache the states
    switch(this.state) {
        case this.states.FIELD_NAME:
            if (this.charTypes.colon.test(ch)) {
                // Colon delimits fieldName:fieldBody. Emit the current
                // field name token and set up the new field body token
                this.emit('token', this.currentToken);
                this.currentToken = {type: 'field_body', value: ""};
                this.state = states.FIELD_BODY;
            } else if (this.charTypes.printableAscii.test(ch)) {
                // Append to the current field name
                this.currentToken.value += ch;
            } else {
                // Whitespace, or other non-printable ascii characters are
                // not allowed in the field names
                this.emit('error', new Error('Unexpected character "' + ch + '" while parsing field name.'));
            }
            break;

        case this.states.FIELD_BODY:
            if (this.charTypes.printableAscii.test(ch)) {
                this.currentToken.value += ch;
            } else if (this.charTypes.carraigeReturn.test(ch)) {
                this.state = states.CARRAIGE_RETURN;
            } else if (this.charTypes.whitespace.test(ch)) {
                this.currentToken.value += " ";
                this.state = states.WHITESPACE;
            } else {
                this.emit('error', new Error('Unexpected character "' + ch + '" while parsing field body.'));
            }
            break;

        case this.states.WHITESPACE:
            if (this.charTypes.printableAscii.test(ch)) {
                this.currentToken.value += ch;
                this.state = states.FIELD_BODY;
            } else if (this.charTypes.carraigeReturn.test(ch)) {
                this.state = states.CARRAIGE_RETURN;
            } else if (this.charTypes.whitespace.test(ch)) {
                // Do nothing; just eat more whitespace
            } else {
                this.emit('error', new Error('Unexpected character "' + ch + '" found while parsing field body.'));
            }
            break;

        case this.states.CARRAIGE_RETURN:
            if (this.charTypes.newline.test(ch)) {
                this.state = states.CRLF;
            } else if (this.charTypes.whitespace.test(ch)) {
                this.currentToken.value += " ";
                this.state = states.WHITESPACE;
            } else if (this.charTypes.printableAscii.test(ch)) {
                // Push a space to account for the CR we read previously
                this.currentToken.value += " ";
                this.currentToken.value += ch;
                this.state = states.FIELD_BODY;
            } else {
                this.emit('error', new Error('Unexpected character "' + ch + '" found while parsing field body.'));
            }
            break;

        case this.states.CRLF:
            if (this.charTypes.printableAscii.test(ch)) {
                // A printable character on the very next line means we just
                // finished the field body of one header and are now parsing
                // the field name of a new header. Trim any whitespace from
                // the beginning/end of the field body and emit.
                this.currentToken.value = this.currentToken.value.trim();
                this.emit('token', this.currentToken);
                this.state = states.FIELD_NAME;
                this.currentToken = {type: 'field_name', value: ch};
            } else if (this.charTypes.carraigeReturn.test(ch)) {
                this.state = states.CRLF_CR;
            } else if (this.charTypes.whitespace.test(ch)) {
                // This is just field body folding
                this.currentToken.value += " ";
                this.state = states.WHITESPACE;
            } else {
                this.emit('error', new Error('Unexpected character "' + ch + '" found while parsing field body.'));
            }
            break;

        case this.states.CRLF_CR:
            if (this.charTypes.newline.test(ch)) {
                // We have already seen <CR><LF><CR>. Another <LF> means
                // this is the empty line separating header fields from the
                // message body. Emit the final field body token and a done
                // event.
                this.currentToken.value = this.currentToken.value.trim();
                this.emit('token', this.currentToken);
                this.emit('done');
                this.state = states.DONE;
            } else if (this.charTypes.whitespace.test(ch)) {
                this.currentToken.value += " ";
                this.state = states.WHITESPACE;
            } else if (this.charTypes.printableAscii.test(ch)) {
                // This is just field body folding
                this.currentToken.value += " ";
                this.currentToken.value += ch;
                this.state = states.FIELD_BODY;
            } else {
                this.emit('error', new Error('Unexpected character "' + ch + '" found while parsing field body.'));
            }
            break;

        case this.states.DONE:
            // Trap state
            break;

        default:
            // Should never get here, but in case we do...
            this.emit('error', new Error('Unknown state "' + this.state + '"'));
    }
};

module.exports = HeaderTokenizer;
