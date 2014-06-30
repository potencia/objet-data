'use strict';

var gulp = require('gulp'),
gutil = require('gulp-util'),
clean = require('gulp-clean'),
fs = require('fs'),
mocha = require('gulp-mocha'),
istanbul = require('gulp-istanbul'),
istanbulEnforcer = require('gulp-istanbul-enforcer'),
jshint = require('gulp-jshint'),
jscs = require('gulp-jscs'),
files = {
    main : {
        js : {
            all : 'src/main/js/**/*.js'
        }
    },
    test : {
        js : {
            all : 'src/test/js/**/*.js',
            spec : {
                all : 'src/test/js/**/*Spec.js'
            }
        },
        gen : 'src/test/gen'
    },
    config : {
        build : {
            jshintrc : {
                main : 'build/.jshintrc',
                test : 'build/.jshintrc-test'
            },
            jscsrc : 'build/.jscsrc'
        }
    },
    target : {
        dir : 'target',
        coverage : {
            dir : 'target/coverage'
        },
        db : {
            dir : 'target/db'
        }
    }
};

gulp.task('clean', function () {
    return gulp.src(files.target.dir, {read : false})
    .pipe(clean());
});

gulp.task('prepare', function (done) {
    function makeDbDir () { fs.mkdir(files.target.db.dir, done); }
    function checkTargetDir (exists) { if (exists) { makeDbDir(); } else { fs.mkdir(files.target.dir, makeDbDir); } }
    function checkDbDir (exists) { if (exists) { done(); } else { fs.exists(files.target.dir, checkTargetDir); } }
    fs.exists(files.target.db.dir, checkDbDir);
});

gulp.task('test', ['prepare'], function () {
    gulp.src(files.test.js.spec.all)
    .pipe(mocha({reporter : gutil.env.reporter || 'dot'}))
    .on('error', function (error) {
        gutil.log(gutil.colors.red(error.message));
    });
});

gulp.task('watch.test', function () {
    gulp.watch([files.main.js.all, files.test.js.spec.all], ['test']);
});

gulp.task('coverage', ['prepare'], function (done) {
    gulp.src(files.main.js.all)
    .pipe(istanbul())
    .on('end', function () {
        gulp.src(files.test.js.spec.all)
        .pipe(mocha({reporter : gutil.env.reporter || 'dot'}))
        .on('error', function (error) {
            gutil.log(gutil.colors.red(error.message));
        })
        .pipe(istanbul.writeReports(files.target.coverage.dir))
        .on('end', done);
    });
});

gulp.task('watch.coverage', function () {
    gulp.watch([files.main.js.all, files.test.js.spec.all], ['coverage']);
});

gulp.task('coverage.enforce', ['coverage'], function () {
    return gulp.src('.')
    .pipe(istanbulEnforcer({
        thresholds : {
            statements : 100,
            branches : 100,
            lines : 100,
            functions : 100
        },
        coverageDirectory : files.target.coverage.dir,
        rootDirectory : ''
    }));
});

gulp.task('lint.main', function () {
    return gulp.src(files.main.js.all)
    .pipe(jshint(files.config.build.jshintrc.main))
    .pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('lint.test', function () {
    return gulp.src(files.test.js.all)
    .pipe(jshint(files.config.build.jshintrc.test))
    .pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('lint', ['lint.main', 'lint.test']);

gulp.task('style', function () {
    gulp.src([files.main.js.all, files.test.js.all])
    .pipe(jscs(files.config.build.jscsrc));
});

gulp.task('quality', ['coverage.enforce', 'lint', 'style']);
