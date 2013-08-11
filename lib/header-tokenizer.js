var Stream = require('stream');
var util = require('util');
var Characters = require(__dirname + '/characters');
var HeaderToken = require(__dirname + '/header-token');
var sprintf = require('sprintf').sprintf;

// Creates a reusable tokenizer which inherits from
// the Stream module.
function HeaderTokenizer() {
    // Call the Stream.Writable constructor
    Stream.Writable.call(this);

    // Initialize state
    this.state = this.states.FIELD_NAME;
    this.currentToken = {type: 'field_name', value: ""};
}

// Set up the inheritance
util.inherits(HeaderTokenizer, Stream.Writable);

HeaderTokenizer.prototype.states = {
    FIELD_NAME: 'FIELD_NAME',
    FIELD_BODY: 'FIELD_BODY',
    WHITESPACE: 'WHITESPACE',
    COLON: 'COLON',
    CARRAIGE_RETURN: 'CARRAIGE_RETURN',
    ERROR: 'ERROR',
    CRLF: 'CRLF',
    CRLF_CR: 'CRLF_CR',
    DONE: 'DONE'
};

// Implements the Stream.Writable._write method.
HeaderTokenizer.prototype._write = function(chunk) {
    var str = chunk.toString('binary');
    this.tokenize(str);
}

// The tokenize function simply takes in a string and feeds each character
// to the HeaderTokenizer.receiveChar function.
HeaderTokenizer.prototype.tokenize = function(str) {
    for (var i = 0; i < str.length; i++) {
        this.receiveChar(str[i]);
    }
}

HeaderTokenizer.prototype.printState = function() {
    var s = sprintf("%-10s token_type = %-10s, token_value = %s", this.state, this.currentToken.type, this.currentToken.value);
    console.log(s);
}

// The HeaderTokenizer.receiveChar function is the heart of the
// HeaderTokenizer class. It takes in a string and analyzes each character
// sequentially, emitting various MessageTokens when appropriate. This
// function is intended to be called internally only, which is why the name
// is prefixed with an underscore.
HeaderTokenizer.prototype.receiveChar = function(ch) {
    var states = this.states; // Cache the states
    switch(this.state) {
        case this.states.FIELD_NAME:
            if (Characters.colon.test(ch)) {
                // Colon delimits fieldName:fieldBody. Emit the current
                // field name token and the colon token we just encountered.
                this.emit('token', this.currentToken);
                this.emit('token', new HeaderToken({type: 'colon', value: ':'}));
                this.currentToken = new HeaderToken({type: 'field_body', value: ""});
                this.state = states.COLON;
            } else if (Characters.printableAscii.test(ch)) {
                // Printable ascii value
                this.currentToken.value += ch;
                this.state = states.FIELD_NAME;
            } else {
                // Note that newlines, carraige-returns, whitespace, or
                // non-printable ascii characters are not allowed in the
                // field names
                this.emit('error', new Error('Unexpected character "' + ch + '" while tokenizing field name.', ch));
            }
            break;

        case this.states.COLON:
            if (Characters.colon.test(ch)) {
                this.emit('error', new Error('Illegal character. Only one colon allowed per field.'));
            } else if (Characters.printableAscii.test(ch)) {
                // Create the new token for the field body
                this.currentToken.value += ch;
                this.state = states.FIELD_BODY;
            } else if (Characters.carraigeReturn.test(ch)) {
                this.state = states.CARRAIGE_RETURN;
            } else if (Characters.newline.test(ch)) {
                this.state = states.WHITESPACE;
            } else if (Characters.whitespace.test(ch)) {
                this.state = states.WHITESPACE;
            } else {
                this.emit('error', new Error('Unexpected character "' + ch + '" after reading colon.'));
            }
            break;

        case this.states.WHITESPACE:
            if (Characters.printableAscii.test(ch)) {
                this.currentToken.value += ch;
                this.state = states.FIELD_BODY;
            } else if (Characters.carraigeReturn.test(ch)) {
                this.state = states.CARRAIGE_RETURN;
            } else if (Characters.newline.test(ch)) {
                this.state = states.WHITESPACE;
            } else if (Characters.whitespace.test(ch)) {
                this.state = states.WHITESPACE;
            } else {
                this.emit('error', new Error('Unexpected character "' + ch + '" found while parsing field body.'));
            }
            break;

        case this.states.FIELD_BODY:
            if (Characters.carraigeReturn.test(ch)) {
                this.state = states.CARRAIGE_RETURN;
            } else if (Characters.newline.test(ch)) {
                this.currentToken.value += " ";
                this.state = states.WHITESPACE;
            } else if (Characters.whitespace.test(ch)) {
                this.currentToken.value += " ";
                this.state = states.WHITESPACE;
            } else {
                this.currentToken.value += ch;
                this.state = states.FIELD_BODY;
            }
            break;

        case this.states.CARRAIGE_RETURN:
            if (Characters.newline.test(ch)) {
                this.state = states.CRLF;
            } else if (Characters.whitespace.test(ch)) {
                this.currentToken.value += " ";
                this.state = states.WHITESPACE;
            } else if (Characters.printableAscii.test(ch)) {
                this.currentToken.value += " ";
                this.currentToken.value += ch;
                this.state = states.FIELD_BODY;
            } else {
                this.emit('error', new Error('Unexpected character "' + ch + '" found while parsing field body.'));
            }
            break;

        case this.states.CRLF:
            if (Characters.printableAscii.test(ch)) {
                this.emit('token', this.currentToken);
                this.state = states.FIELD_NAME;
                this.currentToken = new HeaderToken({type: 'field_name', value: ch});
            } else if (Characters.carraigeReturn.test(ch)) {
                this.state = states.CRLF_CR;
            } else if (Characters.whitespace.test(ch)) {
                this.currentToken.value += " ";
                this.state = states.WHITESPACE;
            } else {
                this.emit('error', new Error('Unexpected character "' + ch + '" found while parsing field body.'));
            }
            break;

        case this.states.CRLF_CR:
            if (Characters.newline.test(ch)) {
                this.emit('token', this.currentToken);
                this.emit('done');
                this.state = states.DONE;
            } else if (Characters.whitespace.test(ch)) {
                this.currentToken.value += " ";
                this.state = states.WHITESPACE;
            } else if (Characters.printableAscii.test(ch)) {
                this.currentToken.value += " ";
                this.currentToken.value += ch;
                this.state = states.FIELD_BODY;
            } else {
                this.emit('error', new Error('Unexpected character "' + ch + '" found while parsing field body.'));
            }
            break;

        case this.states.DONE:
            console.log('Received more data but no longer parsing header fields');
            break;

        default:
            // Should never get here, but in case we do...
            this.emit('error', new Error('Unknown state', this.state));
    }
}

// Testing
var Request = require('request');
var FileSystem = require('fs');
var tokenizer = new HeaderTokenizer();
var h = FileSystem.createReadStream(__dirname + '/../test/header-1.txt');
h.pipe(tokenizer);

var headers = [];
var currentName;
var currentValue;
var state = 'START';
tokenizer.on('done', function() {
    console.log('>> Finished tokenizing headers');
});

tokenizer.on('token', function(token) {

    switch (state) {
        case 'START':
            if (token.type === 'field_name') {
                currentName = token.value;
                state = 'FIELD_NAME';
            } else {
                state = 'ERROR';
            }
            break;
        case 'FIELD_NAME':
            if (token.type === 'colon') {
                state = 'COLON';
            } else {
                state = 'ERROR';
            }
            break;
        case 'COLON':
            if (token.type === 'field_body') {
                state = 'START';
                var header = {};
                header[currentName] = token.value;
                headers.push(header);
                console.log(util.inspect(header, {colors: true}));
            } else {
                state = 'ERROR';
            }
            break;
        case 'ERROR':
            console.log('ERROR state');
            break;
    }
});
