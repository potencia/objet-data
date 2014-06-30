'use strict';

var constants = require('./constants'),
U = constants.U,
Q = require('q');

function Transaction (obj) {
    this.obj = obj;
    this.autoCommit = true;
    this.data = {};
    this.toClear = [];
}

Transaction.prototype.commit = function () {
    if (this.autoCommit) {
        return this.obj[U].commitTransaction(this);
    } else {
        this.deferred = Q.defer();
        return this.deferred.promise;
    }
};

module.exports = Transaction;
