Package.describe({
  name: 'jmusacchio:vertxbus',
  version: '0.0.1',
  // Brief, one-line summary of the package.
  summary: 'The Vert.x Event Bus Package allows any meteor app to be able to connect to Vert.x Components',
  // URL to the Git repository containing the source code for this package.
  git: 'https://github.com/jmusacchio/vertxbus',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Npm.depends({
    'sockjs-client': '1.0.0' // Where x.x.x is the version, e.g. 0.3.2
});

Package.onUse(function(api) {
  api.versionsFrom('1.1.0.2');
  api.addFiles('sockjs-client.js', 'client');
  api.addFiles('sockjs-server.js', 'server');
  api.addFiles('vertxbus.js');
  if (api.export)
    api.export('Vertx');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('jmusacchio:vertxbus');
  api.addFiles('vertxbus-tests.js');
});