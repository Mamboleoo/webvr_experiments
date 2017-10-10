var gulp = require('gulp');
var browserSync = require('browser-sync');

gulp.task('browserSync', function() {
    browserSync({
        server: {
            baseDir: "experiments/"
        },
        options: {
            reloadDelay: 250
        },
        notify: false
    });
});

gulp.task('default', ['browserSync']);
