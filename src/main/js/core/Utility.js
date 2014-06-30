'use strict';

var constants = require('./constants'),
I = '#internal',
Q = require('q');

function _createInvalidIdError(id, error) {
    return 'ObjetDAta.id.set(): id [ ' + id + ' ] is not a valid id: ' + error;
}

function Utility (obj, config) {
    var self = this;
    self.obj = obj;

    Object.defineProperty(self, I, {
        enumerable : false,
        configurable : false,
        writable : false,
        value : {
            deferred : {
                setDatabase : [],
                persistenceDone : []
            },
            transactions : {
                uncommitted : [],
                persisting : [],
                errors : []
            }
        }
    });

    Object.defineProperty(self.obj, constants.U, {
        value : self,
        writable : false,
        enumerable : false,
        configurable : false
    });
    Object.defineProperty(self.obj, 'id', {
        enumerable : true,
        configurable : false,
        get : function () {
            return self[I].id;
        },
        set : function (id) {
            self.database
            .then(function (database) {
                var error = database.validateId(self.obj, id);
                if (error) {
                    self[I].transactions.errors.push(_createInvalidIdError(id, error));
                } else {
                    self[I].id = id;
                }
            });
        }
    });

    if (config.db) {
        self[I].database = config.db;
    }
    if (config.definition) {
        if (config.definition.collection) {
            self.collection = config.definition.collection;
        }
        if (config.definition.properties) {
            self.properties = config.definition.properties;
            Object.keys(self.properties).forEach(function (key) {
                self.getPluginProperty('type', self.properties[key].type, 'createAccessor')(self, self.obj, key);
            });
        }
    }
}

Utility.Transaction = require('./Transaction');

Object.defineProperty(Utility, 'pluginDefaults', {
    value : {},
    writable : false,
    enumerable : false,
    configurable : false
});

function _getPluginProperty(obj, type, name, property, state) {
    var prototype, valueDescriptor, pluginsDescriptor, plugins, plugin,
    currentState = state || {
        attemptDefaults : false,
        foundType : false,
        foundPlugin : false
    };

    if (currentState.attemptDefaults) {
        plugins = obj;
    } else {
        pluginsDescriptor = Object.getOwnPropertyDescriptor(obj, 'plugins');
        if (pluginsDescriptor) {
            plugins = pluginsDescriptor.value;
        }
    }

    if (plugins) {
        if (plugins[type]) {
            currentState.foundType = true;
            if (!currentState.attemptDefaults && plugins[type][name]) {
                currentState.foundPlugin = true;
                plugin = plugins[type][name];
            }
            if (currentState.attemptDefaults) {
                plugin = plugins[type];
            }
            if (plugin) {
                valueDescriptor = Object.getOwnPropertyDescriptor(plugin, property);
            }
        }
    }

    if (!valueDescriptor) {
        if (currentState.attemptDefaults) {
            if (!currentState.foundType) {
                throw new Error('ObjetDAta.Utility.prototype.getPluginProperty(): The type [ ' + type + ' ] is not valid.');
            }
            if (!currentState.foundPlugin) {
                throw new Error('ObjetDAta.Utility.prototype.getPluginProperty(): Could not find a plugin [ ' + name + ' ] of type [ ' + type + ' ].');
            }
            throw new Error('ObjetDAta.Utility.prototype.getPluginProperty(): Plugin [ ' + name + ' ] of type [ ' + type + ' ] has no property [ ' +
            property + ' ].');
        } else {
            prototype = Object.getPrototypeOf(obj);
            if (prototype) {
                return _getPluginProperty(prototype, type, name, property, currentState);
            } else {
                currentState.attemptDefaults = true;
                return _getPluginProperty(Utility.pluginDefaults, type, name, property, currentState);
            }
        }
    }
    return valueDescriptor.value;
}

Utility.prototype.getPluginProperty = function (type, name, property) {
    return _getPluginProperty(this.obj, type, name, property);
};

Utility.pluginDefaults.type = {};

Utility.pluginDefaults.type.createAccessor = function (util, obj, key) {
    Object.defineProperty(obj, key, {
        enumerable : true,
        configurable : false,
        get : function () {
            return util.data[key];
        },
        set : function (value) {
            util.getTransaction()
            .then(function (tx) {
                tx.data[key] = value;
                tx.commit();
            });
        }
    });
};

Utility.pluginDefaults.db = {};

Utility.pluginDefaults.db.validateId = function () {};

Object.defineProperty(Utility.prototype, 'database', {
    enumerable : true,
    configurable : false,
    get : function () {
        if (this[I].database) {
            return Q(this[I].database);
        } else {
            var deferred = Q.defer();
            this[I].deferred.setDatabase.push(deferred);
            return deferred.promise;
        }
    },
    set : function (database) {
        var error, internal = this[I];
        internal.database = database;
        internal.deferred.setDatabase.forEach(function (d) { d.resolve(this); }, internal.database);
        internal.deferred.setDatabase.length = 0;
        if (internal.id) {
            error = internal.database.validateId(internal.id);
        }
        if (error) {
            this[I].transactions.errors.push(_createInvalidIdError(internal.id, error));
            delete internal.id;
        }
    }
});

Utility.prototype.getTransaction = function () {
    var deferred = Q.defer(), tx = new Utility.Transaction(this.obj);
    this[I].transactions.uncommitted.push(tx);
    deferred.resolve(tx);
    return deferred.promise;
};

Utility.prototype.commitTransaction = function (tx) {
    var self = this, todo = {
        tx : tx,
        deferred : Q.defer()
    }, alreadyPersisting = self[I].transactions.persisting.length, db,
    uncommittedIndex = self[I].transactions.uncommitted.indexOf(tx);
    if (uncommittedIndex !== -1) {
        self[I].transactions.uncommitted.splice(uncommittedIndex, 1);
    }
    self[I].transactions.persisting.push(todo);

    function next () {
        if (self[I].transactions.persisting.length > 0) {
            var current = self[I].transactions.persisting[0];
            if (self[I].id) {
                current.tx.id = self[I].id;
            }
            db.persist(current.tx)
            .then(function () {
                current.deferred.resolve();
            }, function (reason) {
                self[I].transactions.errors.push(reason);
                current.deferred.reject(reason);
            })
            .done(function () {
                self[I].transactions.persisting.shift();
                setImmediate(next);
            });
        } else {
            self.whenFullyPersisted();
        }
    }
    if (alreadyPersisting === 0) {
        self.database
        .then(function (database) {
            db = database;
        })
        .then(next);
    }

    return todo.deferred.promise;
};

Utility.prototype.isPersistencePending = function () {
    return this[I].transactions.uncommitted.length + this[I].transactions.persisting.length > 0;
};

Utility.prototype.whenFullyPersisted = function () {
    var errors, toNotify, deferred = Q.defer();
    this[I].deferred.persistenceDone.push(deferred);
    if (!this.isPersistencePending()) {
        if (this[I].transactions.errors.length) {
            errors = [];
            while (this[I].transactions.errors.length) {
                errors.push(this['#internal'].transactions.errors.shift());
            }
        }
        while (this[I].deferred.persistenceDone.length) {
            toNotify = this[I].deferred.persistenceDone.shift();
            if (errors) {
                toNotify.reject(errors);
            } else {
                toNotify.resolve();
            }
        }
    }
    return deferred.promise;
};

module.exports = Utility;
