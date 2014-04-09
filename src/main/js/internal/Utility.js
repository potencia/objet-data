'use strict';

function Utility (obj, config) {
    var self = this;
    self.data = {};
    self.obj = obj;
    Object.defineProperty(self.obj, Utility.U, {
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
                throw 'DataObject.Utility.prototype.getPluginProperty(): The type [ ' + type + ' ] is not valid.';
            }
            if (!currentState.foundPlugin) {
                throw 'DataObject.Utility.prototype.getPluginProperty(): Could not find a plugin [ ' + name + ' ] of type [ ' + type + ' ].';
            }
            throw 'DataObject.Utility.prototype.getPluginProperty(): Plugin [ ' + name + ' ] of type [ ' + type + ' ] has no property [ ' + property + ' ].';
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
            util.data[key] = value;
        }
    });
};

module.exports = Utility;
