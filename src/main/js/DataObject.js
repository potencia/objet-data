'use strict';

var U = '#util';

function DataObject () {}

DataObject.Transaction = require('./internal/Transaction');

DataObject.Utility = require('./internal/Utility');
Object.defineProperty(DataObject.Utility, 'U', {
    value : U,
    writable : false,
    enumerable : false,
    configurable : false
});

Object.defineProperty(DataObject.prototype, 'plugins', {
    value: {},
    writable : false,
    enumerable : false,
    configurable : false
});

function _registerPlugin(thisClass, Plugin) {
    var plugin = new Plugin();
    if (!thisClass.prototype.plugins[plugin.type]) {
        thisClass.prototype.plugins[plugin.type] = {};
    }
    thisClass.prototype.plugins[plugin.type][plugin.name] = plugin;
}

function _setDefinition(Superclass, Subclass, definition) {
    var subClassPrototype = Subclass.prototype;
    Subclass.prototype = Object.create(Superclass.prototype);
    Object.keys(subClassPrototype).forEach(function (key) {
        Subclass.prototype[key] = subClassPrototype[key];
    });
    Object.defineProperty(Subclass.prototype, 'constructor', {
        value : Subclass,
        enumerable : false,
        writable : false,
        configurable : false
    });
    Subclass.definition = definition;
    Object.defineProperty(Subclass.prototype, 'plugins', {
        value : {},
        writable : false,
        enumerable : false,
        configurable : false
    });
    Subclass.setDefinition = function (SubSubclass, definition) {
        _setDefinition(Subclass, SubSubclass, definition);
    };
    Subclass.registerPlugin = function (Plugin) {
        _registerPlugin(Subclass, Plugin);
    };
}

DataObject.registerPlugin = function (Plugin) {
    _registerPlugin(DataObject, Plugin);
};

DataObject.setDefinition = function (Subclass, definition) {
    _setDefinition(DataObject, Subclass, definition);
};

DataObject.prototype.initialize = function (db) {
    var config = {
        db : db,
        definition : this.constructor.definition
    };
    if (!config.definition) {
        throw 'Error: DataObject.prototype.initialize(): The subclass must extend DataObject using the ' +
        'DataObject.setDefinition() function.';
    }
    new DataObject.Utility(this, config);
    return this;
};

module.exports = DataObject;