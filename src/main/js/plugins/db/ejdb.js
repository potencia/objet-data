'use strict';

var constants = require('../../core/constants'),
U = constants.U,
S = constants.S,
EJDB = require('ejdb'),
Q = require('q'),
openModeMap = {
    reader : EJDB.JBOREADER,
    writer : EJDB.JBOWRITER,
    create : EJDB.JBOCREAT,
    truncate : EJDB.JBOTRUNC
};

function applyOnJb(db, method, args, max) {
    var lastArg, noFunc = Array.apply({}, args).map(function (value) {
        if (typeof value === 'function') {
            return undefined;
        }
        return value;
    });
    while (noFunc.length > 0) {
        lastArg = noFunc.pop();
        if (lastArg !== undefined && lastArg !== null) {
            noFunc.push(lastArg);
            break;
        }
    }
    return Q.fapply(db[S].jb[method].bind(db[S].jb), noFunc.slice(0, max));
}

function EJDBPlugin () {
    this.type = 'db';
    this.name = 'ejdb';

    this.open = function (db) {
        var openMode = openModeMap.writer | openModeMap.create;
        if (db.config.openMode) {
            openMode = Object.keys(db.config.openMode).reduce(function (mode, key) {
                if (db.config.openMode[key] === true) {
                    return mode | openModeMap[key];
                }
                return mode;
            }, 0);
        }
        return Q.fcall(EJDB.open, db.config.dbFile, openMode)
        .then(function (jb) {
            db[S].jb = jb;
            Object.defineProperties(db, {
                findOne : {
                    value : function () {
                        return applyOnJb(db, 'findOne', arguments, 4);
                    },
                    writable : false,
                    enumerable : false,
                    configurable : false
                },
                save : {
                    value : function () {
                        return applyOnJb(db, 'save', arguments, 2);
                    },
                    writable : false,
                    enumerable : false,
                    configurable : false
                }
            });
        });
    };

    this.close = function (db) {
        return applyOnJb(db, 'close', []);
    };

    this.persist = function (db, tx) {
        var data = Object.keys(tx.data).reduce(function (copy, key) {
            copy[key] = tx.data[key];
            return copy;
        }, {});

        return applyOnJb(db, 'save', [tx.obj[U].collection, data])
        .then(function (oids) {
            tx.obj[U].id = oids[0]._id;
            return oids;
        });
    };
}

module.exports = EJDBPlugin;
