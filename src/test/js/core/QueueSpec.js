'use strict';

var expect = require('chai').expect,
sinon = require('sinon'),
Q = require('q'),
Queue = require('../../../main/js/core/Queue');

describe('Queue', function () {
    var queue, item;

    function TestItem () {
        this.onrun = Q.defer();
        this.doRun = this.onrun.promise;
    }

    describe('constructor', function () {
        it('should create the [  priv ] property', function () {
            queue = new Queue();
            expect(Object.getOwnPropertyDescriptor(queue, ' priv')).to.deep.equal({
                enumerable : false,
                configurable : false,
                writable : false,
                value : {
                    running : false,
                    queue : [],
                    globalContext : {}
                }
            });
        });
    });

    describe('.add()', function () {
        var arrayPush, item1, item2, item3;
        beforeEach(function () {
            queue = new Queue();
            TestItem.prototype = new Queue.Item();
            TestItem.prototype.run = function () {
                var self = this;
                setImmediate(function () {
                    self.onrun.resolve(self);
                });
            };
            sinon.spy(TestItem.prototype, 'run');
            arrayPush = sinon.spy(queue[' priv'].queue, 'push');
        });

        it('should add the passed subclass of Queue.Item to [  priv.queue ]', function () {
            queue.add(new TestItem());
            expect(arrayPush.callCount).to.equal(1);
        });

        it('should create a new [ deferred ] and add it to the item', function () {
            item = new TestItem();
            expect(item).to.not.have.property('deferred');
            queue.add(item);
            expect(item).to.have.property('deferred');
        });

        it('should return the promise from the deferred that was added to the item', function () {
            item = new TestItem();
            expect(queue.add(item)).to.equal(item.deferred.promise);
        });

        describe('when the passed subclass of Queue.Item does not have a [ .run() ] method', function () {
            beforeEach(function () {
                delete TestItem.prototype.run;
            });

            it('should NOT add the passed item to [  priv.queue ]', function () {
                queue.add(new TestItem());
                expect(arrayPush.callCount).to.equal(0);
            });

            it('should NOT create a new [ deferred ] on the passed item', function () {
                item = new TestItem();
                queue.add(item);
                expect(item).to.not.have.property('deferred');
            });

            it('should return undefined', function () {
                item = new TestItem();
                expect(queue.add(item)).to.be.undefined;
            });
        });

        describe('when the passed value is not a subclass of Queue.Item', function () {
            beforeEach(function () {
                item = true;
            });

            it('should NOT add the passed value to [  priv.queue ]', function () {
                queue.add(item);
                expect(arrayPush.callCount).to.equal(0);
            });

            it('should NOT create a new [ deferred ] on the passed value', function () {
                queue.add(item);
                expect(item).to.not.have.property('deferred');
            });

            it('should return undefined', function () {
                expect(queue.add(item)).to.be.undefined;
            });
        });

        describe('when not previously running', function () {
            it('should start running the queue', function () {
                item = new TestItem();
                queue.add(item);
                expect(queue[' priv'].running).to.be.true;
            });

            it('should call [ .run() ]', function () {
                item = new TestItem();
                item.test = true;
                queue.add(item);
                expect(item.run.callCount).to.equal(1);
                expect(item.run.firstCall.args).to.have.length(0);
            });
        });

        describe('when already running', function () {
            beforeEach(function () {
                item1 = new TestItem();
                queue.add(item1);
                TestItem.prototype.run.reset();
            });

            it('should continue running the queue', function () {
                queue.add(new TestItem());
                expect(queue[' priv'].running).to.be.true;
            });

            it('should NOT call [ .run() ] on the newly added Queue.Item immediately', function () {
                queue.add(new TestItem());
                expect(TestItem.prototype.run.callCount).to.equal(0);
            });

            it('should return to non-running state when all items have been run', function (done) {
                item2 = new TestItem();
                item3 = new TestItem();
                queue.add(item2);
                queue.add(item3);
                queue.drained = function () {
                    expect(queue[' priv'].running).to.be.false;
                    done();
                };

                item1.doRun.then(function (runCtx) { runCtx.resolve(); });

                item2.doRun.then(function (runCtx) { runCtx.resolve(); });

                item3.doRun.then(function (runCtx) { runCtx.resolve(); });
            });
        });

        describe('.prepare()', function () {
            it('should NOT be mandatory', function () {
                queue.add(item1);
            });

            describe('when defined', function () {
                var prepareCalled;
                beforeEach(function () {
                    prepareCalled = [];
                    queue.prepare = function () {
                        var prepareDeferred = Q.defer();
                        prepareCalled.push(prepareDeferred.promise);
                        prepareDeferred.resolve(this);
                    };
                    sinon.spy(queue, 'prepare');
                });

                it('should be called once before each run', function (done) {
                    item1 = new TestItem();
                    item2 = new TestItem();
                    item3 = new TestItem();
                    queue.add(item1);
                    queue.add(item2);
                    queue.add(item3);
                    prepareCalled.shift()
                    .then(function (prepareCtx) {
                        prepareCtx.resolve();
                    });
                    queue.drained = function () {
                        queue.add(item1);
                        prepareCalled.shift().then(function (prepareCtx) { prepareCtx.resolve(); });
                        queue.add(item2);
                        queue.add(item3);
                    };
                    item1.doRun.then(function (runCtx) {
                        expect(queue.prepare.callCount).to.equal(1);
                        runCtx.resolve();
                    });
                    item2.doRun.then(function (runCtx) {
                        runCtx.resolve();
                    });
                    item3.doRun.then(function (runCtx) {
                        expect(queue.prepare.callCount).to.equal(1);
                        runCtx.resolve();
                    });

                    item1 = new TestItem();
                    item2 = new TestItem();
                    item3 = new TestItem();
                    item1.doRun.then(function (runCtx) {
                        expect(queue.prepare.callCount).to.equal(2);
                        runCtx.resolve();
                    });
                    item2.doRun.then(function (runCtx) {
                        runCtx.resolve();
                    });
                    item3.doRun.then(function () {
                        expect(queue.prepare.callCount).to.equal(2);
                    }).done(done);
                });

                it('should be called on a context object', function () {
                    queue.add(new TestItem());
                    expect(queue.prepare.firstCall.calledOn(queue)).to.be.false;
                });

                describe('.prepare() context object', function () {
                    it('should have a [ .resolve() ] method', function (done) {
                        queue.add(new TestItem());
                        prepareCalled.shift()
                        .then(function (prepareCtx) {
                            expect(Object.prototype.toString.call(prepareCtx.resolve)).to.equal('[object Function]');
                        }).done(done);
                    });

                    it('should have a [ .context ] object which is the [ priv.globalContext ] object', function (done) {
                        queue[' priv'].globalContext = {
                            context : 'global'
                        };
                        queue.add(new TestItem());
                        prepareCalled.shift()
                        .then(function (prepareCtx) {
                            expect(prepareCtx.context).to.equal(queue[' priv'].globalContext);
                        }).done(done);
                    });
                });
            });
        });

        describe('.drained', function () {
            it('should NOT be mandatory', function () {
                delete queue.drained;
                queue.add(new TestItem());
            });

            describe('when defined', function () {
                it('should be called once each time the queue is drained', function (done) {
                    var order = [];
                    item1 = new TestItem();
                    item1.which = 1;
                    item2 = new TestItem();
                    item2.which = 2;
                    item3 = new TestItem();
                    item3.which = 3;
                    queue.add(item1);
                    queue.add(item2);
                    queue.add(item3);
                    item1.doRun.then(function (runCtx) {
                        order.push(runCtx.which);
                        runCtx.resolve();
                    });

                    item2.doRun.then(function (runCtx) {
                        order.push(runCtx.which);
                        runCtx.resolve();
                    });

                    item3.doRun.then(function (runCtx) {
                        order.push(runCtx.which);
                        runCtx.resolve();
                    });
                    queue.drained = function () {
                        order.push('drained');
                        queue.drained = function () {
                            expect(order).to.deep.equal([1, 2, 3, 'drained', 1, 2, 3]);
                            done();
                        };
                        item1 = new TestItem();
                        item1.which = 1;
                        item2 = new TestItem();
                        item2.which = 2;
                        item3 = new TestItem();
                        item3.which = 3;
                        queue.add(item1);
                        queue.add(item2);
                        queue.add(item3);
                        item1.doRun.then(function (runCtx) {
                            order.push(runCtx.which);
                            runCtx.resolve();
                        });

                        item2.doRun.then(function (runCtx) {
                            order.push(runCtx.which);
                            runCtx.resolve();
                        });
                        item3.doRun.then(function (runCtx) {
                            order.push(runCtx.which);
                            runCtx.resolve();
                        });
                    };
                });
            });
        });

        describe('run', function () {
            describe('.run() context object', function () {
                beforeEach(function () {
                    item = new TestItem();
                    item.answer = 42;
                    item.question = 'How... ?';
                    queue[' priv'].globalContext.important = 'information';
                    queue.add(item);
                });

                it('should not be the item', function (done) {
                    item.doRun
                    .then(function (runCtx) {
                        expect(runCtx).to.not.equal(item);
                    }).done(done);
                });

                it('should have a [ .resolve() ] method', function (done) {
                    item.doRun
                    .then(function (runCtx) {
                        expect(Object.prototype.toString.call(runCtx.resolve)).to.equal('[object Function]');
                    }).done(done);
                });

                it('should have a [ .reject() ] method', function (done) {
                    item.doRun
                    .then(function (runCtx) {
                        expect(Object.prototype.toString.call(runCtx.reject)).to.equal('[object Function]');
                    }).done(done);
                });

                it('should have all the enumerable properties of the item and the globalContext', function (done) {
                    item.doRun
                    .then(function (runCtx) {
                        expect(runCtx).to.have.property('answer', 42);
                        expect(runCtx).to.have.property('question', 'How... ?');
                        expect(runCtx).to.have.property('important', 'information');
                        expect(Object.keys(runCtx)).to.have.length(7);
                    }).done(done);
                });

                describe('context.resolve()', function () {
                    it('should cause the deferred on the item to be resolve with the passed result', function (done) {
                        item.deferred.promise
                        .then(function (result) {
                            expect(result).to.equal('Yay!');
                        }).done(done);

                        item.doRun
                        .then(function (runCtx) {
                            runCtx.resolve('Yay!');
                        });
                    });
                });

                describe('context.reject()', function () {
                    it('should cause the deferred on the item to be rejected with the passed reason', function (done) {
                        item.deferred.promise
                        .fail(function (reason) {
                            expect(reason).to.equal('Boo!');
                        }).done(done);

                        item.doRun
                        .then(function (runCtx) {
                            runCtx.reject('Boo!');
                        });
                    });
                });
            });

            it('should call [ .run() ] on the next item after ctx.resolve() has been called', function (done) {
                item1 = new TestItem();
                item1.which = 'item one';
                item2 = new TestItem();
                item2.which = 'item two';
                queue.add(item1);
                queue.add(item2);

                item1.doRun
                .then(function (runCtx) {
                    expect(TestItem.prototype.run.callCount).to.equal(1);
                    expect(runCtx.which).to.equal('item one');
                    runCtx.resolve();
                });

                item2.doRun
                .then(function (runCtx) {
                    expect(TestItem.prototype.run.callCount).to.equal(2);
                    expect(runCtx.which).to.equal('item two');
                }).done(done);
            });

            it('should call [ .run() ] on the item in a LILO fashion', function (done) {
                var order = [];
                item1 = new TestItem();
                item1.which = 'one';
                item2 = new TestItem();
                item2.which = 'two';
                item3 = new TestItem();
                item3.which = 'three';
                queue.add(item1);
                queue.add(item2);
                queue.add(item3);

                item1.doRun
                .then(function (runCtx) {
                    order.push(runCtx.which);
                    runCtx.resolve();
                });

                item2.doRun
                .then(function (runCtx) {
                    order.push(runCtx.which);
                    runCtx.reject();
                });

                item3.doRun
                .then(function (runCtx) {
                    order.push(runCtx.which);
                    runCtx.resolve();
                    expect(order).to.deep.equal(['one', 'two', 'three']);
                }).done(done);
            });
        });
    });

    describe('.isRunning()', function () {
        it('should return the value of [  priv.running ]', function () {
            queue[' priv'].running = true;
            expect(queue.isRunning()).to.be.true;
            queue[' priv'].running = false;
            expect(queue.isRunning()).to.be.false;
        });
    });
});
