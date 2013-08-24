// -- var Request = require('request');
// -- var FileSystem = require('fs');
// -- var HeaderParser = require(__dirname + '/../lib/header-parser');
// -- var util = require('util');
// -- 
// -- var testEmail = FileSystem.createReadStream(__dirname + '/email1.txt');
// -- var parser = new HeaderParser();
// -- testEmail.pipe(parser);
// -- 
// -- parser.on('headers', function(headers) {
// --     console.log(util.inspect(headers, {colors: true}));
// -- });
