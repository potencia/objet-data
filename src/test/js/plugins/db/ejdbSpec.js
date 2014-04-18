'use strict';

var expect = require('chai').expect,
sinon = require('sinon'),
EJDB = require('ejdb'),
Q = require('q'),
plugin = new (require('../../../../main/js/plugins/db/ejdb'))();

describe('db plugin: ejdb', function () {
    var db, jb;
    it('should have an [ open ] function', function () {
        expect(plugin).to.have.property('open');
        expect(plugin.open).to.be.a('function');
    });

    it('should have an [ close ] function', function () {
        expect(plugin).to.have.property('close');
        expect(plugin.close).to.be.a('function');
    });

    describe('.open()', function () {
        beforeEach(function () {
            sinon.stub(EJDB, 'open');
            db = {
                config : {
                    dbFile : 'dbFileValue'
                },
                '#state' : {}
            };
        });

        afterEach(function () {
            EJDB.open.restore();
        });

        it('should return a promise', function () {
            expect(Q.isPromise(plugin.open(db))).to.be.true;
        });

        it('should call EJDB.open() using the db\'s config', function (done) {
            plugin.open(db)
            .then(function () {
                expect(EJDB.open.callCount).to.equal(1);
                expect(EJDB.open.firstCall.args).to.deep.equal(['dbFileValue', EJDB.JBOWRITER | EJDB.JBOCREAT]);
            })
            .done(done);
        });

        it('should default openMode to JBOWRITER | JBOCREAT', function (done) {
            plugin.open(db)
            .then(function () {
                expect(EJDB.open.callCount).to.equal(1);
                expect(EJDB.open.firstCall.args).to.deep.equal(['dbFileValue', EJDB.JBOWRITER | EJDB.JBOCREAT]);
            })
            .done(done);
        });

        it('should set openMode according to the config object', function (done) {
            function withOpenMode(like) {
                return {
                    config : {
                        openMode : like
                    },
                    '#state' : {}
                };
            }

            plugin.open(withOpenMode({reader : true}))
            .then(function () {
                expect(EJDB.open.lastCall.args[1]).to.equal(EJDB.JBOREADER);
                return plugin.open(withOpenMode({writer : true}));
            })
            .then(function () {
                expect(EJDB.open.lastCall.args[1]).to.equal(EJDB.JBOWRITER);
                return plugin.open(withOpenMode({create : true}));
            })
            .then(function () {
                expect(EJDB.open.lastCall.args[1]).to.equal(EJDB.JBOCREAT);
                return plugin.open(withOpenMode({truncate : true}));
            })
            .then(function () {
                expect(EJDB.open.lastCall.args[1]).to.equal(EJDB.JBOTRUNC);
                return plugin.open(withOpenMode({
                    reader : false,
                    writer : true,
                    create : 'foo',
                    truncate : true
                }));
            })
            .then(function () {
                expect(EJDB.open.lastCall.args[1]).to.equal(EJDB.JBOWRITER | EJDB.JBOTRUNC);
            })
            .done(done);
        });

        it('should add the [ jb ] property to the database\'s #state', function (done) {
            EJDB.open.returns({obj : 'opened database'});
            plugin.open(db)
            .then(function () {
                expect(db['#state'].jb).to.deep.equal({obj : 'opened database'});
            })
            .done(done);
        });

        it('should not resolve with a value upon success', function (done) {
            EJDB.open.returns({obj : 'opened database'});
            plugin.open(db)
            .then(function (result) {
                expect(result).to.be.undefined;
            })
            .done(done);
        });

        it('should reject when EJDB.open throws an error', function (done) {
            EJDB.open.throws({message : 'Oops!'});
            plugin.open(db)
            .then(function () {
                expect(false, 'Should have failed.').to.be.true;
            }, function (reason) {
                expect(reason).to.deep.equal({message : 'Oops!'});
            })
            .done(done);
        });

        describe('added method', function () {
            beforeEach(function (done) {
                jb = {
                    findOne : sinon.stub(),
                    save : sinon.stub()
                };
                EJDB.open.returns(jb);
                plugin.open(db).done(done);
            });

            describe('.findOne()', function () {
                it('should be a special property', function () {
                    var descriptor = Object.getOwnPropertyDescriptor(db, 'findOne');
                    expect(descriptor.writable).to.be.false;
                    expect(descriptor.enumerable).to.be.false;
                    expect(descriptor.configurable).to.be.false;
                });

                it('should return a promise', function () {
                    expect(Q.isPromise(db.findOne())).to.be.true;
                });

                it('should call jb.findOne on jb with up to four arguments and no callback', function (done) {
                    expect(jb.findOne.called).to.be.false;
                    db.findOne(function () {})
                    .then(function () {
                        expect(jb.findOne.lastCall.args).to.deep.equal([]);
                        return db.findOne('collectionName', function () {});
                    })
                    .then(function () {
                        expect(jb.findOne.lastCall.args).to.deep.equal(['collectionName']);
                        return db.findOne('collectionName', {name : 'queryObj'}, function () {});
                    })
                    .then(function () {
                        expect(jb.findOne.lastCall.args).to.deep.equal(['collectionName', {name : 'queryObj'}]);
                        return db.findOne('collectionName', {name : 'queryObj'}, ['orArray'], function () {});
                    })
                    .then(function () {
                        expect(jb.findOne.lastCall.args).to.deep.equal(['collectionName', {name : 'queryObj'}, ['orArray']]);
                        return db.findOne('collectionName', {name : 'queryObj'}, ['orArray'], {name : 'hints'}, function () {});
                    })
                    .then(function () {
                        expect(jb.findOne.lastCall.args).to.deep.equal(['collectionName', {name : 'queryObj'}, ['orArray'], {name : 'hints'}]);
                        return db.findOne('collectionName', {name : 'queryObj'}, ['orArray'], {name : 'hints'}, 42);
                    })
                    .then(function () {
                        expect(jb.findOne.lastCall.args).to.deep.equal(['collectionName', {name : 'queryObj'}, ['orArray'], {name : 'hints'}]);
                        return db.findOne('collectionName', {name : 'queryObj'}, null, {name : 'hints'}, function () {}, null);
                    })
                    .then(function () {
                        expect(jb.findOne.lastCall.args).to.deep.equal(['collectionName', {name : 'queryObj'}, null, {name : 'hints'}]);
                        expect(jb.findOne.alwaysCalledOn(jb)).to.equal(true);
                        expect(jb.findOne.callCount).to.equal(7);
                    })
                    .done(done);
                });

                it('should resolve with the resulting value upon success', function (done) {
                    jb.findOne.returns({name : 'value'});
                    db.findOne('collectionName')
                    .then(function (result) {
                        expect(result).to.deep.equal({name : 'value'});
                    })
                    .done(done);
                });

                it('should reject with the resulting reason upon failure', function (done) {
                    jb.findOne.throws({message : 'What!'});
                    db.findOne('collectionName')
                    .then(function () {
                        expect(false, 'Should have failed.').to.be.true;
                    }, function (reason) {
                        expect(reason).to.deep.equal({message : 'What!'});
                    })
                    .done(done);
                });
            });

            describe('.save()', function () {
                it('should be a special property', function () {
                    var descriptor = Object.getOwnPropertyDescriptor(db, 'save');
                    expect(descriptor.writable).to.be.false;
                    expect(descriptor.enumerable).to.be.false;
                    expect(descriptor.configurable).to.be.false;
                });

                it('should return a promise', function () {
                    expect(Q.isPromise(db.save())).to.be.true;
                });

                it('should call jb.save on jb with up to two arguments and no callback', function (done) {
                    expect(jb.save.called).to.be.false;
                    db.save(function () {})
                    .then(function () {
                        expect(jb.save.lastCall.args).to.deep.equal([]);
                        return db.save('collectionName');
                    })
                    .then(function () {
                        expect(jb.save.lastCall.args).to.deep.equal(['collectionName']);
                        return db.save('collectionName', ['jsArray']);
                    })
                    .then(function () {
                        expect(jb.save.lastCall.args).to.deep.equal(['collectionName', ['jsArray']]);
                        return db.save('collectionName', ['jsArray'], {name : 'queryObj'});
                    })
                    .then(function () {
                        expect(jb.save.lastCall.args).to.deep.equal(['collectionName', ['jsArray']]);
                        return db.save(null, ['jsArray']);
                    })
                    .then(function () {
                        expect(jb.save.lastCall.args).to.deep.equal([null, ['jsArray']]);
                        expect(jb.save.alwaysCalledOn(jb)).to.equal(true);
                        expect(jb.save.callCount).to.equal(5);
                    })
                    .done(done);
                });

                it('should resolve with the resulting value upon success', function (done) {
                    jb.save.returns({name : 'value'});
                    db.save('collectionName')
                    .then(function (result) {
                        expect(result).to.deep.equal({name : 'value'});
                    })
                    .done(done);
                });

                it('should reject with the resulting reason upon failure', function (done) {
                    jb.save.throws({message : 'What!'});
                    db.save('collectionName')
                    .then(function () {
                        expect(false, 'Should have failed.').to.be.true;
                    }, function (reason) {
                        expect(reason).to.deep.equal({message : 'What!'});
                    })
                    .done(done);
                });
            });
        });
    });

    describe('.close()', function () {
        beforeEach(function () {
            jb = {
                close : sinon.stub()
            };
            db = {
                '#state' : {
                    jb : jb
                }
            };
        });

        it('should call jb.close on jb with no arguments', function (done) {
            plugin.close(db)
            .then(function () {
                expect(jb.close.lastCall.args).to.have.length(0);
                expect(jb.close.alwaysCalledOn(jb));
                expect(jb.close.callCount).to.equal(1);
            })
            .done(done);
        });

        it('should resolve with the resulting value upon success', function (done) {
            jb.close.returns(0);
            plugin.close(db)
            .then(function (result) {
                expect(result).to.equal(0);
            })
            .done(done);
        });

        it('should reject with the resulting reason upon failure', function (done) {
            jb.close.throws({message : 'Not gonna do it! Not gonna do it!'});
            plugin.close(db)
            .then(function () {
                expect(false, 'Should have failed.').to.be.true;
            },function (reason) {
                expect(reason).to.deep.equal({message : 'Not gonna do it! Not gonna do it!'});
            })
            .done(done);
        });
    });

    describe('.persist', function () {
        var tx, jb;
        beforeEach(function () {
            jb = {
                save : sinon.stub()
            };
            db = {
                '#state' : {
                    jb : jb
                }
            };
            tx = {
                obj : {
                    '#util' : {
                        collection : 'testCollection'
                    }
                }
            };
        });

        it('should return a promise', function () {
            expect(Q.isPromise(plugin.persist(db, tx))).to.be.true;
        });

        describe('when obj has no id set', function () {
            beforeEach(function () {
                jb.save.returns([{_id : 'testId', foo : 'bar', bar : 'baz'}]);
                tx.data = {
                    foo : 'bar',
                    bar : 'baz'
                };
            });

            it('should call EJDB.prototype.save() using the obj\'s collection and the transaction\'s data', function (done) {
                plugin.persist(db, tx)
                .then(function (result) {
                    expect(result).to.deep.equal([{_id : 'testId', foo : 'bar', bar : 'baz'}]);
                    expect(jb.save.callCount).to.equal(1);
                    expect(jb.save.firstCall.args).to.deep.equal(['testCollection', {foo : 'bar', bar : 'baz'}]);
                })
                .done(done);
            });

            it('should set the returned oid as the id on the object', function (done) {
                plugin.persist(db, tx)
                .then(function () {
                    expect(tx.obj['#util'].id).to.equal('testId');
                })
                .done(done);
            });
        });
    });
});
