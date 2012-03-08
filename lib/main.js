
var url        = require('url');
var request    = require('request');
var deferred   = require('jquery-deferred');
var APIConnect = require('./apiconnect');



APIConnect.util.Deferred = function() {
  return new deferred.Deferred;
}
APIConnect.util.supportsCORS = function() {
  return true;
}
APIConnect.util.isArray = function(arr) {
  return Array.isArray(arr);
}
APIConnect.util.ajax = function(method, url, params, options) {
  var deferred = this.Deferred(), isGET = method == 'GET';
  request({
    url: url,
    method: method,
    qs: isGET ? params : null,
    form: isGET ? null : params
  }, function (error, response, body) {
    if(!error) {
      try {
        return deferred.resolve(JSON.parse(body));
      } catch(e) {};
    }
    deferred.reject(body);
  });
  return deferred;
}
APIConnect.util.getLocationValue = function() {
  return null;
}
APIConnect.util.getLocationValue = function() {
  return null;
}
APIConnect.util.when = function() {
  return deferred.when.apply(this, arguments);
}
APIConnect.util.getFullURL = function(base, params) {
  var obj = url.parse(base);
  obj.query = params;
  return url.format(obj);
}

module.exports = APIConnect;
