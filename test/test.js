

var APIConnect = require('../lib/main');


var api = new APIConnect('localhost:4000');

api.connect('PUT APIConnect/test/api/test.json');


api.contentType('json');

api.updateTest({ foo: 'bar' }).always(function() {
  console.info('aahhahaha', arguments);
});



