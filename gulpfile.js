const path = require('path');
const gulp = require('gulp');
const jade = require('gulp-jade');
const less = require('gulp-less');

const jadeWatchPath = path.resolve('./views/source/**/*.jade');
const lessWatchPath = path.resolve('./css/source/**/*.less');

const jadeOutputPath = path.resolve('./views/source');
const lessOutputPath = path.resolve('./css/source');

gulp.task('jade', () => {
	return gulp.src(path.resolve(jadeOutputPath, '..', 'index.jade'))
			.pipe(jade())
			.pipe(gulp.dest(jadeOutputPath));
});

gulp.task('less', () => {
	return gulp.src(path.resolve(lessOutputPath, 'master.less'))
			.pipe(less())
			.pipe(gulp.dest(path.resolve(lessOutputPath, '..')));
});

gulp.task('watch', () => {
	gulp.watch([jadeWatchPath], ['jade']);
	gulp.watch([lessWatchPath], ['less']);
});
