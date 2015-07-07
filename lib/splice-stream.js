'use strict';

var stream = require('stream'),
    Transform = stream.Transform,
    PassThrough = stream.PassThrough,
    Readable = stream.Readable,
    inherits = require('util').inherits;

var BMH = require('./bmh');

var noBuf = new Buffer(0),
    noStream = new PassThrough();

noStream.end();

function SpliceStream(start, end, fn) {
    if (!start || typeof start !== 'string') {
        throw new Error('new SpliceStream(): invalid start delimiter: "'+start+'"');
    }

    if (arguments.length === 2) {
        fn = end;
        end = null;
    }
    
    if (typeof fn === 'string') { fn = new Buffer(fn); }
    if (Buffer.isBuffer(fn)) {
        fn = (function (buf) {
            return function () { return buf; };
        })(fn);
    }
    if (typeof fn !== 'function') {
        fn = function () { };
    }
    
    Transform.call(this);
    
    this.seeking = true;
    
    this.startTable = new BMH(start);
    this.endTable = new BMH(end || '');
    
    this.partial = noBuf;
    
    this.fn = fn;
    this.outStream = noStream;
    this.inStream = noStream;
}
inherits(SpliceStream, Transform);

SpliceStream.prototype._transform = function (chunk, encoding, callback) {
    if (this.partial !== noBuf) {
        chunk = Buffer.concat([ this.partial, chunk ]);
        this.partial = noBuf;
    }
    
    if (this.seeking) {
        this._seekStart(chunk, callback);
    } else {
        this._seekEnd(chunk, callback);
    }
};
SpliceStream.prototype._flush = function (callback) {
    if (this.partial !== noBuf) {
        this.push(this.partial);
    }
    
    this.partial =
    this.inStream =
    this.outStream =
    this.startTable =
    this.endTable =
    this.seeking =
    this.fn = null;
    
    callback();
};
SpliceStream.prototype._seekStart = function (chunk, callback) {
    if (chunk.length < this.startTable.length) {
        // don't have enough data for a comparison, abort early
        this.partial = chunk;
        callback();
        return;
    }
    
    // searching for start of data
    var startPos = this.startTable.search(chunk, 0);
        
    if (startPos === -1) {
        // no match; is there maybe a partial match?
        if (this.startTable.maybePartial(chunk)) {
            // could be, write most of the data and store enough of the rest to handle a "seam"
            var chop = -this.startTable.length + 1;
            this.push(chunk.slice(0, chop));
            this.partial = chunk.slice(chop);
        } else {
            this.push(chunk);
        }
        callback();
        return;
    }
    
    // there was a match
    if (startPos > 0) {
        this.push(chunk.slice(0, startPos));
    }
    chunk = chunk.slice(startPos + this.startTable.length);
    
    // state = splicing
    this.seeking = false;
    
    this.outStream = new PassThrough();
    
    var res = this.fn(this.outStream);
    
    if (res instanceof Readable) {
        this.inStream = res;
        // callback gave us a stream, interpolate that stream here
        res.on('data', this.push.bind(this));
        res.on('end', function () {
            this.inStream = noStream;
        }.bind(this));
    } else if (Buffer.isBuffer(res) || typeof res === 'string') {
        // callback gave us plain data
        this.push(res);
    }
    
    if (chunk.length) {
        this._seekEnd(chunk, callback);
    } else {
        callback();
    }
};
SpliceStream.prototype._seekEnd = function (chunk, callback) {
    if (chunk.length < this.endTable.length) {
        // don't have enough data for a comparison, abort early
        this.partial = chunk;
        callback();
        return;
    }
    
    // searching for end of data
    var endPos = this.endTable.search(chunk, 0);
    
    if (endPos === -1) {
        // no match; is there maybe a partial match?
        if (this.endTable.maybePartial(chunk)) {
            // could be, write most of the data and store enough of the rest to handle a "seam"
            var chop = -this.endTable.length + 1;
            this.outStream.write(chunk.slice(0, chop));
            this.partial = chunk.slice(chop);
        } else {
            this.outStream.write(chunk);
        }
        callback();
        return;
    }
    
    // there was a match
    if (endPos > 0) {
        this.outStream.write(chunk.slice(0, endPos));
    }
    chunk = chunk.slice(endPos + this.endTable.length);

    // state = seeking
    this.seeking = true;
    this.outStream.end();
    this.outStream = noStream;
    
    // if there's more data, continue processing chunk
    // if not, signal that we're done processing
    var handle = function () {
        if (chunk.length) {
            this._seekStart(chunk, callback);
        } else {
            callback();
        }
    }.bind(this);
    
    // delay continuation until the replacement stream ends, if there is one
    if (this.inStream !== noStream) {
        this.inStream.on('end', handle);
    } else {
        handle();
    }
};

module.exports = SpliceStream;
