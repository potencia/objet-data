'use strict';

var gulp = require('gulp'),
gutil = require('gulp-util'),
mocha = require('gulp-mocha'),
istanbul = require('gulp-istanbul'),
bddGen = require('bdd-gen').forGulp,
cat = require('gulp-cat'),
files = {
    main : {
        js : {
            all : 'src/main/js/**/*.js'
        }
    },
    test : {
        js : {
            spec : {
                all : 'src/test/js/**/*Spec.js'
            }
        },
        gen : 'src/test/gen'
    }
};

gulp.task('test', function () {
    gulp.src(files.test.js.spec.all)
    .pipe(mocha({reporter : gutil.env.reporter || 'min'}))
    .on('error', function (error) {
        gutil.log(gutil.colors.red(error.message));
    });
});

gulp.task('coverage', function (done) {
    gulp.src(files.main.js.all)
    .pipe(istanbul())
    .on('end', function () {
        gulp.src(files.test.js.spec.all)
        .pipe(mocha({reporter : gutil.env.reporter || 'min'}))
        .on('error', function (error) {
            gutil.log(gutil.colors.red(error.message));
        })
        .pipe(istanbul.writeReports('./target/coverage'))
        .on('end', done);
    });
});

gulp.task('watch.test', function () {
    gulp.watch([files.main.js.all, files.test.js.spec.all], ['test']);
});

gulp.task('watch.coverage', function () {
    gulp.watch([files.main.js.all, files.test.js.spec.all], ['coverage']);
});

function setupBddGen (bddGen) {
    var mapping = {
        t : {txt : '.to'},
        b : {txt : '.be'},
        u : {txt : '.true'},
        f : {txt : '.false'},
        h : {txt : '.have'},
        a : {txt : '.a', val : function (out, val) {out.txt('(').str(val).txt(')');}},
        i : {txt : '.instanceof', val : function (out, val) {out.txt('(').txt(val).txt(')');}},
        n : {txt : '.an', val : function (out, val) {out.txt('(').str(val).txt(')');}},
        e : {txt : '.equal', val : function (out, val) {out.txt('(').str(val).txt(')');}},
        q : {txt : '.equal', val : function (out, val) {out.txt('(').txt(val).txt(')');}},
        l : {txt : '.length', val : function (out, val) {out.txt('(').txt(val).txt(')');}},
        p : {txt : '.property', val : function (out, val) {out.txt('(').str(val).txt(')');}}
    };
    bddGen.standardOperators();
    bddGen.standardCommands();
    bddGen.registerCommand('e', function (out, actual, expected, value) {
        out.indent()
        .txt('expect(')
        .txt(actual)
        .txt(')');
        if (expected) {
            var exp = expected.split(''), last = exp.slice(-1)[0];
            exp.forEach(function (letter) {
                if (mapping[letter]) {
                    out.txt(mapping[letter].txt);
                }
            });
            if (value && mapping[last] && mapping[last].val) {
                mapping[last].val(out, value);
            }
        }
        out.txt(';').lf();
    });
    bddGen.registerCommand('be', function (out) {
        out.ln('beforeEach(function () {').t().lf().ln('});');
    });
}

gulp.task('gen', function () {
    gulp.watch(files.test.gen, function () {
        gulp.src(files.test.gen)
        .pipe(bddGen(setupBddGen))
        .on('error', function (error) {
            gutil.log(error.message);
        })
        .pipe(cat())
    });
});
