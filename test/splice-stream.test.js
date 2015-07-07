'use strict';

var SpliceStream = require('../lib/splice-stream'),
    PassThrough = require('stream').PassThrough;
    
require('should');

function collect(strim, cb) {
    var chunks = [ ];
    strim.on('data', function (chunk) {
        chunks.push(chunk);
    });
    strim.on('end', function () {
        cb(Buffer.concat(chunks));
    });
}


describe('SpliceStream', function () {
    it('should pass a non-matching stream verbatim', function (done) {
        var str = 'kefobalar';
        var ss = new SpliceStream('foo', 'bar', function () {
            done(new Error('this should never get called'));
        });

        ss.end(str);
        collect(ss, function (data) {
            data.toString().should.equal(str);
            done();
        });
    });
    it('should replace data between the delims (static data)', function (done) {
        var str = 'foo[bar]baz';
        var ss = new SpliceStream('[', ']', function () {
            return 'keke';
        });
        
        ss.end(str);
        collect(ss, function (data) {
            data.toString().should.equal('fookekebaz');
            done();
        });
    });
    it('should replace data between the delims (stream)', function (done) {
        var str = 'foo[bar]baz';
        var ss = new SpliceStream('[', ']', function () {
            var pt = new PassThrough();
            pt.end('keke');
            return pt;
        });
        
        ss.end(str);
        collect(ss, function (data) {
            data.toString().should.equal('fookekebaz');
            done();
        });
    });
    it('should succeed on too-small or split chunks', function (done) {
        var buf = new Buffer('foo[[bar]]baz'), i = 0;
        var ss = new SpliceStream('[[', ']]', function () {
            return 'keke';
        });
        
        (function fn() {
            if (i < buf.length) {
                ss.write(buf.slice(i, i+1));
                i++;
                setImmediate(fn);
            } else {
                ss.end();
            }
        })();
        
        collect(ss, function (data) {
            data.toString().should.equal('fookekebaz');
            done();
        });
    });
    it('should replace non-terminated data', function (done) {
        var str = 'foo[ba';
        var ss = new SpliceStream('[', ']', function () {
            return 'keke';
        });
        
        ss.end(str);
        collect(ss, function (data) {
            data.toString().should.equal('fookeke');
            done();
        });
    });
    it('should interpolate correctly (multiple matches in one chunk, slow replacement stream)', function (done) {
        var str = 'foo[bar]baz[bar]baz';
        var count = 0;
        var ss = new SpliceStream('[', ']', function () {
            var pt = new PassThrough();
            
            setTimeout(function () {
                pt.end(String(count++));
            }, 50);
            return pt;
        });
        
        ss.end(str);
        collect(ss, function (data) {
            data.toString().should.equal('foo0baz1baz');
            done();
        });
    });
    it('should work with an empty second delimiter', function (done) {
        var str = 'foobarbaz';
        var ss = new SpliceStream('bar', '', function () {
            return 'keke';
        });
        
        ss.end(str);
        collect(ss, function (data) {
            data.toString().should.equal('fookekebaz');
            done();
        });
    });
    it('should work with a missing second delimiter (same as empty)', function (done) {
        var str = 'foobarbaz';
        var ss = new SpliceStream('bar', function () {
            return 'keke';
        });
        
        ss.end(str);
        collect(ss, function (data) {
            data.toString().should.equal('fookekebaz');
            done();
        });
    });
    it('should throw with an empty first delimiter', function () {
        (function () {
            new SpliceStream('', function () { });
        }).should.throw(/invalid start delimiter/);
    });
    it('should allow a string for the replacement (two-delim)', function (done) {
        var str = 'foo[bar]baz';
        var ss = new SpliceStream('[', ']', 'keke');
        
        ss.end(str);
        collect(ss, function (data) {
            data.toString().should.equal('fookekebaz');
            done();
        });
    });
    it('should allow a buffer for the replacement (two-delim)', function (done) {
        var str = 'foo[bar]baz';
        var ss = new SpliceStream('[', ']', new Buffer('keke'));
        
        ss.end(str);
        collect(ss, function (data) {
            data.toString().should.equal('fookekebaz');
            done();
        });
    });
    it('should allow a string for the replacement (one-delim)', function (done) {
        var str = 'foobarbaz';
        var ss = new SpliceStream('bar', 'keke');
        
        ss.end(str);
        collect(ss, function (data) {
            data.toString().should.equal('fookekebaz');
            done();
        });
    });
    it('should allow a buffer for the replacement (one-delim)', function (done) {
        var str = 'foobarbaz';
        var ss = new SpliceStream('bar', new Buffer('keke'));
        
        ss.end(str);
        collect(ss, function (data) {
            data.toString().should.equal('fookekebaz');
            done();
        });
    });
    it('should allow null for the callback', function (done) {
        var str = 'foo[bar]baz';
        var ss = new SpliceStream('[', ']', null);
        
        ss.end(str);
        collect(ss, function (data) {
            data.toString().should.equal('foobaz');
            done();
        });
    });
});
