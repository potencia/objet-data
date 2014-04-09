'use strict';

var expect = require('chai').expect,
DataObject = require('../../../..');

describe('DataObject.Transaction', function () {
    var tx, obj;
    describe('constructor', function () {
        beforeEach(function () {
            obj = {
                name : 'testObject'
            };
            tx = new DataObject.Transaction(obj);
        });

        it('should set the [ obj ] property to the supplied value', function () {
            expect(tx.obj).to.deep.equal(obj);
        });
    });
});
