'use strict';

var BMH = require('../lib/bmh');
var format = require('util').format;
require('should');

describe('Constructor', function () {
    it('accepts a string', function () {
        var bmh = new BMH('foo');
        bmh.search(new Buffer('foobar'), 0).should.equal(0);
    });
    it('accepts a buffer', function () {
        var bmh = new BMH(new Buffer('foo'));
        bmh.search(new Buffer('foobar'), 0).should.equal(0);
    });
});
describe('BMH#search', function () {
    [   ['abc', 'abc', 0, 0],
        ['abc', 'abc', 1, -1],
        ['abc', 'ababc', 0, 2],
        ['abc', 'abcabc', 0, 0],
        ['abc', 'abcabc', 3, 3],
        ['abc', 'abacab', 0, -1 ],
        ['', 'abc', 0, 0],
        ['', 'abc', 1, 1]
    ].forEach(function (args) {
        var desc = format('"%s" in "%s" @ %d === %d', args[0], args[1], args[2], args[3]);
        it(desc, function () {
            var bmh = new BMH(args[0]);
            bmh.search(new Buffer(args[1]), args[2]).should.equal(args[3]);
        });
    });
});
describe('BMH#maybePartial', function () {
    [   ['abc', 'ab', true],
        ['abc', 'bc', false],
        ['abcab', 'cabab', true]
    ].forEach(function (args) {
        var desc = format('"%s" in "%s" === %s', args[0], args[1], args[2]);
        it(desc, function () {
            var bmh = new BMH(args[0]);
            bmh.maybePartial(new Buffer(args[1])).should.equal(args[2]);
        });
    });
});
