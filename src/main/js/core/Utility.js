'use strict';

var constants = require('./constants'),
Queue = require('./Queue'),
Q = require('q'),
S = constants.S,
P = constants.P,
STATE_NEW = 0,
STATE_LOADED = 1;

function _createInvalidIdError(id, error) {
    return 'ObjetDAta.id.set(): id [ ' + id + ' ] is not a valid id: ' + error;
}

function DatabaseQueue (util) {
    Queue.call(this);
    this[P].globalContext.util = util;
}

DatabaseQueue.prototype = new Queue();

DatabaseQueue.prototype.prepare = function () {
    var context = this.context;
    context.util.database
    .then(function (database) {
        context.db = database;
    })
    .then(this.resolve);
};

function PersistItem (util, tx) {
    this.tx = tx;
    this.afterRun = function () {
        util[P].database.persistItems--;
        this.apply(null, arguments);
        if (util[P].database.persistItems === 0) {
            setImmediate(function () {
                util.whenFullyPersisted();
            });
        }
    };
    util[P].database.persistItems++;
}

PersistItem.prototype = new Queue.Item();

PersistItem.prototype.run = function () {
    var self = this, tx = this.tx, util = this.util;
    if (util[P].id) {
        tx.id = util[P].id;
    }
    self.db.persist(tx)
    .then(self.afterRun.bind(self.resolve),
    self.afterRun.bind(function (reason) {
        util[P].database.errors.push(reason);
        self.reject(reason);
    }));
};

function LoadItem (util, id) {
    this.id = id;
    this.afterRun = function () {
        util[P].database.loadItems--;
        if (util[P].database.loadItems === 0) {
            setImmediate(function () {
                util.whenFullyLoaded();
            });
        }
        this.apply(null, arguments);
    };
    util[P].database.loadItems++;
}

LoadItem.prototype = new Queue.Item();

LoadItem.prototype.run = function () {
    var self = this, util = this.util;
    self.db.load(self.id)
    .then(self.afterRun.bind(function (loaded) {
        util.data = loaded;
        util[P][S] = STATE_LOADED;
        self.resolve();
    }), self.afterRun.bind(function (reason) {
        util[P].database.errors.push(reason);
        self.reject(reason);
    }));
};

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
                persistenceDone : [],
                loadDone : []
            },
            database : {
                persistItems : 0,
                loadItems : 0,
                transactions : [],
                queue : new DatabaseQueue(self),
                errors : []
            }
        }
    });

    self[P][S] = STATE_NEW;

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
                    self[P].database.errors.push(_createInvalidIdError(id, error));
                } else {
                    self[P].id = id;
                }
            });
        }
    });

    if (config.db) {
        self[P].database.instance = config.db;
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
    var data = this.getData();
    return !!data ? fn.call(data) : undefined;
};

Utility.prototype.createSetter = function createSetter(fn) {
    return createSetter.template.bind([this, fn]);
};

Utility.prototype.createSetter.template = function (value) {
    var util = this[0],
    fn = this[1];

    util.getTransaction()
    .then(function (tx) {
        fn.call(tx.data, value);
        tx.commit();
    });
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
            return this[key];
        }),
        set : util.createSetter(function (value) {
            this[key] = value;
        })
    });
};

Utility.pluginDefaults.db = {};

Utility.pluginDefaults.db.validateId = function () {};

Object.defineProperty(Utility.prototype, 'database', {
    enumerable : true,
    configurable : false,
    get : function () {
        if (this[P].database.instance) {
            return Q(this[P].database.instance);
        } else {
            var deferred = Q.defer();
            this[P].deferred.setDatabase.push(deferred);
            return deferred.promise;
        }
    },
    set : function (database) {
        var error;
        this[P].database.instance = database;
        this[P].deferred.setDatabase.forEach(function (d) { d.resolve(this); }, this[P].database.instance);
        this[P].deferred.setDatabase.length = 0;
        if (this[P].id) {
            error = this[P].database.instance.validateId(this[P].id);
        }
        if (error) {
            this[P].database.errors.push(_createInvalidIdError(this[P].id, error));
            delete this[P].id;
        }
    }
});

Utility.prototype.getTransaction = function () {
    var deferred = Q.defer(), tx = new Utility.Transaction(this.obj);
    this[P].database.transactions.push(tx);
    deferred.resolve(tx);
    return deferred.promise;
};

Utility.prototype.commitTransaction = function (tx) {
    var txIndex = this[P].database.transactions.indexOf(tx);
    if (txIndex > -1) {
        this[P].database.transactions.splice(txIndex, 1);
    }
    return this[P].database.queue.add(new PersistItem(this, tx));
};

Utility.prototype.isPersistencePending = function () {
    return this[P].database.transactions.length > 0 || this[P].database.persistItems > 0;
};

function _notifyAll (notificationArray, errorArray, obj) {
    var errors, toNotify;
    if (errorArray.length > 0) {
        errors = [];
        while (errorArray.length > 0) {
            errors.push(errorArray.shift());
        }
    }
    while (notificationArray.length > 0) {
        toNotify = notificationArray.shift();
        if (errors) {
            toNotify.reject(errors);
        } else {
            toNotify.resolve(obj);
        }
    }
}

Utility.prototype.whenFullyPersisted = function () {
    var deferred = Q.defer();
    this[P].deferred.persistenceDone.push(deferred);
    if (!this.isPersistencePending()) {
        _notifyAll(this[P].deferred.persistenceDone, this[P].database.errors, this.obj);
    }
    return deferred.promise;
};

Utility.prototype.getData = function () {
    return this.data;
};

Utility.prototype.isLoaded = function () {
    if (this[P][S] === STATE_LOADED) {
        return true;
    }
    if (this.obj.id) {
        this.whenFullyLoaded();
    }
    return false;
};

Utility.prototype.whenFullyLoaded = function () {
    var deferred = Q.defer();
    this[P].deferred.loadDone.push(deferred);
    if (this[P][S] === STATE_LOADED) {
        _notifyAll(this[P].deferred.loadDone, this[P].database.errors, this.obj);
    } else {
        if (this[P].database.loadItems === 0) {
            this[P].database.queue.add(new LoadItem(this, this.obj.id));
        }
    }
    return deferred.promise;
};

module.exports = Utility;
