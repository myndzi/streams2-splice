# Streams2-splice

A streams2 package for splicing streams into other streams. It's a stream-stream stack?!

# Usage

    var SpliceStream = require('streams2-splice');
    var outStream = new SpliceStream('foo', 'bar');
    outStream.pipe(process.stdout);
    outStream.end('a man walked into a foo...\n');

Outputs: `a man walked into a bar...`

More interestingly, though...

    var SpliceStream = require('streams2-splice'),
        PassThrough = require('stream').PassThrough;

    var replacements = {
        man: 'woman',
        foo: 'bar'
    };
    var outStream = new SpliceStream('[', ']', function (stream) {
        var pt = new PassThrough();
        stream.on('data', function (chunk) {
            var str = chunk.toString();
            if (str in replacements) { pt.write(replacements[str]); }
        });
        stream.on('end', pt.end.bind(pt));
        return pt;
    });
    outStream.pipe(process.stdout);
    outStream.end('a [man] walked into a [foo]...\n');

Outputs: `a woman walked into a bar...`

# Constructor

`new SpliceStream(startDelim[, endDelim][, replacer])`

If no `replacer` is specified, matches are excluded from the output stream. If a string or buffer is given, that value is used as a replacement. If a function is given, the return value of the function is used as a replacement (more below).

If `startDelim` is specified, but no `endDelim` is specified, matches are made against the `startDelim` string. If both `startDelim` and `endDelim` are specified, matches are made against any data between the two delimiters. The delimiters themselves are excluded from the output.

# Replacer function

If you supply a function as a replacer, it is passed in a stream which will produce the matched contents and then end. If using a single-delimiter replacement, no data is emitted, just an end event. If using start and end delimiters, the data between them will be emitted from the passed stream.

If you return a string or buffer from the replacer function, that value is substituted into the original stream. If you return a stream, its contents are replaced into the original stream and processing will be paused until your returned stream ends. 

# Implementation notes

This package uses the Boyer-Moore-Horspool algorithm for string searching, with the exception of determining whether a chunk might contain a partial match; in the latter case, it uses a naive iteration method. It is assumed that the delimiters provided are not likely to be extremely large.
