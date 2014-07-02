'use strict';

var expect = require('chai').expect,
sinon = require('sinon'),
Q = require('q'),
ObjetDAta = require('../../../../');

function ChildClass () {}

function GrandchildClass () {}

describe('ObjetDAta.Utility', function () {
    var obj, util, tx, promise, db;

    beforeEach(function () {
        obj = {};
    });

    it('should have the [ Transaction ] property', function () {
        expect(ObjetDAta.Utility).to.have.property('Transaction');
        expect(ObjetDAta.Utility.Transaction).to.be.a('function');
    });

    it('should have the special [ pluginDefaults ] property', function () {
        var descriptor = Object.getOwnPropertyDescriptor(ObjetDAta.Utility, 'pluginDefaults');
        expect(descriptor.value).to.be.an('object');
        expect(descriptor.writable).to.be.false;
        expect(descriptor.enumerable).to.be.false;
        expect(descriptor.configurable).to.be.false;
    });

    describe('constructor', function () {
        it('should have a special property [  priv ]', function () {
            util = new ObjetDAta.Utility({}, {});
            var descriptor = Object.getOwnPropertyDescriptor(util, ' priv');
            expect(descriptor.enumerable).to.be.false;
            expect(descriptor.configurable).to.be.false;
            expect(descriptor.writable).to.be.false;
            expect(descriptor.value.database.queue).to.be.instanceOf(require('../../../main/js/core/Queue'));
            expect(descriptor.value).to.deep.equal({
                ' state' : 0,
                deferred : {
                    setDatabase : [],
                    persistenceDone : [],
                    loadDone : []
                },
                database : {
                    transactions : [],
                    queue : descriptor.value.database.queue,
                    errors : []
                }
            });
        });

        it('should set the [ .obj ] property', function () {
            util = new ObjetDAta.Utility({specialValue : 'very very special'}, {});
            expect(util).to.have.property('obj');
            expect(util.obj.specialValue).to.equal('very very special');
        });

        it('should set itself as the special [  util ] property on [ .obj ]', function () {
            expect(Object.getOwnPropertyDescriptor(obj, ' util')).to.be.undefined;
            util = new ObjetDAta.Utility(obj, {db : {name : 'a database'}});
            expect(Object.getOwnPropertyDescriptor(obj, ' util')).to.deep.equal({
                value : util,
                writable : false,
                enumerable : false,
                configurable : false
            });
        });

        it('should NOT set the [ .data ] property', function () {
            util = new ObjetDAta.Utility(obj, {});
            expect(util).to.not.have.property('data');
        });

        it('should set the [  priv.database.instance ] property', function () {
            util = new ObjetDAta.Utility(obj, {db : {foo : true}});
            expect(util[' priv'].database).to.have.property('instance');
            expect(util[' priv'].database.instance).to.deep.equal({foo : true});
        });

        it('should set the [ .collection ] property', function () {
            util = new ObjetDAta.Utility(obj, {definition : {collection : 'the collection name'}});
            expect(util).to.have.property('collection');
            expect(util.collection).to.equal('the collection name');
        });

        it('should set the [ .properties ] property', function () {
            util = new ObjetDAta.Utility(obj, {definition : {properties : {name : {type : 'string'}}}});
            expect(util).to.have.property('properties');
            expect(util.properties).to.have.property('name');
        });

        describe('property accessors', function () {
            var descriptor;
            beforeEach(function () {
                util = new ObjetDAta.Utility(obj, {definition : {properties : {
                    name : {type : 'string'},
                    age : {type : 'number'}
                }}});
            });

            it('should be created for all appropriate properties', function () {
                descriptor = Object.getOwnPropertyDescriptor(obj, 'name');
                expect(descriptor.get).to.be.a('function');
                expect(descriptor.set).to.be.a('function');
                descriptor = Object.getOwnPropertyDescriptor(obj, 'age');
                expect(descriptor.get).to.be.a('function');
                expect(descriptor.set).to.be.a('function');
            });

            it('getter should always invoke .getData()', function () {
                sinon.stub(util, 'getData');
                obj.name;
                obj.age;
                try {
                    expect(util.getData.callCount).to.equal(2);
                } finally {
                    util.getData.restore();
                }
            });

            it('setter should always invoke .getTransaction()', function () {
                sinon.stub(util, 'getTransaction').returns(Q());
                obj.name = 'John Johnson';
                obj.age = 42;
                try {
                    expect(util.getTransaction.callCount).to.equal(2);
                } finally {
                    util.getTransaction.restore();
                }
            });
        });


        describe('id configuration', function () {
            var descriptor;
            beforeEach(function () {
                util = new ObjetDAta.Utility(obj, {});
            });

            it('should create the [ id ] accessor', function () {
                descriptor = Object.getOwnPropertyDescriptor(obj, 'id');
                expect(descriptor.enumerable).to.be.true;
                expect(descriptor.configurable).to.be.false;
                expect(descriptor.get).to.be.a('function');
                expect(descriptor.set).to.be.a('function');
            });
        });
    });

    describe('.obj.id', function () {
        var db;
        beforeEach(function () {
            db = {
                validateId : sinon.stub()
            };
            util = new ObjetDAta.Utility(obj, {db : db});
        });

        describe('getter', function () {
            it('should return obj[U][P].id', function () {
                util[' priv'].id = 42;
                expect(obj.id).to.equal(42);
            });
        });

        describe('setter', function () {
            it('should call .validateId of the database object with the passed value', function (done) {
                obj.id = 42;
                util.database
                .then(function () {
                    expect(db.validateId.callCount).to.equal(1);
                    expect(db.validateId.firstCall.args).to.deep.equal([obj, 42]);
                }).done(done);
            });

            it('should update the id when when .validateId does not return an error', function (done) {
                util.id = 42;
                obj.id = 'foo';
                util.database
                .then(function () {
                    expect(util[' priv'].id).to.equal('foo');
                }).done(done);
            });

            describe('when .validateId returns an error', function () {
                beforeEach(function () {
                    db.validateId.returns('Sorry. That\'s a bad id.');
                });

                it('should add the error string to [  priv.database.errors ]', function (done) {
                    obj.id = 'foo';
                    util.database
                    .then(function () {
                        expect(util[' priv'].database.errors[0]).to.equal('ObjetDAta.id.set(): id [ foo ] is not a valid id: Sorry. That\'s a bad id.');
                    }).done(done);
                });

                it('should not update the id', function (done) {
                    util[' priv'].id = 42;
                    obj.id = 'foo';
                    util.database
                    .then(function () {
                        expect(util[' priv'].id).to.equal(42);
                    }).done(done);
                });
            });

            describe('when [  priv.database ] is unset', function () {
                beforeEach(function () {
                    obj = {};
                    util = new ObjetDAta.Utility(obj, {});
                });

                it('should not set the value until the database is set', function (done) {
                    expect(util[' priv'].database.instance).to.be.undefined;
                    obj.id = 'anything';
                    expect(util[' priv'].id).to.be.undefined;
                    util.database
                    .then(function () {
                        expect(util[' priv'].id).to.equal('anything');
                    }).done(done);
                    util.database = db;
                });
            });
        });
    });

    describe('.getPluginProperty()', function () {
        var realPluginDefaults;
        beforeEach(function () {
            Object.keys(ObjetDAta.prototype.plugins).forEach(function (key) {
                delete ObjetDAta.prototype.plugins[key];
            });
            realPluginDefaults = {};
            Object.keys(ObjetDAta.Utility.pluginDefaults).forEach(function (key) {
                realPluginDefaults[key] = ObjetDAta.Utility.pluginDefaults[key];
                delete ObjetDAta.Utility.pluginDefaults[key];
            });
            ObjetDAta.setDefinition(ChildClass, {});
            ChildClass.setDefinition(GrandchildClass, {});
            obj = new GrandchildClass().initialize();
            util = obj[' util'];
        });
        afterEach(function () {
            Object.keys(ObjetDAta.Utility.pluginDefaults).forEach(function (key) {
                delete ObjetDAta.Utility.pluginDefaults[key];
            });
            Object.keys(realPluginDefaults).forEach(function (key) {
                ObjetDAta.Utility.pluginDefaults[key] = realPluginDefaults[key];
            });
        });

        it('should retrieve the property from [ this.obj.plugins ] if possible', function () {
            Object.defineProperty(obj, 'plugins', {
                value : {
                    test : {
                        plain : {
                            answer : 42
                        }
                    }
                }
            });
            expect(util.getPluginProperty('test', 'plain', 'answer')).to.equal(42);
        });

        it('should retrieve the property from the prototype chain of [ this.obj ] if necessary', function () {
            function RootPluginOne () {
                this.type = 'root';
                this.name = 'plugin';
                this.hoo = 'rah';
            }
            function RootPluginTwo () {
                this.type = 'root';
                this.name = 'otherPlugin';
                this.hoo = 'hah';
            }
            function RootPluginThree () {
                this.type = 'child';
                this.name = 'plugin';
                this.tea = true;
            }
            function RootPluginFour () {
                this.type = 'grandchild';
                this.name = 'plugin';
                this.other = 'inherited';
            }
            function ChildPlugin () {
                this.type = 'child';
                this.name = 'plugin';
                this.tea = undefined;
            }
            function GrandchildPlugin () {
                this.type = 'grandchild';
                this.name = 'plugin';
                this.answer = 42;
            }
            ObjetDAta.registerPlugin(RootPluginOne);
            ObjetDAta.registerPlugin(RootPluginTwo);
            ObjetDAta.registerPlugin(RootPluginThree);
            ObjetDAta.registerPlugin(RootPluginFour);
            ChildClass.registerPlugin(ChildPlugin);
            GrandchildClass.registerPlugin(GrandchildPlugin);
            expect(util.getPluginProperty('root', 'plugin', 'hoo')).to.equal('rah');
            expect(util.getPluginProperty('root', 'otherPlugin', 'hoo')).to.equal('hah');
            expect(util.getPluginProperty('child', 'plugin', 'tea')).to.be.undefined;
            expect(util.getPluginProperty('grandchild', 'plugin', 'answer')).to.equal(42);
            expect(util.getPluginProperty('grandchild', 'plugin', 'other')).to.equal('inherited');
        });

        it('should retrieve the property from the default if possible and necessary', function () {
            ObjetDAta.Utility.pluginDefaults.restaurant = {
                universe : 'end'
            };
            expect(util.getPluginProperty('restaurant', 'anyPlugin', 'universe')).to.equal('end');
        });

        it('should throw an error when [ type ] is not valid', function () {
            try {
                util.getPluginProperty('typeNotThere', 'plugin', 'property');
                expect(true, 'Exception should have been thrown').to.be.false;
            } catch (error) {
                expect(error).to.be.an.instanceOf(Error);
                expect(error.message).to.equal('ObjetDAta.Utility.prototype.getPluginProperty(): The type [ typeNotThere ] is not valid.');
            }
        });

        it('should throw an error when [ plugin ] is not valid', function () {
            function Plugin () {
                this.type = 'test';
                this.name = 'something';
            }
            ObjetDAta.registerPlugin(Plugin);
            try {
                util.getPluginProperty('test', 'anything', 'property');
                expect(true, 'Exception should have been thrown').to.be.false;
            } catch (error) {
                expect(error).to.be.an.instanceOf(Error);
                expect(error.message).to.equal('ObjetDAta.Utility.prototype.getPluginProperty(): Could not find a plugin [ anything ] of type [ test ].');
            }
        });

        it('should throw an error when [ property ] is not valid', function () {
            function Plugin () {
                this.type = 'test';
                this.name = 'something';
            }
            ObjetDAta.registerPlugin(Plugin);
            try {
                util.getPluginProperty('test', 'something', 'whereAreYou');
                expect(true, 'Exception should have been thrown').to.be.false;
            } catch (error) {
                expect(error).to.be.an.instanceOf(Error);
                expect(error.message).to.equal('ObjetDAta.Utility.prototype.getPluginProperty(): Plugin [ something ] of type [ test ] has no property ' +
                '[ whereAreYou ].');
            }
        });
    });

    describe('plugin defaults', function () {
        beforeEach(function () {
            ObjetDAta.setDefinition(ChildClass, {});
            util = new ChildClass().initialize()[' util'];
        });

        describe('type.createAccessor()', function () {
            var createAccessor;
            beforeEach(function () {
                createAccessor = util.getPluginProperty('type', 'anyPlugin', 'createAccessor');
            });

            it('should exist', function () {
                expect(createAccessor).to.be.a('function');
            });

            it('should create a read / write accessor property on the [ obj ] named [ key ]', function () {
                var descriptor;
                createAccessor(util, obj, 'dent');
                descriptor = Object.getOwnPropertyDescriptor(obj, 'dent');
                expect(descriptor.enumerable).to.be.true;
                expect(descriptor.configurable).to.be.false;
                expect(descriptor.get).to.be.a('function');
                expect(descriptor.set).to.be.a('function');
            });

            describe('created property', function () {
                beforeEach(function () {
                    createAccessor(util, obj, 'name');
                });

                it('should return the value on [ util.data ] under its [ key ]', function () {
                    util.data = {
                        name : 'Arthur'
                    };
                    expect(obj.name).to.equal('Arthur');
                });

                it('should get a transaction set the value on it then commit it', function (done) {
                    var tx = {
                        data : {},
                        commit : sinon.stub()
                    };
                    sinon.stub(util, 'getTransaction').returns(Q(tx));
                    obj.name = 'Dent';
                    util.whenFullyPersisted()
                    .then(function () {
                        expect(util.getTransaction.callCount).to.equal(1);
                        expect(tx.commit.callCount).to.equal(1);
                        expect(tx.data).to.deep.equal({name : 'Dent'});
                    })
                    .finally(function () {
                        util.getTransaction.restore();
                    })
                    .done(done);
                });
            });
        });

        describe('db.validateId()', function () {
            var validateId;
            beforeEach(function () {
                validateId = util.getPluginProperty('db', 'anyPlugin', 'validateId');
            });

            it('should exist', function () {
                expect(validateId).to.be.a('function');
            });

            it('should always return [ undefined ] (meaning [ id ] is valid)', function () {
                expect(validateId()).to.be.undefined;
                expect(validateId('foo')).to.be.undefined;
                expect(validateId(1)).to.be.undefined;
                expect(validateId(-85)).to.be.undefined;
            });
        });
    });

    describe('.database', function () {
        beforeEach(function () {
            obj = {};
            util = new ObjetDAta.Utility(obj, {});
            db = {
                name : 'testDatabase',
                validateId : sinon.stub()
            };
        });

        it('should be an accessor property', function () {
            var descriptor = Object.getOwnPropertyDescriptor(util.constructor.prototype, 'database');
            expect(descriptor.enumerable).to.be.true;
            expect(descriptor.configurable).to.be.false;
            expect(descriptor.get).to.be.a('function');
            expect(descriptor.set).to.be.a('function');
        });

        describe('getter', function () {
            describe('when [  priv.database ] is already set', function () {
                beforeEach(function () {
                    util[' priv'].database.instance = db;
                });

                it('should return an already fulfilled promise', function () {
                    promise = util.database;
                    expect(Q.isPromise(promise)).to.be.true;
                    expect(promise.isFulfilled()).to.be.true;
                });

                it('should be resolved with [  priv.database ]', function (done) {
                    util.database.then(function (database) {
                        expect(db).to.equal(database);
                    }).done(done);
                });
            });

            describe('when [  priv.database ] is not set', function () {
                it('should return an unfulfilled promise', function () {
                    promise = util.database;
                    expect(Q.isPromise(promise)).to.be.true;
                    expect(promise.isFulfilled()).to.be.false;
                });

                it('should resolve with the [  priv.database ] when .database is successfully set', function (done) {
                    util.database
                    .then(function (database) {
                        expect(database).to.equal(db);
                    })
                    .done(done);
                    util.database = db;
                });

                it('should resolve multiple promises in the order in which they were received', function (done) {
                    var order = [];
                    util.database.then(function () { order.push(1); });
                    util.database.then(function () { order.push(2); });
                    util.database.then(function () { order.push(3); })
                    .then(function () {
                        expect(order).to.deep.equal([1, 2, 3]);
                        expect(util[' priv'].deferred.setDatabase).to.have.length(0);
                    }).done(done);
                    util.database = db;
                });
            });
        });

        describe('setter', function () {
            it('should set the [  priv.database ]', function () {
                expect(util.database = db).to.equal(db);
                expect(util[' priv'].database.instance).to.equal(db);
            });

            describe('when [ .id ] is NOT already set', function () {
                it('should NOT attempt to validate [ id ]', function () {
                    util.database = db;
                    expect(db.validateId.called).to.be.false;
                });
            });

            describe('when [ .id ] is already set', function () {
                beforeEach(function (done) {
                    util.database = db;
                    obj.id = 42;
                    util.database.then(function () {
                        db.validateId.reset();
                        done();
                    });
                });

                it('should validate [ .id ]', function (done) {
                    util.database = db;
                    util.database
                    .then(function () {
                        expect(db.validateId.callCount).to.equal(1);
                        expect(db.validateId.firstCall.args).to.deep.equal([42]);
                    }).done(done);
                });

                describe('and [ .id ] is valid', function () {
                    beforeEach(function () {
                        db.validateId.returns(undefined);
                    });

                    it('should keep the existing [ .id ]', function (done) {
                        util.database = db;
                        util.database
                        .then(function () {
                            expect(util[' priv'].id).to.equal(42);
                        }).done(done);
                    });
                });

                describe('and [ .id ] is NOT valid', function () {
                    beforeEach(function () {
                        db.validateId.returns('Bad id');
                    });

                    it('should add the error string to [  priv.database.errors ]', function (done) {
                        util[' priv'].id = 'foo';
                        expect(util[' priv'].database.errors).to.have.length(0);
                        util.database = db;
                        util.database
                        .then(function () {
                            expect(util[' priv'].database.errors).to.have.length(1);
                            expect(util[' priv'].database.errors[0]).to.equal('ObjetDAta.id.set(): id [ foo ] is not a valid id: Bad id');
                        }).done(done);
                    });

                    it('should clear the [ .id ]', function (done) {
                        obj.id = 'foo';
                        util.database = db;
                        util.database
                        .then(function () {
                            expect(util.id).to.be.undefined;
                        }).done(done);
                    });
                });
            });
        });
    });

    describe('.getTransaction', function () {
        beforeEach(function () {
            obj = {someData : 'value'};
            util = new ObjetDAta.Utility(obj, {});
        });

        it('should return a promise', function () {
            expect(Q.isPromise(util.getTransaction())).to.be.true;
        });

        it('should add the transaction to [  priv.database.transactions ]', function (done) {
            util.getTransaction()
            .then(function (tx) {
                expect(util[' priv'].database.transactions.indexOf(tx)).to.not.equal(-1);
            })
            .done(done);
        });

        it('promise should resolve with an ObjetDAta.Transaction object with this set on it', function (done) {
            util.getTransaction()
            .then(function (tx) {
                expect(tx).to.be.an.instanceof(ObjetDAta.Utility.Transaction);
                expect(tx.obj).to.equal(obj);
            })
            .done(done);
        });
    });

    describe('.commitTransaction', function () {
        var persistDeferred;
        beforeEach(function (done) {
            persistDeferred = Q.defer();
            db = {
                persist : sinon.stub().returns(persistDeferred.promise)
            };
            util = new ObjetDAta.Utility(obj, {db : db});
            util.getTransaction()
            .then(function (thisTx) {
                tx = thisTx;
            })
            .done(done);
        });

        it('should add the passed transaction and a deferred object to the end of [  priv.database.queue ]', function () {
            sinon.stub(util[' priv'].database.queue, 'add');
            try {
                util.commitTransaction(tx);
                expect(util[' priv'].database.queue.add.callCount).to.equal(1);
                expect(util[' priv'].database.queue.add.firstCall.args[0].tx).to.equal(tx);
            } finally {
                util[' priv'].database.queue.add.restore();
            }
        });

        it('should remove the passed transaction from [ util.database.transactions ]', function () {
            util.commitTransaction(tx);
            expect(util[' priv'].database.transactions.indexOf(tx)).to.equal(-1);
        });

        it('should return a promise', function () {
            expect(Q.isPromise(util.commitTransaction(tx))).to.be.true;
        });

        it('should call [ db.persist() ] with the transaction', function (done) {
            util.commitTransaction(tx)
            .then(function () {
                expect(db.persist.callCount).to.equal(1);
                expect(db.persist.firstCall.args).to.deep.equal([tx]);
            })
            .done(done);
            persistDeferred.resolve();
        });

        it('should NOT add an id to the transaction before calling [ db.persist() ] when [  priv.id ] undefined', function (done) {
            delete util[' priv'].id;
            util.commitTransaction(tx)
            .then(function () {
                expect(db.persist.firstCall.args[0].id).to.be.undefined;
            })
            .done(done);
            persistDeferred.resolve();
        });

        it('should add an [  priv.id ] to the transaction before calling [ db.persist() ]', function (done) {
            util[' priv'].id = 42;
            util.commitTransaction(tx)
            .then(function () {
                expect(db.persist.firstCall.args[0].id).to.equal(42);
            })
            .done(done);
            persistDeferred.resolve();
        });

        describe('returned promise', function () {
            beforeEach(function () {
                promise = util.commitTransaction(tx);
            });

            it('should resolve when the db.persist() call\'s promise resolves', function (done) {
                promise.then(function () {
                    done();
                });
                persistDeferred.resolve();
            });

            it('should reject with reason when the db.persist() call\'s promise reject', function (done) {
                promise.fail(function (reason) {
                    expect(reason).to.equal('Test Error');
                    done();
                });
                persistDeferred.reject('Test Error');
            });
        });

        describe('when called multiple times', function () {
            beforeEach(function () {
                persistDeferred = [];
                promise = [];
                tx = [];
            });

            it('should call [ db.persist() ] for each transaction serially when all are successful', function (done) {
                persistDeferred.push(Q.defer());
                persistDeferred.push(Q.defer());
                db.persist.onCall(0).returns(persistDeferred[0].promise);
                db.persist.onCall(1).returns(persistDeferred[1].promise);

                util.getTransaction()
                .then(function (tx0) {
                    tx.push(tx0);
                    return util.getTransaction();
                })
                .then(function (tx1) {
                    tx.push(tx1);

                    promise.push(util.commitTransaction(tx[0]));
                    promise.push(util.commitTransaction(tx[1]));

                    promise[0].then(function () {
                        function wait () {
                            if (db.persist.callCount < 2) {
                                setImmediate(wait);
                            } else {
                                persistDeferred[1].resolve();
                            }
                        }
                        wait();
                    }).done();

                    promise[1].then(function () {
                        expect(db.persist.callCount).to.equal(2);
                    }).done(done);
                })
                .then(function () {
                    persistDeferred[0].resolve();
                });
            });

            it('should call [ db.persist() ] for each transaction serially even when some are failed', function (done) {
                persistDeferred.push(Q.defer());
                persistDeferred.push(Q.defer());
                persistDeferred.push(Q.defer());
                db.persist.onCall(0).returns(persistDeferred[0].promise);
                db.persist.onCall(1).returns(persistDeferred[1].promise);
                db.persist.onCall(2).returns(persistDeferred[2].promise);

                util.getTransaction()
                .then(function (tx0) {
                    tx.push(tx0);
                    return util.getTransaction();
                })
                .then(function (tx1) {
                    tx.push(tx1);
                    return util.getTransaction();
                })
                .then(function (tx2) {
                    tx.push(tx2);

                    promise.push(util.commitTransaction(tx[0]));
                    promise.push(util.commitTransaction(tx[1]));

                    promise[0].then(function () {
                        function wait () {
                            if (db.persist.callCount < 2) {
                                setImmediate(wait);
                            } else {
                                promise.push(util.commitTransaction(tx[2]));
                                promise[2].then(function () {
                                    expect(db.persist.callCount).to.equal(3);
                                    expect(util[' priv'].database.errors).to.deep.equal(['The middle one failed.']);
                                }).done(done);
                                persistDeferred[1].reject('The middle one failed.');
                            }
                        }
                        wait();
                    }).done();

                    promise[1].fail(function (reason) {
                        expect(reason).to.equal('The middle one failed.');
                        function wait () {
                            if (db.persist.callCount < 3) {
                                setImmediate(wait);
                            } else {
                                persistDeferred[2].resolve();
                            }
                        }
                        wait();
                    }).done();
                })
                .then(function () {
                    persistDeferred[0].resolve();
                })
                .done();
            });
        });

        describe('when [ db ] is not set', function () {
            beforeEach(function () {
                obj = {};
                util = new ObjetDAta.Utility(obj, {});
            });

            it('should return a promise', function () {
                expect(Q.isPromise(util.commitTransaction(tx))).to.be.true;
            });
        });
    });

    describe('.isLoaded', function () {
        beforeEach(function () {
            util = new ObjetDAta.Utility(obj, {
                db : {}
            });
        });

        describe('when the object is already loaded', function () {
            beforeEach(function () {
                util[' priv'].state = 1;
            });

            it('should return true', function () {
                expect(util.isLoaded()).to.be.true;
            });
        });

        describe('when the object has not been loaded', function () {
            it('should return false', function () {
                expect(util.isLoaded()).to.be.false;
            });

            describe('when obj.id is not set', function () {
                it('should not add a load object to [  priv.database.queue ]', function () {
                    util.isLoaded();
                    expect(util[' priv'].database.queue[' priv'].queue).to.have.length(0);
                });
            });
        });
    });

    describe('.isPersistencePending', function () {
        beforeEach(function () {
            util = new ObjetDAta.Utility(obj, {
                db : {
                    persist : sinon.stub().returns(Q.defer().promise)
                }
            });
        });

        describe('when the object is already fully persisted', function () {
            it('should return false', function () {
                expect(util.isPersistencePending()).to.be.false;
            });
        });

        describe('when the object has outstanding transactions', function () {
            beforeEach(function () {
                util.getTransaction();
            });

            it('should return true', function () {
                expect(util.isPersistencePending()).to.be.true;
            });
        });

        describe('when the object is currently persisting', function () {
            beforeEach(function (done) {
                util.getTransaction()
                .then(function (tx) {
                    tx.commit();
                })
                .done(done);
            });

            it('should return true', function () {
                expect(util.isPersistencePending()).to.be.true;
            });
        });
    });

    describe('.whenFullyPersisted', function () {
        var persistDeferred;
        beforeEach(function () {
            persistDeferred = Q.defer();
            util = new ObjetDAta.Utility(obj, {
                db : {
                    persist : sinon.stub().returns(persistDeferred.promise)
                }
            });
        });

        it('should return a promise', function () {
            expect(Q.isPromise(util.whenFullyPersisted())).to.be.true;
        });

        describe('when the object is already fully persisted', function () {
            describe('when there are no errors', function () {
                it('should return a pre-resolved promise', function (done) {
                    util.whenFullyPersisted()
                    .done(done);
                });
            });

            describe('when there are errors', function () {
                beforeEach(function () {
                    util[' priv'].database.errors.push('An error happened.', 'Another error happened.');
                });

                it('should return a pre-rejected promise', function (done) {
                    util.whenFullyPersisted()
                    .then(function () {
                        expect(false, 'Should have failed.').to.be.true;
                    }, function () {})
                    .done(done);
                });

                it('should clear the errors', function (done) {
                    util.whenFullyPersisted()
                    .fail(function () {
                        expect(util[' priv'].database.errors).to.have.length(0);
                    })
                    .done(done);
                });

                it('should preserve the order of the errors', function (done) {
                    util.whenFullyPersisted()
                    .fail(function (errors) {
                        expect(errors).to.deep.equal(['An error happened.', 'Another error happened.']);
                    })
                    .done(done);
                });
            });
        });

        describe('when the object is currently persisting', function () {
            beforeEach(function (done) {
                util.getTransaction()
                .then(function (tx) {
                    tx.commit();
                })
                .done(done);
            });

            describe('when persisting is successful', function () {
                it('should have its promise resolved', function (done) {
                    util.whenFullyPersisted().done(done);
                    persistDeferred.resolve();
                });
            });
        });
    });
});
