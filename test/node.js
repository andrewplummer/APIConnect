
environment = 'node';

require('../../Sugar/unit_tests/javascripts/setup');

var APIConnect = require('../lib/main');





return;
var api = new APIConnect('twitter.com');
api.protocol('https');
api.connect(':object_id');
api.getObject({ object_id: "339240909450916" }).then(function(data) {
  console.info(data);
}).fail(function() {
  console.info('ONHOTOTTOTO');
});




