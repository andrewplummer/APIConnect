
var url        = require('url');
var http       = require('http');
var https      = require('https');
var Deferred   = require('Deferred');
var APIConnect = require('./apiconnect');

console.info(https);

APIConnect.util.Deferred = function() {
  return new Deferred();
}
APIConnect.util.supportsCORS = function() {
  return true;
}
APIConnect.util.isArray = function(arr) {
  return Array.isArray(arr);
}
APIConnect.util.ajax = function(protocol, method, path, params, options) {
  var deferred = this.Deferred();
  var client = (protocol == 'https' ? https : http).createClient(options.port || 80, options.domain);
  var request = client.request(method, path, params);
  //request.write("stuff");
  request.end();
  request.on('response', function (response) {
    var body = '';
    response.on('data', function(chunk) {
      body += chunk;
    });
    response.on('end', function() {
      try {
        deferred.resolve(JSON.parse(body));
      } catch(e) {
        deferred.reject(body);
      }
    });
  });
  return deferred;
}
APIConnect.util.splitRequest = function() {
  return false;
}
APIConnect.util.getLocationValue = function() {
  return null;
}
APIConnect.util.getFullURL = function(base, params) {
  var obj = url.parse(base);
  obj.query = params;
  return url.format(obj);
}

module.exports = APIConnect;
