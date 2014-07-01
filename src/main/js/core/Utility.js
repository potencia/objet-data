'use strict';

var constants = require('./constants'),
S = constants.S,
P = constants.P,
Q = require('q');

function _createInvalidIdError(id, error) {
    return 'ObjetDAta.id.set(): id [ ' + id + ' ] is not a valid id: ' + error;
}

function Utility (obj, config) {
    var self = this;
    self.obj = obj;

    Object.defineProperty(self, P, {
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

    self[P][S] = 0;

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
            return self[P].id;
        },
        set : function (id) {
            self.database
            .then(function (database) {
                var error = database.validateId(self.obj, id);
                if (error) {
                    self[P].transactions.errors.push(_createInvalidIdError(id, error));
                } else {
                    self[P].id = id;
                }
            });
        }
    });

    if (config.db) {
        self[P].database = config.db;
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

Utility.prototype.createGetter = function createGetter(fn) {
    return createGetter.template.bind(this, fn);
};

Utility.prototype.createGetter.template = function (fn) {
    return this.isLoaded() ? fn.call(this) : undefined;
};

Utility.prototype.getPluginProperty = function (type, name, property) {
    return _getPluginProperty(this.obj, type, name, property);
};

Utility.pluginDefaults.type = {};

Utility.pluginDefaults.type.createAccessor = function (util, obj, key) {
    Object.defineProperty(obj, key, {
        enumerable : true,
        configurable : false,
        get : util.createGetter(function () {
            return this.data[key];
        }),
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
        if (this[P].database) {
            return Q(this[P].database);
        } else {
            var deferred = Q.defer();
            this[P].deferred.setDatabase.push(deferred);
            return deferred.promise;
        }
    },
    set : function (database) {
        var error, internal = this[P];
        internal.database = database;
        internal.deferred.setDatabase.forEach(function (d) { d.resolve(this); }, internal.database);
        internal.deferred.setDatabase.length = 0;
        if (internal.id) {
            error = internal.database.validateId(internal.id);
        }
        if (error) {
            this[P].transactions.errors.push(_createInvalidIdError(internal.id, error));
            delete internal.id;
        }
    }
});

Utility.prototype.getTransaction = function () {
    var deferred = Q.defer(), tx = new Utility.Transaction(this.obj);
    this[P].transactions.uncommitted.push(tx);
    deferred.resolve(tx);
    return deferred.promise;
};

Utility.prototype.commitTransaction = function (tx) {
    var self = this, todo = {
        tx : tx,
        deferred : Q.defer()
    }, alreadyPersisting = self[P].transactions.persisting.length, db,
    uncommittedIndex = self[P].transactions.uncommitted.indexOf(tx);
    if (uncommittedIndex !== -1) {
        self[P].transactions.uncommitted.splice(uncommittedIndex, 1);
    }
    self[P].transactions.persisting.push(todo);

    function next () {
        if (self[P].transactions.persisting.length > 0) {
            var current = self[P].transactions.persisting[0];
            if (self[P].id) {
                current.tx.id = self[P].id;
            }
            db.persist(current.tx)
            .then(function () {
                current.deferred.resolve();
            }, function (reason) {
                self[P].transactions.errors.push(reason);
                current.deferred.reject(reason);
            })
            .done(function () {
                self[P].transactions.persisting.shift();
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
    return this[P].transactions.uncommitted.length + this[P].transactions.persisting.length > 0;
};

Utility.prototype.whenFullyPersisted = function () {
    var errors, toNotify, deferred = Q.defer();
    this[P].deferred.persistenceDone.push(deferred);
    if (!this.isPersistencePending()) {
        if (this[P].transactions.errors.length) {
            errors = [];
            while (this[P].transactions.errors.length) {
                errors.push(this[P].transactions.errors.shift());
            }
        }
        while (this[P].deferred.persistenceDone.length) {
            toNotify = this[P].deferred.persistenceDone.shift();
            if (errors) {
                toNotify.reject(errors);
            } else {
                toNotify.resolve();
            }
        }
    }
    return deferred.promise;
};

Utility.prototype.isLoaded = function () {
    return !!this.data;
};

module.exports = Utility;
