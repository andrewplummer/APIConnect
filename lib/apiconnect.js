(function($) {


  // Constants

  var HUMANIZED_HTTP_VERBS = {
    'GET':    'get',
    'POST':   'create',
    'PUT':    'update',
    'DELETE': 'destroy'
  };

  var RESOURCE_ROUTES = [
    { name: 'index',   method: 'GET',     has_id: false },
    { name: 'show',    method: 'GET',     has_id: true  },
    { name: 'create',  method: 'POST',    has_id: false },
    { name: 'update',  method: 'PUT',     has_id: true  },
    { name: 'destroy', method: 'DELETE',  has_id: true  }
  ];

  var ACCESS_TOKEN_PARAMS = [
    'token',
    'access_token',
    'oauth_token'
  ];

  var DEFAULT_OPTIONS = ['protocol', 'domain', 'port', 'timeout', 'cors', 'jsonp', 'credentials'];

  var MAX_SIZE_FOR_JSONP_REQUESTS = 4091;


  function restrictActions(actions, restrictedActions, only) {
    var result = [], match, matchedIndex;
    if(!restrictedActions) return actions;
    dynamicArray(restrictedActions, function(action, i, arr) {
      match = null;
      arrayEach(actions, function(el, i) {
        if(el.name == action) {
          match = el;
          matchedIndex = i;
          return false;
        }
      });
      if(match && only) {
        result.push(match);
      } else if(match && !only) {
        actions.splice(matchedIndex, 1);
      }
    });
    return only ? result : actions;
  }

  function getRouteObject(context, route, routeOptions, method) {

    var previous,
        result = context.base.concat();

    route = route.replace(/\.(\w+)$/, function(match, format) {
      routeOptions.format = format;
      routeOptions.appendFormat = true;
      return '';
    });

    arrayEach(route.split('/'), function(str, i, arr) {
      var fragment,
          match = str.match(/^:(.+)$/),
          param = match && match[1],
          singular = singularize(str),
          last = i == arr.length - 1;

      function setFragmentAndPrevious(property, set) {
        fragment[property] = set;
        // If the route has an explicit collection, then the previous fragment may occur without
        // an :id, so don't explicitly enforce the same expectations.
        // ex. GET /tweets/:tweet_id
        // ex. GET /tweets
        // Both may be allowed for a single method call, but only if "collection" is explicitly
        // true, allowing for things like uncountable resources that would otherwise have a method collision.
        if(!method || method != 'GET' || !routeOptions.collection) {
          previous[property] = set;
        }
      }

      fragment = {
        text:      str.replace(/^:/, ''),
        singular:  singular,
        param:     !!param,
        required:  true
      }

      if(param) {
        if(param == 'id' && previous && !previous.param) {
          // ex. /users/:id should expect either :id or :user_id
          // ex. tweets/:user/:id should not follow this pattern, however.
          setFragmentAndPrevious('expected', previous.singular + '_id');
          setFragmentAndPrevious('id_expected', true);
          previous.name = previous.singular;
        } else if(previous && param.replace(/_id$/, '') == previous.singular) {
          // ex. /users/:user_id should expect only :user_id
          setFragmentAndPrevious('expected', param);
          previous.name = previous.singular;
        } else {
          fragment.expected = param;
        }
      }
      result.push(fragment);
      previous = fragment;
    });
    return result;
  }

  function getMethodName(method, routeObject, routeOptions) {
    var name = HUMANIZED_HTTP_VERBS[method], reversed, obj;
    reversed = routeObject.concat().reverse();
    arrayEach(reversed, function(el, i, arr) {
      if(!el.param) {
        obj = el;
        return false;
      }
    });
    if(!obj) {
      obj = reversed[0];
    }
    name += sanitize(obj.name || obj.text);
    return name;
  }

  function mergeRoutes(routes1, routes2) {
    var fragmentsToMerge = [],
        startIndex;

    arrayEach(routes2.slice(0,-1), function(fragment, i) {
      if(!routes1[i] || routes1[i].text != fragment.text) {
        fragmentsToMerge.push(fragment);
        if(startIndex === undefined) startIndex = i;
      } else if(startIndex !== undefined) {
        return false;
      }
    });
    Array.prototype.splice.apply(routes1, [startIndex, 0].concat(fragmentsToMerge));
  }

  function connectRoute(str, routeOptions) {

    var context = this, match, route, method, routeObject, routeParams, as;

    routeOptions = routeOptions || {};
    match        = str.match(/\s*(get|post|put|delete)?\s*\/?(\S+)\s*(?:(?:params|with)\s+(\S+)\s*)?(?:as\s+(\S+))?/i);
    method       = match[1] ? match[1].toUpperCase() : 'GET';
    route        = match[2];
    routeObject  = getRouteObject(context, route, routeOptions, method);
    routeParams  = getParamsFromString(match[3]) || routeOptions.params;
    as           = match[4] || routeOptions.as || getMethodName(method, routeObject, routeOptions);

    if(context[as]) {
      // Method exists so merge its route object to allow it a new context.
      mergeRoutes(context[as].routeObject, routeObject);
    } else {
      context[as] = function(params, options) {
        var url, key;

        if(typeof params == 'string') {
          arrayEach(routeObject, function(fragment) {
            if(fragment.param) {
              var tmp = {};
              tmp[fragment.text] = params;
              params = tmp;
              return false;
            }
          });
        }

        params  = $.extend({}, context.defaultParams, routeParams, params);
        options = $.extend({}, context.defaultOptions, routeOptions, options);

        url = resolveURL(context, routeObject, params, options);

        return initiateRequest(context, url, method, params, options);
      }

      // Store a reference to the route object so
      // that it can be merged later if needed.
      context[as].routeObject = routeObject;
    }
  }

  function resolveURL(context, routeObject, params, options) {
    var url = '', options;

    url += getProtocol(options.protocol, params);
    url += options.domain;

    if(options.port) {
      url += ':' + options.port;
    }

    arrayEach(routeObject, function(fragment) {

      var paramsExpected,
          found;

      paramsExpected = fragment.expected || fragment.id_expected;
      if(fragment.expected && params[fragment.expected]) {
        found = fragment.expected;
      } else if(fragment.id_expected && params['id']) {
        found = 'id';
      }

      // Add the fragment if it was either not expected a matching param,
      // or if it was exepecting one and it was found.
      if((paramsExpected && found) || (!paramsExpected && !fragment.param)) {
        url += '/' + (fragment.param ? params[found] : fragment.text);
      }

      // Delete the param if found so as not to pass it along to the query string.
      if(found && fragment.param) {
        delete params[found];
      }

    });

    if(options.appendFormat) {
      url += '.' + (typeof options.appendFormat == 'string' ? options.appendFormat : options.format);
    }
    return url;
  }

  function initiateRequest(context, url, method, params, options) {
    var deferred, cached, fullURL, split;

    options.data = params;
    options.type = method;

    // If either this API or this browser does not support CORS and does support JSONP instead, use it.
    if((!options.cors || !$.support.cors) && options.jsonp && options.format == 'json') {
      options.dataType = 'jsonp';
      // Delete the "jsonp" property as it will override the ajax callback otherwise.
      delete options.jsonp;
    } else {
      options.dataType = options.format;
    }

    if(allowGetOverride(options.getOverride, method, options.dataType == 'jsonp')) {
      params._method = method;
      options.type = 'GET';
    } else if(allowPostOverride(options.postOverride, method)) {
      params._method = method;
      options.type = 'POST';
    }

    fullURL = cacheKey(url, params);

    if(cached = cacheRetrieve(context, fullURL, options)) {
      callOptionalCallback(context, options.complete, cached);
      callOptionalCallback(context, options.success, cached);
      return $.Deferred().resolve(cached);
    }

    if(options.credentials) {
      //$.extend(options, { xhrFields: { withCredentials: true }});
    }

    if(options.dataType == 'jsonp' && fullURL.length > MAX_SIZE_FOR_JSONP_REQUESTS) {
      if(options.sizeError) {

        var callbacks = {};

        arrayEach(['error','complete','success'], function(type) {
          callbacks[type] = options[type];
          delete options[type];
        });

        // Splitting requests, deferred is now an array.
        deferred = [];
        split = options.sizeError.call(context, url, params);

        // If the callback has returned an array it is an attempt to split the calls.
        if($.isArray(split)) {

          arrayEach(split, function(request) {
            deferred.push(initiateRequest(context, request.url, method, request.params, options));
          });

          return $.when.apply(deferred).fail(function(data) {
            callOptionalCallback(context, callbacks.error, data);
          }).done(function(data) {
            callOptionalCallback(context, callbacks.complete, data);
            callOptionalCallback(context, callbacks.success, data);
          });

        }
      }
      callOptionalCallback(context, options.error, {});
      return $.Deferred().reject('Error: Max URL length exceeded!');
    }

    deferred = $.ajax(url, options);
    cacheCapture(context, method, deferred, fullURL, options);

    return deferred;
  }

  function cacheRetrieve(context, fullURL, options) {
    return options.cache && context.cache[fullURL];
  }

  function cacheCapture(context, method, deferred, fullURL, options) {
    if(options.cache && method === 'GET') {
      deferred.done(function(data) {
        context.cache[fullURL] = data;
      });
    }
  }

  function cacheKey(url, params) {
    return url + '?' + $.param(params);
  }

  function callOptionalCallback(context, callback, data) {
    if(callback) {
      callback.call(context, data);
    }
  }

  function getProtocol(setting, params) {
    var protocol = setting;
    if(setting == 'https-if-token') {
      protocol = tokenExists(params) ? 'https' : 'http';
    }
    return protocol.replace(/:?$/, '://');
  }

  function tokenExists(params) {
    return arrayAny(ACCESS_TOKEN_PARAMS, function(p) {
      return params[p];
    });
  }

  function allowGetOverride(setting, method, jsonp) {
    return (setting == 'always') ||
           (setting == 'jsonp' && jsonp) ||
           (setting == 'always-except-get' && method != 'GET') ||
           (setting == 'jsonp-except-get' && jsonp && method != 'GET');
  }

  function allowPostOverride(setting, method, jsonp) {
    return setting === true && (method == 'PUT' || method == 'DELETE');
  }

  function getParamsFromString(str) {
    if(!str) return null;
    var result = {}, split;
    split = str.split('&');
    arrayEach(split, function(p) {
      p = p.split('=');
      result[p[0]] = p[1];
    });
    return result;
  }

  function mergeDefaults(context, obj) {
    arrayEach(obj.routes, function(r) {
      context.connect(r);
    });
    arrayEach(obj.resources, function(r) {
      var match = r.toLowerCase().match(/\s*(\S+)\s*(?:only (.+))?\s*(?:except (.+))?/),
          resource = match[1],
          opt = { only: match[2], except: match[3] };
      context.resource(resource, opt);
    });
    delete obj.routes;
    delete obj.resources;
    iterateOverObject(obj, function(key, value) {
      if(context[key]) {
        context[key](value);
      } else {
        context.defaultParams[key] = value;
      }
    })
  }

  var InstanceMethods = {};

  APIConnect = function(obj) {
    this.defaultOptions = {
      protocol: 'https-if-token',
      getOverride: 'jsonp-except-get',
      appendFormat: false,
      credentials: true,
      timeout: 30000,
      format: 'json',
      domain: '',
      port: '',
      jsonp: true,
      cors: true
    };
    this.base          = [];
    this.cache         = {};
    this.defaultParams = {};
    mergeDefaults(this, obj || {});
  };


  function getterOrSetter(type, prop) {
    return function(set) {
      return getOrSet(this, type, prop, set);
    }
  }

  function getOrSet(context, type, prop, set) {
    var hash = context['default' + type.slice(0,1).toUpperCase() + type.slice(1)];
    if(set === undefined) {
      return hash[prop];
    } else {
      hash[prop] = set;
      return context;
    }
  }

  arrayEach(DEFAULT_OPTIONS, function(name) {
    InstanceMethods[name] = getterOrSetter('options', name);
  });

  arrayEach(['param', 'option'], function(name) {
    var plural = name + 's';
    InstanceMethods[name] = function(prop, set) {
      return getOrSet(this, plural, prop, set);
    }
    InstanceMethods[plural] = function(obj) {
      var context = this;
      iterateOverObject(obj, function(prop, set) {
        return context[name](prop, set);
      });
    }
  });

  InstanceMethods['getOverride']  = getterOrSetter('options', 'getOverride');
  InstanceMethods['postOverride'] = getterOrSetter('options', 'postOverride');

  InstanceMethods['format'] = function(type, append) {
    if(arguments.length > 0) {
      this.defaultOptions.format = type;
      this.defaultOptions.appendFormat = append;
    } else {
      return this.defaultOptions.format;
    }
  }

  InstanceMethods['context'] = function(name, fn) {
    var prev = this.base;
    this.base = getRouteObject(this, name, {});
    fn.call(this);
    this.base = prev;
  }

  InstanceMethods['connect'] = connectRoute;

  InstanceMethods['resource'] = function(str, options) {
    options = options || {};
    var context = this,
        match = str.match(/(.*?)([^/]+?)(\.\w+)?$/),
        prefix = match[1] || '',
        name = match[2],
        format = match[3] || '',
        singular = singularize(name),
        isPlural = singular != name,
        actions = RESOURCE_ROUTES.concat(),
        isCollection = options.collection || isPlural;

    arrayEach(['only','except'], function(opt) {
      actions = restrictActions(actions, options[opt], opt == 'only');
    });

    arrayEach(actions, function(action) {
      var methodName,
          route = prefix + name,
          isIndex = action.name == 'index';
      if(isCollection && action.has_id) {
        route += '/:id';
      }
      // Names like "getEquipment" will collide, so only set them up once. Passing a forced "collection"
      // property will allow an optional context later to handle both "index" and "show" actions in these edge cases.
      if(!isIndex || isPlural) {
        methodName = HUMANIZED_HTTP_VERBS[action.method] + camelize(isIndex ? name : singular);
        context.connect(action.method + ' ' + route + format, { as: methodName, collection: options.collection });
      }
    });

  }

  InstanceMethods['authorize'] = function(url, params) {

    var authParams, openerFields = [], openerFields, context = this, popup = false;

    authParams = {
      response_type: 'token',
      redirect_uri: window.location.href,
      _: new Date().getTime()
    }

    if(params.popup) {
      popup = true;
      delete params.popup;
    }

    iterateOverObject(URL_OPENER_DEFAULTS, function(name, value) {
      if(name in params) {
        value = params[name];
        delete params[name];
      }
      if(name == 'left' && value == 'center') {
        value = Math.round(window.innerWidth - (params.width || URL_OPENER_DEFAULTS.width));
      } else if(name == 'top' && value == 'center') {
        value = Math.round(window.innerHeight - (params.height || URL_OPENER_DEFAULTS.height));
      }
      openerFields.push(name + '=' + value);
    });

    params  = $.extend({}, authParams, params);

    url += '?' + $.param(params);

    return openExternalURL(context, url, popup, openerFields);

  };

  var URL_OPENER_DEFAULTS = {
    directories:  'no',
    height:       '600',
    width:        '900',
    left:         'center',
    top:          'center',
    location:     'no',
    menubar:      'no',
    resizable:    'no',
    scrollbars:   'no',
    status:       'no',
    titlebar:     'no',
    toolbar:      'no'
  };

  function openExternalURL(context, url, popup, openerFields) {
    var deferred = $.Deferred();
    if(popup) {
      var child = window.open(url, null, openerFields.join(',')), interval;
      interval = setInterval(function() {
        if(child.closed) {
          deferred.reject();
          clearInterval(interval);
        } else {
          getAccessToken(context, child, function(token, expires) {
            if(token) {
              clearInterval(interval);
              deferred.resolve(token, expires);
              child.close();
            }
          });
        }
      }, 500)
    } else {
      $('<iframe style="display:none;" src="'+ url +'"></iframe').appendTo(document.body).load(function() {
        var frame = this;
        getAccessToken(context, this.contentWindow, function(token, expires) {
          // Removing the iframe immediately makes firefox spin forever!
          setTimeout(function() {
            $(frame).remove();
          }, 1);
          if(token) {
            deferred.resolve(token, expires);
          } else {
            openExternalURL(context, url, true, openerFields);
          }
        });
      });
    }
    return deferred;
  }

  function getAccessToken(context, win, fn) {
    var token, expires, result = {};
    try {
      token   = win.location.hash.match(/(access_token)=(\w+)/);
      expires = win.location.hash.match(/(expires_in)=(\d+)/);
    } catch(e) {}
    if(token) {
      context.param('access_token', token[2]);
      fn(token[2], expires ? expires[2] : null);
    } else {
      fn();
    }
  }

  // Utility methods

  var iterateOverObject = $.each;

  function arrayEach(arr, fn) {
    if(arr) {
      for(var i = 0; i < arr.length; i++) {
        if(fn.call(arr, arr[i], i, arr) === false) {
          break;
        }
      }
    }
  }

  function arrayAny(array, fn) {
    var any = false;
    arrayEach(array, function(el, i, arr) {
      if(fn.call(arr, arr[i], i, arr)) {
        any = true;
        return false;
      }
    });
    return any;
  }

  function dynamicArray(arr, fn) {
    arr = arr || [];
    if(typeof arr == 'string') {
      arr = arr.split(',');
    }
    arrayEach(arr, fn);
  }


  var PLURAL_REPLACEMENTS = [
    { reg: /(x|ch|ss|sh|us)$/gi, to: '$1es' },
    { reg: /([^aeiouy]|qu)y$/gi, to: '$1ies' },
    { reg: /(?:([^f])fe|([lr])f)$/gi, to: '$1$2ves' },
    { reg: /sis$/gi, to: 'ses' },
    { reg: /([ti])a$/gi, to: '$1a' },
    { reg: /([ti])um$/gi, to: '$1a' },
    { reg: /s$/gi, to: 's' },
    { reg: /$/, to: 's' }
  ]


  var SINGULAR_REPLACEMENTS = [
    { reg: /(database)s$/gi, to: '$1' },
    { reg: /(quiz)zes$/gi, to: '$1' },
    { reg: /(matr)ices$/gi, to: '$1ix' },
    { reg: /(vert|ind)ices$/gi, to: '$1ex' },
    { reg: /^(ox)en/gi, to: '$1' },
    { reg: /(alias|status)(?:es)?$/gi, to: '$1' },
    { reg: /(octop|vir)(?:i|us)$/gi, to: '$1us' },
    { reg: /(cris|ax|test)es$/gi, to: '$1is' },
    { reg: /(shoe)s$/gi, to: '$1' },
    { reg: /(o)es$/gi, to: '$1' },
    { reg: /(bus)(?:es)?$/gi, to: '$1' },
    { reg: /([ml])ice$/gi, to: '$1ouse' },
    { reg: /(x|ch|ss|sh)es$/gi, to: '$1' },
    { reg: /(m)ovies$/gi, to: '$1ovie' },
    { reg: /(s)eries$/gi, to: '$1eries' },
    { reg: /([^aeiouy]|qu)ies$/gi, to: '$1y' },
    { reg: /([lr])ves$/gi, to: '$1f' },
    { reg: /(tive)s$/gi, to: '$1' },
    { reg: /(hive)s$/gi, to: '$1' },
    { reg: /([^f])ves$/gi, to: '$1fe' },
    { reg: /(^analy)ses$/gi, to: '$1sis' },
    { reg: /((a)naly|(b)a|(d)iagno|(p)arenthe|(p)rogno|(s)ynop|(t)he)ses$/gi, to: '$1$2sis' },
    { reg: /([ti])a$/gi, to: '$1um' },
    { reg: /(n)ews$/gi, to: '$1ews' },
    { reg: /ess$/gi, to: 'ess' },
    { reg: /is$/gi, to: 'is' },
    { reg: /s$/gi, to: '' }
  ];


  function pluralize(str) {
    arrayEach(PLURAL_REPLACEMENTS, function(r) {
      if(str.match(r.reg)) {
        str = str.replace(r.reg, r.to);
        return false;
      }
    });
    return str;
  }

  function singularize(str) {
    arrayEach(SINGULAR_REPLACEMENTS, function(r) {
      if(str.match(r.reg)) {
        str = str.replace(r.reg, r.to);
        return false;
      }
    });
    return str;
  }

  function sanitize(str) {
    return camelize(str.replace(/_id$/, ''));
  }

  function camelize(str) {
    return str.replace(/-/g, '_').replace(/(^|_)([^_]+)/g, function(match, pre, word) {
      return word.slice(0, 1).toUpperCase() + word.slice(1);
    });
  }

  function extend(klass, methods) {
    for(var key in methods) {
      klass.prototype[key] = methods[key];
    }
  }


  extend(APIConnect, InstanceMethods);


})(jQuery);
