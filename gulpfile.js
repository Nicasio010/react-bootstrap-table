var gulp = require('gulp');
var browserify = require('browserify');
var watchify = require('watchify');
var source = require("vinyl-source-stream");
var babel = require('gulp-babel');
var concatCss = require('gulp-concat-css');
var cssmin = require('gulp-cssmin');
var del = require('del');
var shell = require('gulp-shell');

var webpack = require('webpack');
var WebpackDevServer = require('webpack-dev-server');
// webpack config to build and serve examples
var exampleConfig = require('./webpack.example.config');
// webpack config to build umd bundle
var umdConfig = require('./webpack.umd.config');

var watching = false;
var demo = false;


gulp.task('default', ['prod']);

gulp.task('clean', function() {
  return del([
    './dist/*',
    './lib/**'
  ]);
})

//------------
// PROD
// -----------
gulp.task('prod', ['umdBuild'], function() {
  // - Use gulp-babel to transpile each file for ppl who use webpack/browserify
  // - This will be the package.json entry point
  // - Most of the ppl will use this, and should use their own source maps when bundling,
  // as well as uglify in production.
  // - This is the way React itself distributes their package,
  // as well as other libraries like react-boostrap
  gulp.src(['./src/**/*.js', './src/*js'])
    .pipe(babel())
    .pipe(gulp.dest('./lib'));
  // build the css
  gulp.src('./css/react-bootstrap-table.css')
    .pipe(concatCss("./react-bootstrap-table.min.css"))
    .pipe(cssmin())
    .pipe(gulp.dest('./css'));
  gulp.src(['./css/react-bootstrap-table.css', './css/toastr.css'])
    .pipe(concatCss('./react-bootstrap-table-all.min.css'))
    .pipe(cssmin())
    .pipe(gulp.dest('./css'));
});

// build umd bundles for https://npmcdn.com/ and for browser <script> tag
gulp.task('umdBuild', ['clean'], shell.task([
  'webpack --config webpack.umd.config.js',
  'webpack --config webpack.umd.min.config.js'
]));

function buildProdDist(configLocation) {
  // Give up the browserify to build product, cause of #131, change to webpack instead
  // demo = false;
  // browserifing("./src/index.js", "react-bootstrap-table.min.js", "./dist");
  var config = require(configLocation);
  var compiler = webpack(config);

  compiler.run(function(err, stats) {
    var jsonStats = stats.toJson();
    var valid = true;
    if (stats.hasErrors()) {
      valid = false;
      console.log('Errors:', jsonStats.errors.join('\n'));
    }

    if (stats.hasWarnings()) {
      console.log('Warnings:', jsonStats.warnings.join('\n'));
    }

    if (null != err) {
      valid = false;
      console.error(err);
    }
    if (valid)
      console.log("Success building distribution from " + configLocation);
  });
}

//------------
// EXAMPLES
// -----------
gulp.task('example-server', function() {

  new WebpackDevServer(webpack(config), {
    publicPath: config.serverConfig.publicPath,
    contentBase: config.serverConfig.contentBase,
    hot: true,
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    historyApiFallback: true
  }).listen(config.serverConfig.port, 'localhost', function(err, result) {
    if (err) {
      console.log(err);
    }

    console.log('Listening at localhost:3004');
  });

});

//------------
// DEMO
// -----------
gulp.task("dev", function() {
  watching = true;
  buildDemoCode();
});

function buildDemoCode() {
  demo = true;
  browserifing("./demo/js/demo.js", "demo.bundle.js", "./demo/js");
}

function browserifing(main, bundleName, dest) {
  var b = browserify({
    entries: [main],
    transform: ["babelify"],
    cache: {},
    debug: true,
    packageCache: {},
    fullPaths: true,
  });

  if (demo)
    b = b.require(require.resolve('./src/index.js'), {
      expose: 'react-bootstrap-table'
    });

  if (watching) {
    b = watchify(b);
    b.on('update', function() {
      bundle(b, bundleName, dest);
    });
  }
  bundle(b, bundleName, dest);
}

function bundle(b, bundleName, dest) {
  b.bundle()
    .on('error', function(err) {
      console.log(err.message);
    })
    .on('end', function() {
      console.log("building success.");
    })
    .pipe(source(bundleName))
    .pipe(gulp.dest(dest));
}
