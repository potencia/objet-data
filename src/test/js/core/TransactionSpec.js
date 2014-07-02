'use strict';

var expect = require('chai').expect,
sinon = require('sinon'),
Q = require('q'),
ObjetDAta = require('../../../../');

describe('ObjetDAta.Utility.Transaction', function () {
    var tx, obj, db;
    beforeEach(function () {
        obj = {
            name : 'testObject'
        };
        db = {
            name : 'testDatabase'
        };
        tx = new ObjetDAta.Utility.Transaction(obj, db);
    });

    describe('constructor', function () {
        it('should set the [ obj ] property to the supplied value', function () {
            expect(tx).to.have.property('obj');
            expect(tx.obj).to.deep.equal(obj);
        });

        it('should set the [ data ] property to an empty object', function () {
            expect(tx).to.have.property('data');
            expect(tx.data).to.deep.equal({});
        });

        it('should set the [ toClear ] property to an empty array', function () {
            expect(tx).to.have.property('toClear');
            expect(tx.toClear).to.deep.equal([]);
        });

        it('should set the [ autoCommit ] property to true', function () {
            expect(tx).to.have.property('autoCommit');
            expect(tx.autoCommit).to.be.true;
        });
    });

    describe('.commit()', function () {
        beforeEach(function () {
            obj[' util'] = {
                commitTransaction : sinon.stub().returns('I promise...')
            };
        });

        describe('when autoCommit', function () {
            it('should call .obj[\' util\'].commitTransaction with itself and return the result', function () {
                var returnValue = tx.commit();
                expect(obj[' util'].commitTransaction.callCount).to.equal(1);
                expect(obj[' util'].commitTransaction.firstCall.args).to.deep.equal([tx]);
                expect(returnValue).to.equal('I promise...');
            });
        });

        describe('when NOT autoCommit', function () {
            beforeEach(function () {
                tx.autoCommit = false;
            });

            it('should not call commitTransaction but it should return a promise', function () {
                var returnValue = tx.commit();
                expect(obj[' util'].commitTransaction.callCount).to.equal(0);
                expect(Q.isPromise(returnValue)).to.true;
            });

            it('should store the Q deferred object in the [ deferred ] property', function () {
                var returnValue = tx.commit();
                expect(tx).to.have.property('deferred');
                expect(tx.deferred.promise).to.equal(returnValue);
            });
        });
    });
});

/*
Goal: be able to write code like this:

//--- C(rud) ---
var firstSd = new SpecialData().initialize(db);

firstSd.name = 'Arthur'; // persistence is initiated. Since id is not set, insert will happen

// other code // takes some time //

console.log(firstSd.name); // Could output undefined or 'Arthur' - depends how fast the persist is

ObjetDAta.whenFullyPersisted(sd)
.then(function (result) { // result is the same as firstSd. Provided for convenience
    console.log(firstSd.name); // will output 'Arthur'
    console.log(firstSd.id); // will output the same database generated id (same object)
    console.log(result.id); // will output the database generated id
},function (reason) {
    console.log(reason); // will output the error from the failed insert
});

//---  (cr)U(d) ---
var sd = new SpecialData().initialize(db);

// setting the id does not initiate persistence
sd.id = 'Some ID';

// All setters create objects that perform persistence operations. These go in a queue
// and are handled in order. When the id is set updates happen.
sd.name = 'John'; // Starts the storing process
sd.name = 'John Johnson II'; // Queues up to store
console.log(sd.name); // Could output undefined, 'John', or 'John Johnson II' - non-deterministic

ObjetDAta.whenFullyPersisted(sd)
.then(function (result) { // result is the same as sd. Provided for convenience
    console.log(sd.name); // will output 'John Johnson II'
},function (reason) {
    console.log(reason); // will output the latest set of persistence errors for sd
});

//--- (c)R(ud) ---
var newSd = new SpecialData().initialize(db);

newSd.id = sd.id;

// All getters return the data on hand immediately. If the real data needs to be loaded
// and the id is set then loading is initiated. Failure to load is considered an error.
console.log(newSd.name); // will output undefined, but start the loading process

ObjetDAta.whenFullyLoaded(newSd) // will start the loading process unless it is already started
.then(function (result) { // result is the same as newSd. Provided for convenience
    console.log(newSd.name); // will output 'John Johnson II'
}, function (reason) {
    console.log(reason); // will output the latest set of loading errors for newSd
});

ObjetDAta.loadFrom(planOlObject, newSd); // returns true / false
// Attempts to put the data in plainOlObject into newSd. This is useful for when the database is
// queried directly for data and then some or all of the results are wanted in ObjetDAta objects

//--- (cru)D ---
ObjetDAta.remove(sd)
.then(function () { // nothing is passed on resolving
    console.log('success'); //the object is removed
}, function (reason) {
    console.log(reason); // will output the error from the failure to delete sd
});
console.log(sd.id); // will output undefined

//--- transactions ---
ObjetDAta.performInTransaction(function () {
    firstSd.name = 'Arthur Dent';
    sd.name = 'Arthur Dent'; // Multiple objects can be part of a transaction
    sd.age = sd.age + 3; // if data has not been changed in the transaction it is retrieved from
                         // the normal source. If it has been changed it is retrieved from the
                         // current state of the transaction
})
.then(function (result) { // result is the object used in the transaction (if only 1) or an
                          // array of all the objects used in the transaction (if more than 1)
    // the promise is resolved when the whole transaction succeeds and after it is committed
    console.log(sd.name); // will output 'Arthur Dent'
    console.log(firstSd.name); // will output 'Arthur Dent'
}, function (reason) {
    // the promise is rejected when an error occurs and after the transaction is rolled back
    console.log(reason); // will output the error that caused the transaction to fail
});

//--- notes ---
SpecialData.load(db, id); // will start loading the data using the id and return a promise
// shorthand for:
//    var obj = new SpecialData(),initialize(db);
//    obj.id = id;
//    ObjetDAta.whenFullyLoaded(obj); // returns a promise

// objects can be queried for status regarding persisting
ObjetDAta.isPersistencePending(sd); // returns immediate true or false

// objects can be queried for status regarding loading
ObjetDAta.isLoaded(sd); // returns immediate true or false

// objects can be queried for status regarding idle
ObjetDAta.isIdle(sd); // returns immediate true or false - Alias for (ObjetDAta.isLoaded(sd) || !ObjetDAta.isPersistencePending(sd))

ObjetDAta.whenFullyPersisted
- when any persistence operation fails, it records its error
- returns a promise
  - resolves when all asynchronous persistence operations are complete
  - rejects if there are any previously recorded errors

ObjetDAta.whenFullyLoaded
- returns a promise
  - when the object is already loaded this resolves immediately
  - when the object is not loaded and loading is not in progress, starts the loading process
  - when the object is not loaded but is already loading, waits
  - when loading is complete the promise is resolved
  - when an error occurs (or has already occurred) during loading the promise is rejected

ObjetDAta.whenIdle
- returns a promise
  - when the object is not loading or persisting this resolves immediately
  - when the object is loading but not persisting the promise resolves at the end of loading
  - when the object is not loading but is persisting the promise resolves at the end of persisting
  - when the object is both loading and persisting the promise resolves once both are finished
*/
