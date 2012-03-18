
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
APIConnect.util.ajax = function(context, method, url, params, options) {
  var deferred = this.Deferred(),
      isGET = method == 'GET',
      isJSON = options.contentType == 'json';
  request({
    url: url,
    method: method,
    qs: isGET ? params : null,
    form: !isGET && !isJSON ? params : null,
    json: !isGET && isJSON ? params : null
  }, function (error, response, body) {
    if(!error) {
      try {
        var data = options.dataFormat == 'json' ? JSON.parse(body) : body;
        if(options.complete) options.complete.call(context, data);
        if(options.success)  options.success.call(context, data);
        return deferred.resolve(data);
      } catch(e) {};
    }
    if(options.error)  options.error.call(context, body);
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
