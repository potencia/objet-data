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
                function : 'ObjetDAta.Database.prototype.close()',
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
        },
        cachedPluginProperties : {
            value : {},
            writable : false,
            enumerable : false,
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

function _getPluginProperty (db, util, type, plugin, property) {
    var name = new Array(type, plugin, property).join('.');
    if (!db.cachedPluginProperties.hasOwnProperty(name)) {
        db.cachedPluginProperties[name] = util.getPluginProperty(type, plugin, property);
    }
    return db.cachedPluginProperties[name];
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

function _onOpenDatabase (database, util, takeAction, actionTitle, actionCouldNot) {
    var state = database[S];
    if (state.isOpen) {
        return takeAction();
    } else {
        if (state.closeResults && state.closeResults.code === NEVER_OPENED) {
            return database.open(util).then(function () {
                return takeAction();
            });
        }
        return Q.reject(actionTitle + ': Could not ' + actionCouldNot + ' because the database is closed.');
    }
}

Database.prototype.load = function (util, id) {
    if (id === undefined) {
        return Q.reject('Cannot load the object as no valid id has been set.');
    }
    var self = this;
    return _onOpenDatabase(self, util, function () {
        return _getPluginProperty(self, util, PLUGIN_TYPE, self.type, 'load')(self, id);
    }, 'Database.prototype.load()', 'load the object');
};

Database.prototype.persist = function (tx) {
    if (Object.keys(tx.data).length === 0) {
        return Q();
    }
    var self = this;
    return _onOpenDatabase(self, tx.obj[U], function () {
        return _getPluginProperty(self, tx.obj[U], PLUGIN_TYPE, self.type, 'persist')(self, tx)
        .then(function (result) {
            tx.obj[U].data = tx.obj[U].data || {};
            Object.keys(tx.data).forEach(function (key) {
                tx.obj[U].data[key] = tx.data[key];
            });
            return result;
        });
    }, 'Database.prototype.persist()', 'persist the transaction');
};

Database.prototype.validateId = function (obj, id) {
    return _getPluginProperty(this, obj[U], PLUGIN_TYPE, this.type, 'validateId')(id);
};

module.exports = Database;
