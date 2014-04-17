'use strict';

var constants = require('./constants'),
Q = require('q');

function Utility (obj, config) {
    var self = this;
    self.data = {};
    self.obj = obj;
    self.toPersist = [];
    self.persistenceErrors = [];
    self.deferUntilPersistenceCompletes = [];
    Object.defineProperty(self.obj, constants.U, {
        value : self,
        writable : false,
        enumerable : false,
        configurable : false
    });
    if (config.db) {
        this.db = config.db;
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
                throw new Error('DataObject.Utility.prototype.getPluginProperty(): The type [ ' + type + ' ] is not valid.');
            }
            if (!currentState.foundPlugin) {
                throw new Error('DataObject.Utility.prototype.getPluginProperty(): Could not find a plugin [ ' + name + ' ] of type [ ' + type + ' ].');
            }
            throw new Error('DataObject.Utility.prototype.getPluginProperty(): Plugin [ ' + name + ' ] of type [ ' + type + ' ] has no property [ ' +
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
            var tx = util.getTransaction();
            tx.data[key] = value;
            tx.commit();
            //util.data[key] = value;
        }
    });
};

Utility.prototype.getTransaction = function () {
    return new Utility.Transaction(this.obj);
};

Utility.prototype.commitTransaction = function (tx) {
    var self = this, todo = {
        tx : tx,
        deferred : Q.defer()
    }, leftToPersist = self.toPersist.length;
    self.toPersist.push(todo);

    function next () {
        if (self.toPersist.length > 0) {
            var current = self.toPersist[0];
            self.db.persist(current.tx)
            .then(function () {
                current.deferred.resolve();
            }, function (reason) {
                self.persistenceErrors.push(reason);
                current.deferred.reject(reason);
            })
            .done(function () {
                self.toPersist.shift();
                setImmediate(next);
            });
        } else {
            self.whenFullyPersisted();
        }
    }
    if (leftToPersist === 0) {
        next();
    }

    return todo.deferred.promise;
};

Utility.prototype.isPersistencePending = function () {
    return !!this.toPersist.length;
};

Utility.prototype.whenFullyPersisted = function () {
    var errors, toNotify, deferred = Q.defer();
    this.deferUntilPersistenceCompletes.push(deferred);
    if (!this.isPersistencePending()) {
        if (this.persistenceErrors.length) {
            errors = [];
            while (this.persistenceErrors.length) {
                errors.push(this.persistenceErrors.shift());
            }
        }
        while (this.deferUntilPersistenceCompletes.length) {
            toNotify = this.deferUntilPersistenceCompletes.shift();
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
