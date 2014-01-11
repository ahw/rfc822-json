rfc822-json
===========
Parses an RFC-822 message stream (standard email) into JSON and returns a
readable stream.

Most of this code example is borrowed from the
[inbox](https://github.com/andris9/inbox) documentation. That last line at
the bottom where the message stream is piped to an instance of the Rfc822
parser is where `rfc822-json` comes in to play. It is Readable/Writable
stream which accepts a stream of RFC-822-compliant text and writes a stream
of JSON-formatted text.

    var inbox = require('inbox');
    var Rfc822Parser = require('rfc822-json');
    var parser = new Rfc822Parser();

    var client = inbox.createConnection(false, "imap.gmail.com", {
        secureConnection: true,
        auth:{
            user: "test.nodemailer@gmail.com",
            pass: "Nodemailer123"
        }
    });

    client.on('connect', function() {
        client.openMailbox('INBOX', function(error, info) {
            // Pipe stream to parser, which returns readable stream. If this
            // was a server response you might turn this into
            // (...blah...).pipe(parser).pipe(response);
            client.createMessageStream('123').pipe(parser);

            parser.on('message', function(message) {
                // Message has two properties: "headers" and "body".

                console.log(message.headers);
                // => {
                //      "Delivered-To": "someone@example.com",
                //      "Subject": "hey there",
                //      "From": "\"John Smith\" <johnsmith@example.com>",
                //      "Content-Type": "multipart/alternative; boundary=\"----=_NextPart_000_1CE1_01CF04FE.9EA32510\""
                //    }

                console.log(message.body);
                // => "This is the message body\r\n. It is just a giant string with no additional parsing/decoding applied."
            });
        });
    });
