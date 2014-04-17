'use strict';

var expect = require('chai').expect,
sinon = require('sinon'),
Q = require('q'),
DataObject = require('../../../..');

function ChildClass () {}

function GrandchildClass () {}

describe('DataObject.Utility', function () {
    var obj, util, tx;

    beforeEach(function () {
        obj = {};
    });

    it('should have the [ Transaction ] property', function () {
        expect(DataObject.Utility).to.have.property('Transaction');
        expect(DataObject.Utility.Transaction).to.be.a('function');
    });

    it('should have the special [ pluginDefaults ] property', function () {
        var descriptor = Object.getOwnPropertyDescriptor(DataObject.Utility, 'pluginDefaults');
        expect(descriptor.value).to.be.an('object');
        expect(descriptor.writable).to.be.false;
        expect(descriptor.enumerable).to.be.false;
        expect(descriptor.configurable).to.be.false;
    });

    describe('constructor', function () {
        it('should create the [ toPersist ] property as an empty array', function () {
            util = new DataObject.Utility({}, {});
            expect(util).to.have.property('toPersist');
            expect(util.toPersist).to.deep.equal([]);
        });

        it('should create the [ persistenceErrors ] property as an empty array', function () {
            util = new DataObject.Utility({}, {});
            expect(util).to.have.property('persistenceErrors');
            expect(util.persistenceErrors).to.deep.equal([]);
        });

        it('should create the [ deferUntilPersistenceCompletes ] property as an empty array', function () {
            util = new DataObject.Utility({}, {});
            expect(util).to.have.property('deferUntilPersistenceCompletes');
            expect(util.deferUntilPersistenceCompletes).to.deep.equal([]);
        });

        it('should set the [ .obj ] property', function () {
            util = new DataObject.Utility({specialValue : 'very very special'}, {});
            expect(util).to.have.property('obj');
            expect(util.obj.specialValue).to.equal('very very special');
        });

        it('should set itself as the special [ #util ] property on [ .obj ]', function () {
            expect(Object.getOwnPropertyDescriptor(obj, '#util')).to.be.undefined;
            util = new DataObject.Utility(obj, {db : {name : 'a database'}});
            expect(Object.getOwnPropertyDescriptor(obj, '#util')).to.deep.equal({
                value : util,
                writable : false,
                enumerable : false,
                configurable : false
            });
        });

        it('should set the [ .db ] property', function () {
            util = new DataObject.Utility(obj, {db : {foo : true}});
            expect(util).to.have.property('db');
            expect(util.db).to.deep.equal({foo : true});
        });

        it('should set the [ .collection ] property', function () {
            util = new DataObject.Utility(obj, {definition : {collection : 'the collection name'}});
            expect(util).to.have.property('collection');
            expect(util.collection).to.equal('the collection name');
        });

        it('should set the [ .properties ] property', function () {
            util = new DataObject.Utility(obj, {definition : {properties : {'name' : {type : 'string'}}}});
            expect(util).to.have.property('properties');
            expect(util.properties).to.have.property('name');
        });

        it('should create accessors for all appropriate properties', function () {
            var descriptor;
            util = new DataObject.Utility(obj, {definition : {properties : {
                'name' : {type : 'string'},
                'age' : {type : 'number'}
            }}});
            descriptor = Object.getOwnPropertyDescriptor(obj, 'name');
            expect(descriptor.get).to.be.a('function');
            expect(descriptor.set).to.be.a('function');
            descriptor = Object.getOwnPropertyDescriptor(obj, 'age');
            expect(descriptor.get).to.be.a('function');
            expect(descriptor.set).to.be.a('function');
        });
    });

    describe('.getPluginProperty()', function () {
        var realPluginDefaults;
        beforeEach(function () {
            Object.keys(DataObject.prototype.plugins).forEach(function (key) {
                delete DataObject.prototype.plugins[key];
            });
            realPluginDefaults = {};
            Object.keys(DataObject.Utility.pluginDefaults).forEach(function (key) {
                realPluginDefaults[key] = DataObject.Utility.pluginDefaults[key];
                delete DataObject.Utility.pluginDefaults[key];
            });
            DataObject.setDefinition(ChildClass, {});
            ChildClass.setDefinition(GrandchildClass, {});
            obj = new GrandchildClass().initialize();
            util = obj['#util'];
        });
        afterEach(function () {
            Object.keys(DataObject.Utility.pluginDefaults).forEach(function (key) {
                delete DataObject.Utility.pluginDefaults[key];
            });
            Object.keys(realPluginDefaults).forEach(function (key) {
                DataObject.Utility.pluginDefaults[key] = realPluginDefaults[key];
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
            DataObject.registerPlugin(RootPluginOne);
            DataObject.registerPlugin(RootPluginTwo);
            DataObject.registerPlugin(RootPluginThree);
            DataObject.registerPlugin(RootPluginFour);
            ChildClass.registerPlugin(ChildPlugin);
            GrandchildClass.registerPlugin(GrandchildPlugin);
            expect(util.getPluginProperty('root', 'plugin', 'hoo')).to.equal('rah');
            expect(util.getPluginProperty('root', 'otherPlugin', 'hoo')).to.equal('hah');
            expect(util.getPluginProperty('child', 'plugin', 'tea')).to.be.undefined;
            expect(util.getPluginProperty('grandchild', 'plugin', 'answer')).to.equal(42);
            expect(util.getPluginProperty('grandchild', 'plugin', 'other')).to.equal('inherited');
        });

        it('should retrieve the property from the default if possible and necessary', function () {
            DataObject.Utility.pluginDefaults.restaurant = {
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
                expect(error.message).to.equal('DataObject.Utility.prototype.getPluginProperty(): The type [ typeNotThere ] is not valid.');
            }
        });

        it('should throw an error when [ plugin ] is not valid', function () {
            function Plugin () {
                this.type = 'test';
                this.name = 'something';
            }
            DataObject.registerPlugin(Plugin);
            try {
                util.getPluginProperty('test', 'anything', 'property');
                expect(true, 'Exception should have been thrown').to.be.false;
            } catch (error) {
                expect(error).to.be.an.instanceOf(Error);
                expect(error.message).to.equal('DataObject.Utility.prototype.getPluginProperty(): Could not find a plugin [ anything ] of type [ test ].');
            }
        });

        it('should throw an error when [ property ] is not valid', function () {
            function Plugin () {
                this.type = 'test';
                this.name = 'something';
            }
            DataObject.registerPlugin(Plugin);
            try {
                util.getPluginProperty('test', 'something', 'whereAreYou');
                expect(true, 'Exception should have been thrown').to.be.false;
            } catch (error) {
                expect(error).to.be.an.instanceOf(Error);
                expect(error.message).to.equal('DataObject.Utility.prototype.getPluginProperty(): Plugin [ something ] of type [ test ] has no property ' +
                '[ whereAreYou ].');
            }
        });
    });

    describe('type plugin defaults', function () {
        beforeEach(function () {
            DataObject.setDefinition(ChildClass, {});
            util = new ChildClass().initialize()['#util'];
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

                it('should get a transaction set the value on it then commit it', function () {
                    var tx = {
                        data : {},
                        commit : sinon.stub()
                    };
                    sinon.stub(util, 'getTransaction').returns(tx);
                    obj.name = 'Dent';
                    expect(util.getTransaction.callCount).to.equal(1);
                    expect(tx.commit.callCount).to.equal(1);
                    expect(tx.data).to.deep.equal({name : 'Dent'});
                    util.getTransaction.restore();
                });
            });
        });
    });

    describe('.getTransaction', function () {
        beforeEach(function () {
            obj = {someData : 'value'};
            util = new DataObject.Utility(obj, {});
        });

        it('should return a DataObject.Transaction object with this set on it', function () {
            tx = util.getTransaction();
            expect(tx).to.be.an.instanceof(DataObject.Utility.Transaction);
            expect(tx.obj).to.equal(obj);
        });
    });

    describe('.commitTransaction', function () {
        var persistDeferred, promise;
        beforeEach(function () {
            persistDeferred = Q.defer();
            util = new DataObject.Utility(obj, {
                db : {
                    persist: sinon.stub().returns(persistDeferred.promise)
                }
            });
            tx = util.getTransaction();
        });

        it('should add the passed transaction and a deferred object to the end of [ toPersist ]', function () {
            util.toPersist.push({tx : {}});
            util.commitTransaction(tx);
            expect(util.toPersist).to.have.length(2);
            expect(util.toPersist[1].tx).to.equal(tx);
            expect(Q.isPromise(util.toPersist[1].deferred.promise)).to.be.true;
        });

        it('should return a promise', function () {
            expect(Q.isPromise(util.commitTransaction(tx))).to.be.true;
        });

        it('should call [ db.persist() ] with the transaction', function () {
            util.commitTransaction(tx);
            expect(util.db.persist.callCount).to.equal(1);
            expect(util.db.persist.firstCall.args).to.deep.equal([tx]);
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
                util.db.persist.onCall(0).returns(persistDeferred[0].promise);
                tx.push(util.getTransaction());

                persistDeferred.push(Q.defer());
                util.db.persist.onCall(1).returns(persistDeferred[1].promise);
                tx.push(util.getTransaction());

                promise.push(util.commitTransaction(tx[0]));
                promise.push(util.commitTransaction(tx[1]));

                promise[0].then(function () {
                    function wait () {
                        if (util.db.persist.callCount < 2) {
                            setImmediate(wait);
                        } else {
                            persistDeferred[1].resolve();
                        }
                    }
                    wait();
                }).done();

                promise[1].then(function () {
                    expect(util.db.persist.callCount).to.equal(2);
                }).done(done);

                expect(util.db.persist.callCount).to.equal(1);
                persistDeferred[0].resolve();
            });

            it('should call [ db.persist() ] for each transaction serially even when some are failed', function (done) {
                persistDeferred.push(Q.defer());
                util.db.persist.onCall(0).returns(persistDeferred[0].promise);
                tx.push(util.getTransaction());

                persistDeferred.push(Q.defer());
                util.db.persist.onCall(1).returns(persistDeferred[1].promise);
                tx.push(util.getTransaction());

                persistDeferred.push(Q.defer());
                util.db.persist.onCall(2).returns(persistDeferred[2].promise);
                tx.push(util.getTransaction());

                promise.push(util.commitTransaction(tx[0]));
                promise.push(util.commitTransaction(tx[1]));

                promise[0].then(function () {
                    function wait () {
                        if (util.db.persist.callCount < 2) {
                            setImmediate(wait);
                        } else {
                            promise.push(util.commitTransaction(tx[2]));
                            promise[2].then(function () {
                                expect(util.db.persist.callCount).to.equal(3);
                                expect(util.persistenceErrors).to.deep.equal(['The middle one failed.']);
                            }).done(done);
                            persistDeferred[1].reject('The middle one failed.');
                        }
                    }
                    wait();
                }).done();

                promise[1].fail(function (reason) {
                    expect(reason).to.equal('The middle one failed.');
                    function wait () {
                        if (util.db.persist.callCount < 3) {
                            setImmediate(wait);
                        } else {
                            persistDeferred[2].resolve();
                        }
                    }
                    wait();
                }).done();

                expect(util.db.persist.callCount).to.equal(1);
                persistDeferred[0].resolve();
            });
        });
    });

    describe('.isPersistencePending', function () {
        beforeEach(function () {
            util = new DataObject.Utility(obj, {
                db : {
                    persist: sinon.stub().returns(Q.defer().promise)
                }
            });
        });

        describe('when the object is already fully persisted', function () {
            it('should return false', function () {
                expect(util.isPersistencePending()).to.be.false;
            });
        });

        describe('when the object is currently persisting', function () {
            beforeEach(function () {
                util.getTransaction().commit();
            });

            it('should return false', function () {
                expect(util.isPersistencePending()).to.be.true;
            });
        });
    });

    describe('.whenFullyPersisted', function () {
        var persistDeferred;
        beforeEach(function () {
            persistDeferred = Q.defer();
            util = new DataObject.Utility(obj, {
                db : {
                    persist: sinon.stub().returns(persistDeferred.promise)
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
                    util.persistenceErrors.push('An error happened.', 'Another error happened.');
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
                        expect(util.persistenceErrors).to.have.length(0);
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
            beforeEach(function () {
                util.getTransaction().commit();
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
