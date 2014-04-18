'use strict';

var constants = require('./core/constants'),
U = constants.U;

function ObjetDAta () {}

ObjetDAta.Database = require('./core/Database');

ObjetDAta.Utility = require('./core/Utility');

Object.defineProperty(ObjetDAta.prototype, 'plugins', {
    value : {},
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

ObjetDAta.registerPlugin = function (Plugin) {
    _registerPlugin(ObjetDAta, Plugin);
};

ObjetDAta.setDefinition = function (Subclass, definition) {
    _setDefinition(ObjetDAta, Subclass, definition);
};

ObjetDAta.isPersistencePending = function (obj) {
    return obj[U].isPersistencePending();
};

ObjetDAta.whenFullyPersisted = function (obj) {
    return obj[U].whenFullyPersisted();
};

ObjetDAta.prototype.initialize = function (db) {
    var config = {
        db : db,
        definition : this.constructor.definition
    };
    if (!config.definition) {
        throw new Error('Error: ObjetDAta.prototype.initialize(): The subclass must extend ObjetDAta using the ObjetDAta.setDefinition() function.');
    }
    return new ObjetDAta.Utility(this, config).obj;
};

ObjetDAta.registerPlugin(require('./plugins/type/string'));

module.exports = ObjetDAta;
