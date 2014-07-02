'use strict';

var constants = require('./constants'),
Q = require('q'),
P = constants.P,
fn;

function Queue () {
    Object.defineProperty(this, P, {
        enumerable : false,
        configurable : false,
        writable : false,
        value : {
            running : false,
            queue : [],
            globalContext : {}
        }
    });
}

Queue.Item = function () {};

fn = {
    onResolve : function (result) { this.resolve(result); },
    onReject : function (reason) { this.reject(reason); },
    onDone : function () { setImmediate(function () { this.next(this.queue);}.bind(this)); },
    resolve : function () { this.resolve.apply(this, arguments); },
    reject : function () { this.reject.apply(this, arguments); },
    filter : function (key) { return key !== 'deferred'; },
    copy : function (key) { this.ctx[key] = this.source[key]; }
};

function _next (queue) {
    var ctx, deferred, current = queue[P].queue.shift();
    if (current) {
        ctx = {};
        deferred = Q.defer();

        Object.keys(current).filter(fn.filter).forEach(fn.copy, {ctx : ctx, source : current});
        Object.keys(queue[P].globalContext).forEach(fn.copy, {ctx : ctx, source : queue[P].globalContext});

        ctx.resolve = fn.resolve.bind(deferred);
        ctx.reject = fn.reject.bind(deferred);

        deferred.promise
        .then(fn.onResolve.bind(current.deferred), fn.onReject.bind(current.deferred))
        .done(fn.onDone.bind({next : _next, queue : queue}));

        current.run.call(ctx);
    } else {
        queue[P].running = false;
        if (Object.prototype.toString.call(queue.drained) === '[object Function]') {
            queue.drained();
        }
    }
}

function _run (queue) {
    if (!queue[P].running) {
        queue[P].running = true;
        if (Object.prototype.toString.call(queue.prepare) === '[object Function]') {
            var deferred = Q.defer(), ctx = {
                resolve : fn.resolve.bind(deferred),
                context : queue[P].globalContext
            };
            queue.prepare.call(ctx);
            deferred.promise
            .then(function () {
                _next(queue);
            });
        } else {
            _next(queue);
        }
    }
}

Queue.prototype.add = function (item) {
    if (item instanceof Queue.Item && Object.prototype.toString.call(item.run) === '[object Function]') {
        item.deferred = Q.defer();
        this[P].queue.push(item);
        _run(this);
        return item.deferred.promise;
    }
    return undefined;
};

Queue.prototype.isRunning = function () {
    return this[P].running;
};

module.exports = Queue;
