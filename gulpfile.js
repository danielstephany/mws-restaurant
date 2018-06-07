'use strict'

const gulp = require('gulp');
const rename = require('gulp-rename'); //used to rename files
const sass = require('gulp-sass');	//used to compile sass
const maps = require('gulp-sourcemaps'); //used to make sourcemaps files for js, css, scss,less
const cssnano = require('gulp-cssnano'); // used to minify css
const del = require('del'); // used to delete files for clean up
const autoprefixer = require('gulp-autoprefixer'); //used to auto add vendor prefixes to css
const browserSync = require('browser-sync'); //reloads browser after saving a change to a file
const prettify = require('gulp-prettify'); //properly indents html files

// for autoprefixer
var supported = [
    'last 5 versions',
    'safari >= 8',
    'ie >= 11',
    'ff >= 20',
    'ios 6',
    'android 4'
];


// gets html filses, prettifys them, and places them in dist
gulp.task('getHTML', function () {
    return gulp.src('src/**/*.html')
    .pipe(prettify())
    .pipe(gulp.dest('./dist'))    
    .pipe(browserSync.stream());
});

// update sw.js in dist
gulp.task('getSw', function () {
    return gulp.src('src/sw.js')
        .pipe(gulp.dest('./dist'))
        .pipe(browserSync.stream());
});

// gets js filses and places them in dist
gulp.task('getScripts', function () {
    return gulp.src('src/assets/js/**')
        .pipe(gulp.dest('./dist/assets/js'))
        .pipe(browserSync.stream());
});

// compiles sass from scss/main.scss to main.css
// adds prefixes with auto prefixer to css 
// minifies css to main.min.css
// writes source maps
// places both in dist/css
gulp.task('compileScss', function() {
	return gulp.src('./src/assets/scss/main.scss')
	.pipe(maps.init())
    .pipe(sass())
	.pipe(autoprefixer( {browsers: supported, add: true}))
	.pipe(maps.write('./'))
	.pipe(gulp.dest('./dist/assets/css'))
    
});

gulp.task("reload-scss", ["compileScss"], function(){
    return gulp.src("/").pipe(browserSync.reload({
        stream: true
    }));
});

//this task does the same as minifyCss minus sourcemaps and browsersync
gulp.task('minifyCss-noMaps', function () {
    return gulp.src('src/assets/scss/main.scss')
        .pipe(sass())
        .pipe(cssnano({
            autoprefixer: { browsers: supported, add: true }
        }))
        // .pipe(rename("main.min.css"))
        .pipe(gulp.dest('./dist/assets/css'))
});

// runs the build task
// starts development server at localhost:3000
// watches html, js, and scss and runs associated tasks
gulp.task('watchFiles', ['build'], function () {
    browserSync.init({
        server: "./dist"
    });
    gulp.watch('./src/assets/scss/**/*.scss', ['reload-scss']);
    gulp.watch('./src/assets/js/**/*.js', ['getScripts']);
    gulp.watch('./src/**/*.html', ['getHTML']);
    gulp.watch('./src/sw.js', ['getSw']);
});

// deletes the dist folder and its contents 
gulp.task('clean', function () {
    del(['dist']);
});

// the build task builds the project in the dist folder by running the associated tasks  
gulp.task('build', ['compileScss'], function () {
    return gulp.src(["./src/sw.js", "./src/assets/img/**", "./src/assets/js/**", "./src/**/*.html", "./src/data/**"], { base: './src' })
        .pipe(gulp.dest('dist'));
});

// the prod task builds the project without source-maps in the dist folder by running the associated tasks  
gulp.task('prod', ['minifyCss-noMaps'], function () {
    return gulp.src(["./src/sw.js", "./src/assets/img/**", "./src/assets/css/**", "./src/assets/js/**", "./src/**/*.html", "./src/data/**"], { base: './src' })
        .pipe(gulp.dest('dist'));
});

// default task is set to start the watch listeners
gulp.task('default', ["build"], function () {
    gulp.start(['watchFiles']);
});

