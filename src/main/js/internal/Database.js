'use strict';

var constants = require('./constants'),
U = constants.U,
S = constants.S,
PLUGIN_TYPE = 'db',
NEVER_OPENED = 'NEVER_OPENED',
Q = require('q');

function Database(type, config) {
    Object.defineProperty(this, S, {
        value : {
            isOpen : false,
            closeResults : {
                code : NEVER_OPENED,
                function : 'DataObject.Database.prototype.close()',
                message : 'This database has never been opened.'
            }
        },
        writable : false,
        enumerable : false,
        configurable : false
    });

    Object.defineProperties(this, {
        type : {
            value : type,
            writable : false,
            enumerable : true,
            configurable : false
        },
        config : {
            value : JSON.parse(JSON.stringify(config)), // TODO: Make a better deepCopy utility
            writable : false,
            enumerable : true,
            configurable : false
        }
    });
}

Object.defineProperty(Database.prototype, 'isOpen', {
    enumerable : true,
    configurable : false,
    get : function () {
        return this[S].isOpen;
    }
});

Object.defineProperty(Database.prototype, 'lastError', {
    enumerable : true,
    configurable : false,
    get : function () {
        return this[S].lastError;
    }
});

function setOpenState(state, util, pluginName, result) {
    state.isOpen = true;
    state.openResults = result;
    state.pluginClose = util.getPluginProperty(PLUGIN_TYPE, pluginName, 'close');
    delete state.closeResults;
    return result;
}

function setClosedState(state, result) {
    state.isOpen = false;
    state.closeResults = result;
    delete state.openResults;
    delete state.util;
    return result;
}

function setErrorState(state, reason) {
    state.isOpen = false;
    state.lastError = reason;
    delete state.openResults;
    delete state.closeResults;
    delete state.util;
    return reason;
}

Database.prototype.open = function (util) {
    var pluginName = this.type, state = this[S];
    if (state.isOpen) {
        return Q(state.openResults);
    } else {
        return util.getPluginProperty(PLUGIN_TYPE, pluginName, 'open')(this)
        .then(function (result) {
            return setOpenState(state, util, pluginName, result);
        }, function (reason) {
            return Q.reject(setErrorState(state, reason));
        });
    }
};

Database.prototype.close = function () {
    var state = this[S];
    if (state.isOpen) {
        return state.pluginClose(this)
        .then(function (result) {
            return setClosedState(state, result);
        }, function (reason) {
            return Q.reject(setErrorState(state, reason));
        });
    } else {
        return Q(state.closeResults);
    }
};

Database.prototype.persist = function (tx) {
    var self = this, state = self[S];
    if (state.isOpen) {
        return tx.obj[U].getPluginProperty(PLUGIN_TYPE, self.type, 'persist')(self, tx);
    } else {
        if (state.closeResults && state.closeResults.code === NEVER_OPENED) {
            return this.open(tx.obj[U]).then(function () { return self.persist(tx); });
        }
        return Q.reject('Database.prototype.persist(): Could not persist the transaction because the database is closed.');
    }
};

module.exports = Database;
