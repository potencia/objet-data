'use strict';

var expect = require('chai').expect,
sinon = require('sinon'),
Q = require('q'),
DataObject = require('../../../..');

describe('DataObject.Database', function () {
    var db, util, pluginOpen, openDeferred;

    describe('constructor', function () {
        beforeEach(function () {
            var conf = {
                location : 'location/on/disk',
                options : {
                    writer : true,
                    create : true,
                    truncate : true
                }
            };
            db = new DataObject.Database('mongol', conf);
            conf.options.writer = false;
            conf.location = 'some/other/location';
        });

        it('should create a readonly, hidden property [ #state ]', function () {
            var descriptor = Object.getOwnPropertyDescriptor(db, '#state');
            expect(descriptor.writable).to.be.false;
            expect(descriptor.enumerable).to.be.false;
            expect(descriptor.configurable).to.be.false;
        });

        it('should create a readonly property [ type ] with the value of the type passed in', function () {
            expect(Object.getOwnPropertyDescriptor(db, 'type')).to.deep.equal({
                value : 'mongol',
                writable : false,
                enumerable : true,
                configurable : false
            });
        });

        it('should create a readonly property [ config ] with a deep copy of the passed in data', function () {
            expect(Object.getOwnPropertyDescriptor(db, 'config')).to.deep.equal({
                value : {
                    location : 'location/on/disk',
                    options : {
                        writer : true,
                        create : true,
                        truncate : true
                    }
                },
                writable : false,
                enumerable : true,
                configurable : false
            });
        });
    });

    describe('.isOpen', function () {
        beforeEach(function () {
            db = new DataObject.Database('', {});
        });

        it('should be a readonly accessor on the prototype', function () {
            expect(Object.getOwnPropertyDescriptor(db, 'isOpen')).to.be.undefined;
            var descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(db), 'isOpen');
            expect(descriptor.enumerable).to.be.true;
            expect(descriptor.configurable).to.be.false;
            expect(descriptor.get).to.be.a('function');
            expect(descriptor.set).to.be.undefined;
        });

        it('should return the current isOpen state', function () {
            expect(db.isOpen).to.be.false;
            db['#state'].isOpen = true;
            expect(db.isOpen).to.be.true;
            db['#state'].isOpen = false;
            expect(db.isOpen).to.be.false;
        });
    });

    describe('.lastError', function () {
        beforeEach(function () {
            db = new DataObject.Database('', {});
        });

        it('should be a readonly accessor on the prototype', function () {
            expect(Object.getOwnPropertyDescriptor(db, 'lastError')).to.be.undefined;
            var descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(db), 'lastError');
            expect(descriptor.enumerable).to.be.true;
            expect(descriptor.configurable).to.be.false;
            expect(descriptor.get).to.be.a('function');
            expect(descriptor.set).to.be.undefined;
        });

        it('should return the current lastError state', function () {
            expect(db.lastError).to.be.undefined;
            db['#state'].lastError = 'Some Error';
            expect(db.lastError).to.equal('Some Error');
            delete db['#state'].lastError;
            expect(db.lastError).to.be.undefined;
        });
    });

    describe('lifecycle', function () {
        beforeEach(function () {
            openDeferred = Q.defer();
            db = new DataObject.Database('mongol', {});
            util = {
                getPluginProperty : sinon.stub()
            };
            pluginOpen = sinon.stub().returns(openDeferred.promise);
            util.getPluginProperty.withArgs('db', 'mongol', 'open').returns(pluginOpen);
            util.getPluginProperty.withArgs('db', 'mongol', 'close').returns('fake close()');
        });

        describe('.open', function () {
            it('should execute the [ open() ] function of the [ db ] plugin for it\'s [ type ]', function () {
                var promise = db.open(util);
                expect(util.getPluginProperty.called).to.true;
                expect(util.getPluginProperty.firstCall.args).to.deep.equal(['db', 'mongol', 'open']);
                expect(pluginOpen.callCount).to.equal(1);
                expect(pluginOpen.firstCall.args).to.deep.equal([db]);
                expect(Q.isPromise(promise)).to.be.true;
            });

            it('should fetch the [ close() ] function of the [ db ] plugin for it\'s [ type ]', function (done) {
                db.open(util)
                .then(function () {
                    expect(util.getPluginProperty.calledWith('db', 'mongol', 'close')).to.be.true;
                    expect(db['#state'].pluginClose).to.equal('fake close()');
                })
                .done(done);
                openDeferred.resolve({message : 'Congrats!'});
            });

            it('should do nothing when isOpen is already true', function () {
                db['#state'].isOpen = true;
                var promise = db.open(util);
                expect(util.getPluginProperty.callCount).to.equal(0);
                expect(pluginOpen.callCount).to.equal(0);
                expect(Q.isPromise(promise)).to.be.true;
            });

            it('should resolve the promise to the actual open results when isOpen is already true', function (done) {
                db.open(util) // The real opening
                .then(function (results) {
                    expect(util.getPluginProperty.called).to.true;
                    expect(pluginOpen.callCount).to.equal(1);
                    expect(results).to.deep.equal({message : 'Congrats!'});
                    util.getPluginProperty.reset();
                    pluginOpen.reset();

                    return db.open(util); // This open has no effect, but it should resolve the same way the real opening did
                })
                .then(function (results) {
                    expect(util.getPluginProperty.callCount).to.equal(0);
                    expect(pluginOpen.callCount).to.equal(0);
                    expect(results).to.deep.equal({message : 'Congrats!'});
                })
                .done(done);
                openDeferred.resolve({message : 'Congrats!'});
            });

            it('should cause isOpen to be true after successful opening of the database', function (done) {
                db.open(util)
                .then(function () {
                    expect(db.isOpen).to.be.true;
                })
                .done(done);
                openDeferred.resolve();
            });

            it('should cause isOpen to be false after failed opening of the database', function (done) {
                db.open(util)
                .then(function () {
                    expect(false, 'Should have failed.').to.be.true;
                }, function () {
                    expect(db.isOpen).to.be.false;
                })
                .done(done);
                openDeferred.reject();
            });

            it('should cause #state.closeResults to be undefined after successful opening of the database', function (done) {
                db.open(util)
                .then(function () {
                    expect(db['#state'].closeResults).to.be.undefined;
                })
                .done(done);
                openDeferred.resolve();
            });

            it('should cause #state.openResults, #state.closeResults and #state.util to be undefined after failed opening of the database', function (done) {
                db['#state'].openResults = 'open';
                db['#state'].closeResults = 'close';
                db['#state'].util = 'util';
                db.open(util)
                .then(function () {
                    expect(false, 'Should have failed.').to.be.true;
                }, function () {
                    expect(db['#state'].openResults).to.be.undefined;
                    expect(db['#state'].closeResults).to.be.undefined;
                    expect(db['#state'].util).to.be.undefined;
                })
                .done(done);
                openDeferred.reject();
            });

            it('should set the lastError property after failed opening of the database', function (done) {
                db.open(util)
                .then(function () {
                    expect(false, 'Should have failed.').to.be.true;
                }, function () {
                    expect(db.lastError).to.equal('Houston, there was a problem.');
                })
                .done(done);
                openDeferred.reject('Houston, there was a problem.');
            });

            it('should propagate results from successful opening of the database', function (done) {
                db.open(util)
                .then(function (result) {
                    expect(result).to.equal('Yay!');
                })
                .done(done);
                openDeferred.resolve('Yay!');
            });

            it('should propagate failure after failed opening of the database', function (done) {
                db.open(util)
                .then(function () {
                    expect(false, 'Should have failed.').to.be.true;
                }, function (reason) {
                    expect(reason).to.equal('Test DB open failure.');
                })
                .done(done);
                openDeferred.reject('Test DB open failure.');
            });
        });

        describe('.close', function () {
            var pluginClose, closeDeferred;
            beforeEach(function () {
                closeDeferred = Q.defer();
                pluginClose = sinon.stub().returns(closeDeferred.promise);
            });

            describe('when not previously opened', function () {
                it('should resolve the promise with a never opened message', function (done) {
                    db.close()
                    .then(function (results) {
                        expect(util.getPluginProperty.callCount).to.equal(0);
                        expect(results).to.deep.equal({
                            code : 'NEVER_OPENED',
                            function : 'DataObject.Database.prototype.close()',
                            message : 'This database has never been opened.'
                        });
                    })
                    .done(done);
                });
            });

            describe('when previously opened', function () {
                beforeEach(function (done) {
                    db.open(util).done(function () {
                        util.getPluginProperty.reset();
                        db['#state'].pluginClose = pluginClose;
                        done();
                    });
                    openDeferred.resolve({message : 'You are now open for business.'});
                });

                it('should execute the previously fetched [ close() ] function', function() {
                    var promise = db.close();
                    expect(pluginClose.callCount).to.equal(1);
                    expect(pluginClose.firstCall.args).to.deep.equal([db]);
                    expect(Q.isPromise(promise)).to.be.true;
                });

                it('should do nothing when isOpen is already false', function () {
                    db['#state'].isOpen = false;
                    var promise = db.close();
                    expect(util.getPluginProperty.callCount).to.equal(0);
                    expect(pluginClose.callCount).to.equal(0);
                    expect(Q.isPromise(promise)).to.be.true;
                });

                it('should resolve the promise to the actual close results when isOpen is already false', function (done) {
                    db.close() // The real closing
                    .then(function (results) {
                        expect(pluginClose.callCount).to.equal(1);
                        expect(results).to.deep.equal({message : 'See ya!'});
                        util.getPluginProperty.reset();
                        pluginClose.reset();

                        return db.close(); // This close has no effect, but it should resolve the same way the real closing did
                    })
                    .then(function (results) {
                        expect(util.getPluginProperty.callCount).to.equal(0);
                        expect(pluginClose.callCount).to.equal(0);
                        expect(results).to.deep.equal({message : 'See ya!'});
                    })
                    .done(done);
                    closeDeferred.resolve({message : 'See ya!'});
                });

                it('should cause isOpen to be false after successful closing of the database', function (done) {
                    db.close()
                    .then(function () {
                        expect(db.isOpen).to.be.false;
                    })
                    .done(done);
                    closeDeferred.resolve();
                });

                it('should cause isOpen to be false after failed closing of the database', function (done) {
                    db.close()
                    .then(function () {
                        expect(false, 'Should have failed.').to.be.true;
                    }, function () {
                        expect(db.isOpen).to.be.false;
                    })
                    .done(done);
                    closeDeferred.reject();
                });

                it('should cause #state.openResults and #state.util to be undefined after successful closing of the database', function (done) {
                    db.close()
                    .then(function () {
                        expect(db['#state'].openResults).to.be.undefined;
                        expect(db['#state'].util).to.be.undefined;
                    })
                    .done(done);
                    closeDeferred.resolve();
                });

                it('should cause #state.openResults, #state.closeResults and #state.util to be undefined after failed closing of the database',
                function (done) {
                    db['#state'].openResults = 'open';
                    db['#state'].closeResults = 'close';
                    db.close()
                    .then(function () {
                        expect(false, 'Should have failed.').to.be.true;
                    }, function () {
                        expect(db['#state'].openResults).to.be.undefined;
                        expect(db['#state'].closeResults).to.be.undefined;
                        expect(db['#state'].util).to.be.undefined;
                    })
                    .done(done);
                    closeDeferred.reject();
                });

                it('should set the lastError property after failed closing of the database', function (done) {
                    db.close()
                    .then(function () {
                        expect(false, 'Should have failed.').to.be.true;
                    }, function () {
                        expect(db.lastError).to.equal('I don\'t think we\'re in Kansas anymore.');
                    })
                    .done(done);
                    closeDeferred.reject('I don\'t think we\'re in Kansas anymore.');
                });

                it('should propagate results from successful closing of the database', function (done) {
                    db.close()
                    .then(function (result) {
                        expect(result).to.equal('Bye!');
                    })
                    .done(done);
                    closeDeferred.resolve('Bye!');
                });

                it('should propagate failure after failed closing of the database', function (done) {
                    db.close()
                    .then(function () {
                        expect(false, 'Should have failed.').to.be.true;
                    }, function (reason) {
                        expect(reason).to.equal('Could not clean up properly.');
                    })
                    .done(done);
                    closeDeferred.reject('Could not clean up properly.');
                });
            });
        });
    });

    describe('.persist', function () {
        var tx, pluginPersist, persistDeferred;
        beforeEach(function () {
            openDeferred = Q.defer();
            persistDeferred = Q.defer();
            db = new DataObject.Database('mongol', {});
            util = {
                getPluginProperty : sinon.stub()
            };
            tx = {
                obj : {
                    '#util' : util
                }
            };
            pluginOpen = sinon.stub().returns(openDeferred.promise);
            pluginPersist = sinon.stub().returns(persistDeferred.promise);
            util.getPluginProperty.withArgs('db', 'mongol', 'open').returns(pluginOpen);
            util.getPluginProperty.withArgs('db', 'mongol', 'persist').returns(pluginPersist);
        });

        describe('when the database has been opened', function () {
            beforeEach(function (done) {
                db.open(util).done(function () {
                    util.getPluginProperty.reset();
                    done();
                });
                openDeferred.resolve();
            });

            it('should execute the [ persist() ] function of the [ db ] plugin for it\'s [ type ]', function () {
                var promise = db.persist(tx);
                expect(util.getPluginProperty.callCount).to.equal(1);
                expect(util.getPluginProperty.firstCall.args).to.deep.equal(['db', 'mongol', 'persist']);
                expect(pluginPersist.callCount).to.equal(1);
                expect(pluginPersist.firstCall.args).to.deep.equal([db, tx]);
                expect(Q.isPromise(promise)).to.be.true;
            });
        });

        describe('when the database has been opened and closed', function () {
            beforeEach(function (done) {
                var closeDeferred = Q.defer();
                db.open(util)
                .done(function () {
                    db['#state'].pluginClose = sinon.stub().returns(closeDeferred.promise);
                    db.close()
                    .done(function () {
                        util.getPluginProperty.reset();
                        done();
                    });
                    closeDeferred.resolve();
                });
                openDeferred.resolve();
            });

            it('should reject', function (done) {
                db.persist(tx)
                .then(function () {
                    expect(false, 'Should have failed.').to.be.true;
                }, function (reason) {
                    expect(reason).to.equal('Database.prototype.persist(): Could not persist the transaction because the database is closed.');
                    expect(util.getPluginProperty.callCount).to.equal(0);
                })
                .done(done);
            });
        });

        describe('when the database has never been opened', function () {
            it('should open the db and execute the [ persist() ] function of the [ db ] plugin for it\'s [ type ]', function (done) {
                db.persist(tx)
                .then(function () {
                    expect(util.getPluginProperty.callCount).to.be.above(1);
                    expect(util.getPluginProperty.firstCall.args).to.deep.equal(['db', 'mongol', 'open']);
                    expect(util.getPluginProperty.lastCall.args).to.deep.equal(['db', 'mongol', 'persist']);
                    expect(pluginPersist.callCount).to.equal(1);
                    expect(pluginPersist.firstCall.args).to.deep.equal([db, tx]);
                })
                .done(done);
                openDeferred.resolve();
                persistDeferred.resolve();
            });

            it('should reject with any errors from the attempt to open the database', function (done) {
                db.persist(tx)
                .then(function () {
                    expect(false, 'Should have failed.').to.be.true;
                }, function (reason) {
                    expect(reason).to.equal('Couldn\'t open the database.');
                })
                .done(done);
                openDeferred.reject('Couldn\'t open the database.');
            });
        });
    });
});