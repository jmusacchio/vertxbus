Package.describe({
  name: 'jmusacchio:vertxbus',
  version: '0.0.3',
  // Brief, one-line summary of the package.
  summary: 'The Vert.x Event Bus Package allows any meteor app to be able to connect to Vert.x Components',
  // URL to the Git repository containing the source code for this package.
  git: 'https://github.com/jmusacchio/vertxbus',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Npm.depends({
  'sockjs-client': '1.0.3',
  'vertx3-eventbus-client': '3.1.0'
});

Package.onUse(function(api) {
  api.versionsFrom('1.1.0.2');
  api.use('mquandalle:bower@0.1.11', 'client');
  api.addFiles('bower.json', 'client');
  api.addFiles('npm.js', 'server');
  api.addFiles('export.js');
  if (api.export)
    api.export('Vertx');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('jmusacchio:vertxbus');
  api.addFiles('vertxbus-tests.js');
});