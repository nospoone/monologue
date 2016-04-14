const path = require('path');
const del = require('del');
const gulp = require('gulp');
const jade = require('gulp-jade');
const less = require('gulp-less');

const jadeWatchPath = path.resolve('./views/source/**/*.jade');
const lessWatchPath = path.resolve('./css/source/**/*.less');

const jadeOutputPath = path.resolve('./views/source');
const lessOutputPath = path.resolve('./css/source');

gulp.task('jade:main', () => {
	return gulp.src(path.resolve(jadeOutputPath, 'index.jade'))
			.pipe(jade())
			.pipe(gulp.dest(path.resolve(jadeOutputPath, '..')));
});

gulp.task('less:main', () => {
	return gulp.src(path.resolve(lessOutputPath, 'master.less'))
			.pipe(less())
			.pipe(gulp.dest(path.resolve(lessOutputPath, '..')));
});

gulp.task('jade:editor', () => {
	return gulp.src(path.resolve(jadeOutputPath, 'editor.jade'))
			.pipe(jade())
			.pipe(gulp.dest(path.resolve(jadeOutputPath, '..')));
});

gulp.task('less:editor', () => {
	return gulp.src(path.resolve(lessOutputPath, 'editor.less'))
			.pipe(less())
			.pipe(gulp.dest(path.resolve(lessOutputPath, '..')));
});

gulp.task('less', ['less:main', 'less:editor']);
gulp.task('jade', ['jade:main', 'jade:editor']);

gulp.task('watch', () => {
	gulp.watch([jadeWatchPath], ['jade']);
	gulp.watch([lessWatchPath], ['less']);
});
