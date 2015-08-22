Package.describe({
  name: 'urigo:angular2-meteor',
  version: '0.1.0',
  summary: 'Angular2 and Meteor integration',
  git: 'https://github.com/Urigo/Meteor-Angular2',
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.1.0.3');

  api.use([
    'universe:modules@0.4.1'
  ]);

  api.imply([
    'barbatus:angular2@0.1.0'
  ]);

  api.addFiles([
    'system-config.js',
    'main.import.jsx',
    'modules/mongo_collection_observer.import.jsx',
    'modules/mongo_collection_differ.import.jsx'
  ]);
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('angular2-meteor');
});