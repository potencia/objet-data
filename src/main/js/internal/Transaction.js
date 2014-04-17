'use strict';

var constants = require('./constants'),
U = constants.U,
Q = require('q');

function Transaction (obj, db) {
    this.obj = obj;
    this.db = db;
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
