var gulp = require('gulp');
var babel = require('gulp-babel');
var sourcemaps = require('gulp-sourcemaps');
var ngAnnotate = require('gulp-ng-annotate');

gulp.task('default', function () {
  return gulp.src('src/**/*.js')
    .pipe(sourcemaps.init())
      .pipe(babel({
        presets: ['es2015']
      }))
      .pipe(ngAnnotate({
        regexp: /angular.*?\.module\(.*?\)$/
      }))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('lib'));
});
