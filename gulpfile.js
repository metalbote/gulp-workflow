const _ = require('lodash');
const argv = require('yargs').argv;
const autoprefixer = require('autoprefixer');
const babel = require('gulp-babel');
const backstopjs = require('backstopjs');
const clean = require('gulp-clean');
const cleanCss = require('gulp-clean-css');
const colors = require('ansi-colors');
// csscomb = require('gulp-csscomb'), // TODO: sort properties scss/css or use
// stylelint-order?
const eslint = require('gulp-eslint');
const execSync = require('child_process').execSync;
const file = require('gulp-file');
const flatten = require('gulp-flatten');
const fs = require('fs');
const gulp = require('gulp');
const gulpStylelint = require('gulp-stylelint');
const imagemin = require('gulp-imagemin');
const notify = require('gulp-notify');
const path = require('path');
const PluginError = require('plugin-error');
const postcss = require('gulp-postcss');
const puppeteer = require('puppeteer');
const RecolorSvg = require('gulp-recolor-svg');
const rename = require('gulp-rename');
const sass = require('gulp-sass');
const sourcemaps = require('gulp-sourcemaps');
const tildeImporter = require('node-sass-tilde-importer');
const uglify = require('gulp-uglify');
const yaml = require('js-yaml');

/** ============================================================================
 *  Defaults
 *  ==========================================================================
 * */

// Set default config, same as in gulpfile.yml.dist
let config = {
  url: 'http://localhost',
  supported_browser: [
    'Chrome >= 35',
    'Firefox >= 38',
    'Edge >= 12',
    'Explorer >= 10',
    'iOS >= 8',
    'Safari >= 8',
    'Android 2.3',
    'Android >= 4',
    'Opera >= 12'],
  fonts: {
    src: './res/fonts',
    dest: './fonts',
  },
  images: {
    src: './res/img',
    dest: './img',
    optimization: {
      svg: {
        cleanupIDs: false,
        removeViewBox: false,
        removeUselessStrokeAndFill: false,
        removeXMLProcInst: false,
      },
    },
  },
  icons: {
    normal: {
      src: './res/icons/normal',
      dest: './icons',
    },
    colorize: {
      src: './res/icons/colorize',
      dest: './icons',
      colors: {
        black: '#000',
        white: '#fff',
        primary: '#736b55',
        secondary: '#f1ead3',
        success: '#28a745',
        info: '#17a2b8',
        warning: '#ffc107',
        danger: '#dc3545',
        light: '#f8f9fa',
        dark: '#343a40',
        action: '#c3731e',
        action_hover: '#772700',
      },
    },
    png: {
      src: './res/icons/png',
      dest: './icons/png',
    },
    optimization: {
      svg: {
        cleanupIDs: false,
        removeViewBox: false,
        removeUselessStrokeAndFill: false,
        removeXMLProcInst: false,
      },
    },
  },
  stylesheets: {
    sass: {
      src: './res/scss',
      options: {
        outputStyle: 'expanded',
        precision: 10,
      },
    },
    css: {
      dest: './css',
    },
  },
  js: {
    src: './res/js',
    dest: './js',
  },
  vendors: {
    bootstrap: {
      css: false,
      js: true,
    },
    jquery: {
      css: false,
      js: true,
    },
    mdbootstrap: {
      css: false,
      js: true,
    },
    popper: {
      css: false,
      js: true,
    },
  },
  visualRegressionTest: {
    user: 'guest',
    group: 'all'
  }

};

/** ============================================================================
 *  Load config
 *  ==========================================================================
 * */

try {
  // override default config settings
  const customConfig = yaml.safeLoad(
    fs.readFileSync(
      'gulpfile.yml',
      'utf8',
    ), {json: true},
  );
  config = _.assign(config, customConfig);
}
catch (e) {
  process.stdout.write('No custom config found! Proceeding with default config only.');
}

global.config = config;

/** ============================================================================
 *  Fonts
 *  ==========================================================================
 * */

function fontsBuild() {
  return gulp.src([`${global.config.fonts.src}/**/*.*`])
    .pipe(flatten())
    .pipe(gulp.dest(global.config.fonts.dest));
}

function fontsClean() {
  return gulp.src([global.config.fonts.dest], {read: false, allowEmpty: true})
    .pipe(clean({force: true}));
}

const fonts = gulp.series(
  fontsBuild,
);

function fontsWatch() {
  gulp.watch([`${global.config.fonts.src}/**/*.{eot,ttf,woff,woff2}`], fonts);
}

exports.fonts = fonts;

/** ============================================================================
 *  Images
 *  ==========================================================================
 * */

function imagesBuild() {
  return gulp.src([`${global.config.images.src}/**/*.{jpg,jpeg,gif,png,svg,ico}`])
    .pipe(imagemin({
      progressive: true,
      interlaced: true,
      svgoPlugins: [global.config.images.optimization.svg],
    }))
    .pipe(flatten())
    .pipe(gulp.dest(global.config.images.dest));
}

function imagesClean() {
  return gulp.src([global.config.images.dest], {read: false, allowEmpty: true})
    .pipe(clean({force: true}));
}

const images = gulp.series(
  imagesBuild,
);

function imagesWatch() {
  gulp.watch([
    `${global.config.images.src}/**/*.{jpg,jpeg,gif,png,svg,ico}`,
  ], images);
}

exports.images = images;

/** ============================================================================
 *  Icons
 *  ==========================================================================
 * */

function iconsBuildColorize(done) {
  const tasks = Object.keys(global.config.icons.colorize.colors).map(
    (key) => {
      function generateColorVariants() {
        return gulp.src([`${global.config.icons.colorize.src}/**/*.svg`])
          .pipe(RecolorSvg.GenerateVariants(
            [RecolorSvg.ColorMatcher(RecolorSvg.Color('#000'))],
            [
              {
                suffix: `--${key}`,
                colors:
                  [RecolorSvg.Color(global.config.icons.colorize.colors[key])],
              }],
          ))
          .pipe(imagemin({
            progressive: true,
            interlaced: true,
            svgoPlugins: [global.config.icons.optimization.svg],
          }))
          .pipe(gulp.dest(global.config.icons.colorize.dest));
      }

      generateColorVariants.displayName = `generate_${key}_variant`;
      return generateColorVariants;
    },
  );
  return gulp.series(...tasks, (seriesDone) => {
    seriesDone();
    done();
  })();
}

function iconsBuildNormal() {
  return gulp.src([`${global.config.icons.normal.src}/**/*.svg`])
    .pipe(imagemin({
      progressive: true,
      interlaced: true,
      svgoPlugins: [global.config.icons.optimization.svg],
    }))
    .pipe(gulp.dest(global.config.icons.normal.dest));
}

function iconsBuildPng() {
  return gulp.src([`${global.config.icons.png.src}/**/*.png`])
    .pipe(imagemin({
      progressive: true,
      interlaced: true,
    }))
    .pipe(gulp.dest(global.config.icons.png.dest));
}

function iconsClean() {
  return gulp.src([
    global.config.icons.normal.dest,
    global.config.icons.colorize.dest,
    global.config.icons.png.dest,
  ], {read: false, allowEmpty: true})
    .pipe(clean({force: true}));
}

const icons = gulp.series(
  gulp.parallel(
    iconsBuildColorize,
    iconsBuildNormal,
    iconsBuildPng,
  ),
);

function iconsWatch() {
  gulp.watch([
    `${global.config.icons.colorize.src}/**/*.svg`,
    `${global.config.icons.normal.src}/**/*.svg`,
    `${global.config.icons.png.src}/**/*.png`,
  ], icons);
}

exports.icons = icons;

/** ============================================================================
 *  Styles
 *  ==========================================================================
 * */

function stylesScssBuild() {
  const plugins = [
    autoprefixer({
      overrideBrowserslist: global.config.supported_browser,
    }),
  ];
  const sassOptions = global.config.stylesheets.sass.options;
  sassOptions.includePaths = ['node_modules'];
  sassOptions.importer = tildeImporter;

  return gulp.src([`${global.config.stylesheets.sass.src}/**/*.scss`])
    .pipe(sourcemaps.init())
    .pipe(sass(sassOptions)
      .on('error', sass.logError))
    .pipe(postcss(plugins))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(global.config.stylesheets.css.dest))
    .pipe(cleanCss())
    .pipe(rename({suffix: '.min'}))
    .pipe(gulp.dest(global.config.stylesheets.css.dest));
}

function stylesCssLint() {
  return gulp.src([
    `${global.config.stylesheets.css.dest}/**/*.css`,
    `!${global.config.stylesheets.css.dest}/**/*.min.css`,
  ])
    .pipe(gulpStylelint({
      configFile: '.stylelintrc.json',
      configBasedir: 'node_modules',
      reporters: [
        {
          formatter: 'verbose',
          console: true,
        },
      ],
      fix: true,
      failAfterError: false,
    }))
    .pipe(gulp.dest(global.config.stylesheets.css.dest));
}

function stylesScssLint() {
  return gulp.src([`${global.config.stylesheets.sass.src}/**/*.scss`])
    .pipe(
      gulpStylelint({
        configFile: '.stylelintrc.scss.json',
        configBasedir: 'node_modules',
        reporters: [
          {
            formatter: 'verbose',
            console: true,
          },
        ],
        fix: true,
        failAfterError: false,
      }),
    )
    .pipe(gulp.dest(`${global.config.stylesheets.sass.src}/`));
}

function stylesClean() {
  return gulp.src([
    `${global.config.stylesheets.css.dest}`,
    `${global.config.stylesheets.css.dest}/**/*.*`,
    `!${global.config.stylesheets.css.dest}/vendor/**/*.*`,
    `!${global.config.stylesheets.css.dest}/vendor`,
  ], {
    read: false,
    allowEmpty: true,
  })
    .pipe(clean({force: true}));
}

const styles = gulp.series(
  stylesScssLint,
  stylesScssBuild,
  stylesCssLint,
);

function stylesWatch() {
  gulp.watch(
    [`${global.config.stylesheets.sass.src}/**/*.scss`],
    gulp.series(
      stylesScssBuild,
      stylesCssLint,
    ),
  );
}

exports.styles = styles;

/** ============================================================================
 *  Scripts
 *  ==========================================================================
 * */

function jsEs6Build() {
  const bundleName = (file) => {
    file.basename = file.basename.replace('.es6', '');
    file.extname = '.js';
    return file;
  };

  return gulp.src([`${global.config.js.src}/**/*.es6.js`])
    .pipe(sourcemaps.init())
    .pipe(babel({
      presets: [['env', {
        modules: false,
        useBuiltIns: true,
        targets: {browsers: global.config.supported_browser},
      }]],
    }))
    .pipe(rename(file => (bundleName(file))))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(global.config.js.dest))
    .pipe(rename({suffix: '.min'}))
    .pipe(uglify())
    .pipe(gulp.dest(global.config.js.dest));
}

function jsBuild() {
  return gulp.src([
    `${global.config.js.src}/**/*.js`,
    `!${global.config.js.src}/**/*.es6.js`,
  ]).pipe(sourcemaps.init())
    .pipe(gulp.dest(global.config.js.dest))
    .pipe(rename({suffix: '.min'}))
    .pipe(uglify())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(global.config.js.dest));
}

function jsLint() {
  return gulp.src(`${global.config.js.src}/**/*.js`)
    .pipe(eslint({
      useEslintrc: true,
      fix: true,
    }))
    // .pipe(eslint.format())
    .pipe(eslint.result((result) => {
      // Called for each ESLint result.
      process.stdout.write(
        `ESLint result: ${
          result.filePath.substr(result.filePath.lastIndexOf('/') + 1, result.filePath.length - 1)}\n`);
      process.stdout.write(`# Messages: ${result.messages.length}\n`);
      process.stdout.write(`# Warnings: ${result.warningCount}\n`);
      process.stdout.write(`# Errors: ${result.errorCount}\n`);
    }))
    .pipe(gulp.dest(`${global.config.js.src}`));
}

function jsClean() {
  return gulp.src([
    `!${global.config.js.dest}/vendor/**/*.*`,
    `!${global.config.js.dest}/vendor`,
    `${global.config.js.dest}/**/*.*`,
    `${global.config.js.dest}`,
  ], {
    read: false,
    allowEmpty: true,
  })
    .pipe(clean({force: true}));
}

const scripts = gulp.series(
  jsLint,
  jsEs6Build,
  jsBuild,
);

function jsWatch() {
  gulp.watch(
    [`${global.config.js}/**/*.js`],
    gulp.series(
      jsEs6Build,
      jsBuild,
    ),
  );
}

exports.scripts = scripts;

/** ============================================================================
 *  Vendor
 *  ==========================================================================
 * */

const bootstrap = {
  css: [],
  js: [
    './node_modules/bootstrap/dist/js/bootstrap.js', // bootstrap
    './node_modules/bootstrap/dist/js/bootstrap.js.map', // bootstrap
    './node_modules/bootstrap/dist/js/bootstrap.min.js', // bootstrap
    './node_modules/bootstrap/dist/js/bootstrap.min.js.map', // bootstrap
  ],
};

const jquery = {
  css: [],
  js: [
    './node_modules/jquery/dist/jquery.js', // jquery
    './node_modules/jquery/dist/jquery.min.js', // jquery
    './node_modules/jquery/dist/jquery.min.map', // jquery
  ],
};

const popper = {
  css: [],
  js: [
    './node_modules/popper.js/dist/umd/popper.js', // popper
    './node_modules/popper.js/dist/umd/popper.js.map', // popper
    './node_modules/popper.js/dist/umd/popper.min.js', // popper
    './node_modules/popper.js/dist/umd/popper.min.js.map', // popper
  ],
};

const mdbootstrap = {
  css: [],
  js: [
    './node_modules/mdbootstrap/js/mdb.js', // mdb
    './node_modules/mdbootstrap/js/mdb.min.js', // mdb
    // './node_modules/mdbootstrap/js/addons/datatables.js', // mdb
    // './node_modules/mdbootstrap/js/addons/datatables.min.js', // mdb
    // './node_modules/mdbootstrap/js/addons/datatables-select.js', // mdb
    // './node_modules/mdbootstrap/js/addons/datatables-select.min.js', // mdb
    // './node_modules/mdbootstrap/js/addons/imagesloaded.pkgd.min.js', // mdb
    // './node_modules/mdbootstrap/js/addons/jquery.zmd.hierarchical-display.js',
    // './node_modules/mdbootstrap/js/addons/jquery.zmd.hierarchical-display.min.js',
    // './node_modules/mdbootstrap/js/addons/masonry.pkgd.min.js',
    // './node_modules/mdbootstrap/js/addons/progressBar.js',
    // './node_modules/mdbootstrap/js/addons/progressBar.min.js',
    // './node_modules/mdbootstrap/js/addons/rating.js',
    // './node_modules/mdbootstrap/js/addons/rating.min.js',
  ],
};

function vendorCopyJs(done) {
  let vendorJsPaths = [];
  if (global.config.vendors.bootstrap.js) {
    vendorJsPaths = vendorJsPaths.concat(bootstrap.js);
  }
  if (global.config.vendors.jquery.js) {
    vendorJsPaths = vendorJsPaths.concat(jquery.js);
  }
  if (global.config.vendors.popper.js) {
    vendorJsPaths = vendorJsPaths.concat(popper.js);
  }
  if (global.config.vendors.mdbootstrap.js) {
    vendorJsPaths = vendorJsPaths.concat(mdbootstrap.js);
  }
  if (vendorJsPaths.length > 0) {
    return gulp.src(vendorJsPaths)
      .pipe(gulp.dest(`${global.config.js.dest}/vendor`));
  }
  else {
    process.stdout.write('No vendor css selected.\n');
    return done();
  }
}

function vendorCopyCss(done) {
  let vendorCssPaths = [];
  if (global.config.vendors.bootstrap.css) {
    vendorCssPaths = vendorCssPaths.concat(bootstrap.css);
  }
  if (global.config.vendors.jquery.css) {
    vendorCssPaths = vendorCssPaths.concat(jquery.css);
  }
  if (global.config.vendors.popper.css) {
    vendorCssPaths = vendorCssPaths.concat(popper.css);
  }
  if (global.config.vendors.mdbootstrap.css) {
    vendorCssPaths = vendorCssPaths.concat(mdbootstrap.css);
  }
  if (vendorCssPaths.length > 0) {
    return gulp.src(vendorCssPaths)
      .pipe(gulp.dest(`${global.config.stylesheets.css.dest}/vendor`));
  }
  else {
    process.stdout.write('No vendor css selected.\n');
    return done();
  }
}

const vendorCopy = gulp.parallel(
  vendorCopyJs,
  vendorCopyCss,
);

function vendorClean() {
  return gulp.src([
    `${global.config.stylesheets.css.dest}/vendor`,
    `${global.config.js.dest}/vendor`,
  ], {read: false, allowEmpty: true})
    .pipe(clean({force: true}));
}

const vendor = gulp.series(
  vendorClean,
  vendorCopy,
);

exports.vendor = vendor;
/** ============================================================================
 *  Testing  // TODO
 *
 *  see https://github.com/shaal/umami-backstop
 *  ==========================================================================
 * */
const BACKSTOP_DIR = './tests/backstop';
const FILES = {
  temp: path.join(BACKSTOP_DIR, 'backstop.temp.json'),
  tpl: path.join(BACKSTOP_DIR, 'backstop.tpl.json')
};

/**
 * Returns the list of the scenarios from
 *   a. All the different groups if `group` is == 'all',
 *   b. Only the given group
 *
 * @param {String} group
 * @return {Array}
 */
function buildScenariosList(group) {
  const dirPath = path.join(BACKSTOP_DIR, 'scenarios');

  return _(fs.readdirSync(dirPath))
    .filter(scenario => {
      return (group === 'all' ? true : scenario === `${group}.json`) && scenario.endsWith('.json');
    })
    .map(scenario => {
      return JSON.parse(fs.readFileSync(path.join(dirPath, scenario))).scenarios;
    })
    .flatten()
    .map((scenario, index, scenarios) => {
      return _.assign(scenario, {
        cookiePath: path.join(BACKSTOP_DIR, 'cookies', `${global.config.visualRegressionTest.user}.json`),
        count: '(' + (index + 1) + ' of ' + scenarios.length + ')',
        url: scenario.url.replace('{url}', global.config.url)
      });
    })
    .value();
}

/**
 * Removes the temp config file and sends a notification
 * based on the given outcome from BackstopJS
 *
 * @param {Boolean} success
 */
function cleanUpAndNotify(success) {
  gulp
    .src(FILES.temp, {read: false})
    .pipe(clean())
    .pipe(notify({
      message: success ? 'Success' : 'Error',
      title: 'BackstopJS',
      sound: 'Beep'
    }));
}

/**
 * Creates the content of the config temporary file that will be fed to
 * BackstopJS The content is the mix of the config template and the list of
 * scenarios under the scenarios/ folder
 *
 * @return {String}
 */
function createTempConfig() {
  let group = 'all';
  if (global.config.visualRegressionTest.scenario && global.config.visualRegressionTest.scenario !== '') {
    group = global.config.visualRegressionTest.scenario;
  }
  const list = buildScenariosList(group);
  const content = JSON.parse(fs.readFileSync(FILES.tpl));

  content.scenarios = list;

  ['bitmaps_reference', 'bitmaps_test', 'html_report', 'ci_report'].forEach(path => {
    content.paths[path] = content.paths[path].replace('{group}', group);
  });

  return JSON.stringify(content);
}

const backstopJsReference = () => {
  return runBackstopJS('reference');
};
const backstopJsTest = () => {
  return runBackstopJS('test');
};
const backstopJsApprove = () => {
  return runBackstopJS('approve');
};
const backstopJsOpenReport = () => {
  return runBackstopJS('openReport');
};

function runBackstopJS(command) {
  return new Promise((resolve, reject) => {
    let login = false;

    if (global.config.visualRegressionTest.user && global.config.visualRegressionTest.user !== 'guest') {
      login = true;
    }

    gulp.src(FILES.tpl)
      .pipe(file(path.basename(FILES.temp), createTempConfig()))
      .pipe(gulp.dest(BACKSTOP_DIR))
      .on('end', async () => {
        try {
          (login) && await writeCookies();
          await backstopjs(command, {
            configPath: FILES.temp,
            filter: argv.filter
          });

          success = true;
        }
        finally {
          cleanUpAndNotify(success);

          success ? resolve() : reject(new Error('BackstopJS error'));
        }
      });
  })
    .catch(function (err) {
      throwError(err.message);
    });
}

/**
 * Writes the session cookie files that will be used to log in as different
 * users
 *
 * It uses the [`drush
 * uli`](https://drushcommands.com/drush-7x/user/user-login/) command to
 * generate a one-time login url, the browser then go to that url which then
 * creates the session cookie
 *
 * The cookie is then stored in a json file which is used by the BackstopJS
 * scenarios to log in
 *
 * @return {Promise}
 */
async function writeCookies() {
  const cookiesDir = path.join(BACKSTOP_DIR, 'cookies');
  const cookieFilePath = path.join(cookiesDir, `${global.config.visualRegressionTest.user}.json`);

  const command = `lando drush user:login --name=${global.config.visualRegressionTest.user} --uri=${global.config.url} --browser=0`;


  // const loginUrl = execSync(`drush uli --name=admin --uri=${config.url}
  // --browser=0`, { encoding: 'utf8', cwd: config.root }); const loginUrl =
  // execSync(`drush uli --name=admin --browser=0`, { encoding: 'utf8', cwd:
  // config.root });
  const loginUrl = execSync(command.toString(), {encoding: 'utf8'});

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(loginUrl);
  const cookies = await page.cookies();
  await browser.close();

  !fs.existsSync(cookiesDir) && fs.mkdirSync(cookiesDir);
  fs.existsSync(cookieFilePath) && fs.unlinkSync(cookieFilePath);

  fs.writeFileSync(cookieFilePath, JSON.stringify(cookies));
}

exports.vssetup = gulp.series(backstopJsReference);
exports.vstest = gulp.series(backstopJsTest);
exports.vsok = gulp.series(backstopJsApprove);
exports.vsreport = gulp.series(backstopJsOpenReport);

/** ============================================================================
 *  Global
 *  ==========================================================================
 * */

const watch = gulp.parallel(
  fontsWatch,
  imagesWatch,
  iconsWatch,
  stylesWatch,
  jsWatch,
);

const remove = gulp.parallel(
  fontsClean,
  imagesClean,
  iconsClean,
  stylesClean,
  jsClean,
  vendorClean,
);

const build = gulp.parallel(
  fonts,
  icons,
  images,
  styles,
  scripts,
);

const fix = gulp.series(
  stylesScssLint,
  stylesCssLint,
  jsLint,
);

exports.build = build;
exports.watch = watch;
exports.clean = remove;
exports.default = watch;
exports.fix = fix;
