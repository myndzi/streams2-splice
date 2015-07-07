'use strict';

function BMH(needle) {
    if (!Buffer.isBuffer(needle)) {
        needle = new Buffer(needle);
    }
    
    var i, len = needle.length, last = len - 1;
    
    for (i = 0; i < 256; i++) {
        this[i] = len;
    }
    
    // do not calculate a value for the last character
    for (i = 0; i < last; i++) {
        this[needle[i]] = last - i;
    }
    
    this.needle = needle;
    this.length = len;
    
    if (needle.length === 0) {
        this.search = function (haystack, idx) { return idx; };
    }
}
BMH.prototype.search = function (haystack, idx) {
    var i, x = haystack.length - this.length, inc = this.length - 1;
    
    while (idx <= x) {
        for (i = inc; haystack[idx + i] === this.needle[i]; i--) {
            if (i === 0) { return idx; }
        }
        idx += this[haystack[idx + inc]];
    }

    return -1;
};
BMH.prototype.maybePartial = function (haystack) {
    var needleEnd, i, j;
    
    for (needleEnd = this.length - 1; needleEnd >= 0; needleEnd--) {
        for (i = needleEnd, j = haystack.length - 1; this.needle[i] === haystack[j--]; i--) {
            if (i === 0) { return true; }
        }
    }
    return false;
};

module.exports = BMH;
