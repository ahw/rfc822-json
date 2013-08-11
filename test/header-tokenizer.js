var Request = require('request');
var FileSystem = require('fs');
var HeaderTokenizer = require(__dirname + '/../lib/header-tokenizer');
var util = require('util');

var tokenizer = new HeaderTokenizer();
var testEmail = FileSystem.createReadStream(__dirname + '/email1.txt');
testEmail.pipe(tokenizer);

tokenizer.on('done', function() {
    console.log('Tokenizer sent "done" event');
});

tokenizer.on('token', function(token) {
    console.log(util.inspect(token, {colors: true}));
});
