'use strict';

var constants = require('../../main/js/internal/constants'),
U = constants.U,
DataObject = require('../../..'),
EJDBPlugin = require('../../main/js/plugins/db/ejdb');

function TestTools () {}

TestTools.prototype.createTestObject = function (db, definition) {
    var obj;
    function TestClass () {}
    DataObject.setDefinition(TestClass, definition);
    obj = new TestClass();
    obj.plugins.db = {
        ejdb : new EJDBPlugin()
    };
    obj.initialize(db);
    return obj;
};

TestTools.prototype.getData = function (obj) {
    var data = {
        id : obj[U].id,
        memory : obj[U].data
    };
    return obj[U].db.findOne(obj[U].collection, {_id : obj[U].id})
    .then(function (persisted) {
        delete persisted._id;
        data.persisted = persisted;
        return data;
    });
};

module.exports = new TestTools();
