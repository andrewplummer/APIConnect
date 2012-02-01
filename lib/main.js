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
  ]

  var DEFAULT_OPTIONS = ['protocol', 'domain', 'port', 'timeout', 'cors', 'jsonp', 'credentials'];


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

  function getRouteObject(context, route, routingOptions, method) {

    var previous,
        result = context.base.concat();

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
        if(!method || method != 'GET' || !routingOptions.collection) {
          previous[property] = set;
        }
      }

      fragment = {
        text:      str,
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

  function getMethodName(method, routeObject, routingOptions) {
    var name = HUMANIZED_HTTP_VERBS[method], reversed;
    reversed = routeObject.concat().reverse();
    arrayEach(reversed, function(el) {
      if(!el.param) {
        name += camelize(el.name || el.text);
        return false;
      }
    });
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

  function connectRoute(str, routingOptions) {

    var context = this, match, route, method, routeObject, as;

    routingOptions = routingOptions || {};
    match          = str.match(/\s*(get|post|put|delete)?\s*\/?(\S+)\s*(?:as\s*(.+))?/i);
    method         = match[1] ? match[1].toUpperCase() : 'GET';
    route          = match[2];
    routeObject    = getRouteObject(context, route, routingOptions, method);
    as             = match[3] || routingOptions.as || getMethodName(method, routeObject, routingOptions);

    routingOptions = routingOptions || {};

    if(context[as]) {
      // Method exists so merge its route object to allow it a new context.
      mergeRoutes(context[as].routeObject, routeObject);
    } else {
      context[as] = function(params, localOptions) {

        var url, key;

        params  = $.extend({}, context.defaultParams, params);
        options = $.extend({}, context.defaultOptions, localOptions);

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

    url += options.protocol.replace(/:?$/, '://');
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
    var deferred, cached;

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

    if(allowMethodOverride(options.methodOverride, method, options.dataType == 'jsonp')) {
      params._method = method;
      options.type = 'GET';
    }

    if(cached = cacheRetrieve(context, url, params, options)) {
      callOptionalCallback(context, options.complete, cached);
      callOptionalCallback(context, options.success, cached);
      return $.Deferred().resolve(cached);
    }

    if(options.credentials) {
      $.extend(options, { xhrFields: { withCredentials: true }});
    }
    deferred = $.ajax(url, options);
    cacheCapture(context, deferred, url, params, options);

    return deferred;
  }

  function cacheRetrieve(context, url, params, options) {
    return options.cache && context.cache[cacheKey(url, params)];
  }

  function cacheCapture(context, deferred, url, params, options) {
    if(options.cache) {
      deferred.done(function(data) {
        context.cache[cacheKey(url, params)] = data;
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

  function allowMethodOverride(setting, method, jsonp) {
    return (setting == 'always') ||
           (setting == 'jsonp' && jsonp) ||
           (setting == 'always-except-get' && method != 'GET') ||
           (setting == 'jsonp-except-get' && jsonp && method != 'GET');
  }

  function mergeDefaults(context, obj) {
    iterateOverObject(obj, function(key, value) {
      if(context[key]) {
        context[key](value);
      }
    })
    arrayEach(obj.routes, function(r) {
      context.connect(r);
    });
    arrayEach(obj.resources, function(r) {
      var match = r.toLowerCase().match(/\s*(\S+)\s*(?:only (.+))?\s*(?:except (.+))?/),
          resource = match[1],
          opt = { only: match[2], except: match[3] };
      context.resource(resource, opt);
    });
  }

  var InstanceMethods = {};

  APIInterface = function(obj) {
    this.defaultOptions = {
      protocol: window.location.protocol,
      methodOverride: 'jsonp-except-get',
      appendFormat: true,
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
      var hash = this[type];
      if(set === undefined) {
        return hash[prop];
      } else {
        hash[prop] = set;
        return this;
      }
    }
  }

  arrayEach(DEFAULT_OPTIONS, function(name) {
    InstanceMethods[name] = getterOrSetter('defaultOptions', name);
  });

  InstanceMethods['param'] = function(key, value) {
    var obj = {};
    obj[key] = value;
    this.params(obj);
  }

  InstanceMethods['params'] = function(obj) {
    var context = this;
    $.extend(this.defaultParams, obj);
    iterateOverObject(obj, function(key, value) {
      if(!context[key]) {
        context[key] = getterOrSetter('defaultParams', key);
      }
    });
  }

  InstanceMethods['key'] = function() {
    var key, set, args = arguments;
    if(arguments.length == 2) {
      key = args[0];
      set = args[1];
    } else {
      key = this.keyParam || 'api_key';
      set = args[0];
    }
    if(!set) {
      return this.defaultParams[key];
    }
    this.defaultParams[key] = set;
    this.keyParam = key;
    return this;
  }

  InstanceMethods['methodOverride'] = getterOrSetter('defaultOptions', 'methodOverride');

  InstanceMethods['format'] = function(type, append) {
    if(arguments.length > 0) {
      if(typeof type != 'string') {
        append = type;
        type = this.defaultOptions.format;
      }
      this.defaultOptions.format = type;
      this.defaultOptions.appendFormat = append !== undefined ? append : true;
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
        match = str.match(/(.*?)([^/]+)$/),
        prefix = match[1] || '',
        name = match[2],
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
        context.connect(action.method + ' ' + route, { as: methodName, collection: options.collection });
      }
    });

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


  extend(APIInterface, InstanceMethods);


})(jQuery);
