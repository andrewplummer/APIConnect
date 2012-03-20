/*
 *  APIConnect v0.6
 *
 *  Freely distributable and licensed under the MIT-style license.
 *  Copyright (c) 2012 Andrew Plummer
 *  http://andrewplummer.github.com/APIConnect/
 *
 * ---------------------------- */
(function(context) {


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

  var MAX_SIZE_FOR_JSONP_REQUESTS = 4091;
  var DEFAULT_OPTIONS             = ['protocol', 'domain', 'port', 'timeout', 'cors', 'jsonp', 'contentType'];
  var JSON_STRINGIFY_ERROR        = 'JSON.stringify failed! Shim may be required: https://github.com/douglascrockford/JSON-js';

  var InstanceMethods = {};

  var APIConnect = function(obj) {
    if(typeof obj === 'string') {
      obj = { domain: obj };
    }
    this.defaultOptions = {
      protocol: 'auto',
      getOverride: 'jsonp-except-get',
      dataFormat: 'json',
      appendFormat: false,
      timeout: 30000,
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

  /***
   * @method protocol([setting])
   * @returns Setting or Instance
   * @short Gets or sets the default protocol. Default is "auto".
   * @extra When set to "auto", https will be used if the current page is using https, or if a param like "token", "access_token", or "oauth_token" is found in the params. Otherwise will use http.
   *
   * @example
   *
   *   api.protocol('https') -> api
   *   api.protocol()        -> 'https'
   *
   ***
   * @method domain([setting])
   * @returns Setting or Instance
   * @short Gets or sets the domain.
   * @extra The domain can also be set when creating a new instance of APIConnect by passing a string as the first argument to the constructor.
   *
   * @example
   *
   *   api.domain('graph.facebook.com') -> api
   *   api.domain()                     -> 'graph.facebook.com'
   *
   ***
   * @method port([setting])
   * @returns Setting or Instance
   * @short Gets or sets the port. Default is %null%.
   *
   * @example
   *
   *   api.port(3000) -> api
   *   api.port()     -> 3000
   *
   ***
   * @method timeout([setting])
   * @returns Setting or Instance
   * @short Gets or sets the timeout. Default is %30000%.
   * @extra This option will be merged into the params passed to jQuery $.ajax, and tells it when to timeout an ajax request.
   *
   * @example
   *
   *   api.timeout(10000) -> api
   *   api.timeout()      -> 10000
   *
   ***
   * @method cors([setting])
   * @returns Setting or Instance
   * @short Gets or sets the CORS (cross-origin resource sharing) setting. Default is %true%.
   * @extra When active, APIConnect will attempt to make cross-browser ajax requests. JSONP will be used instead if the API is not on the same domain and  the browser does not support CORS. Setting this to %false% will turn off CORS support for all browsers. Note that CORS needs to be enabled on the server-side as well. If the API you're trying to connect to does not support this feature it should be turned off.
   *
   * @example
   *
   *   api.cors(false) -> api
   *   api.cors()      -> false
   *
   ***
   * @method jsonp([setting])
   * @returns Setting or Instance
   * @short Gets or sets the JSONP setting. Default is %true%.
   * @extra When active, APIConnect will attempt to make JSONP requests if CORS is disabled or not available, and if the API is not the same domain. Note that JSONP needs to be enabled on the server-side as well. If the API you're trying to connect to does not support this feature it should be turned off.
   *
   * @example
   *
   *   api.jsonp(false) -> api
   *   api.jsonp()      -> false
   *
   ***
   * @method contentType([setting])
   * @returns Setting or Instance
   * @short Gets or sets the contentType. Default is %form%.
   * @extra If the server requires a special contentType for parameter data, this can be specified here. Currently only %form% and %json% are supported. If the content type is "form", the standard %key=value% parameter serialization format will be used. If the contentType is %json%, the mime-type will be changed to %application/json%. In this case params need to be passed as a string, otherwise APIConnect will attempt to stringify them using %JSON.stringify%, which will fail in older browsers if not available. If you need this functionality a proper JSON shim should be used such as https://github.com/douglascrockford/JSON-js.
   *
   * @example
   *
   *   api.contentType('json') -> api
   *   api.contentType()       -> 'json'
   *
   ***/
  arrayEach(DEFAULT_OPTIONS, function(name) {
    InstanceMethods[name] = getterOrSetter('options', name);
  });

  /***
   * @method param(<name>, [value])
   * @returns Setting or Instance
   * @short Gets or sets a default parameter.
   * @extra Default parameters are added to all routes. This is useful for things like API keys or access tokens that need to be used in every API call.
   * @example
   *
   *   api.param('api_key', 'foo') -> api
   *   api.param('api_key')        -> 'foo'
   *
   ***
   * @method params([obj])
   * @returns Setting or Instance
   * @short Gets or sets the default parameters.
   * @extra Calls %param% for each key/value pair in [obj]. When called without any arguments returns all default params.
   * @example
   *
   *   api.param({ api_key: 'foo' }) -> api
   *   api.param()                   -> { api_key: 'foo' }
   *
   ***
   * @method option(<name>, [value])
   * @returns Setting or Instance
   * @short Gets or sets a default option.
   * @extra Default options are merged into the local options of all routes when called, and apply to all connected routes. Instance-wide options are always merged in last, ie. local options will always override them, so they can also be thought of as defaults.
   * @example
   *
   *   api.option('port', 3000) -> api
   *   api.option('port')       -> 3000
   *
   ***
   * @method options([obj])
   * @returns Setting or Instance
   * @short Gets or sets the default options.
   * @extra Calls %option% for each key/value pair in [obj]. When called without any arguments returns all default options.
   * @example
   *
   *   api.options({ port: 3000 }) -> api
   *   api.options()               -> { port: 3000, ... }
   *
   ***/
  arrayEach(['param', 'option'], function(name) {
    var plural = name + 's';
    InstanceMethods[name] = function(prop, set) {
      return getOrSet(this, arguments, plural, prop, set);
    }
    InstanceMethods[plural] = function(obj) {
      var context = this;
      if(arguments.length === 0) {
        return getDefaultObject(context, plural);
      } else {
        objectEach(obj, function(prop, set) {
          context[name](prop, set);
        });
        return context;
      }
    }
  });

  /***
   * @method getOverride([setting] = 'jsonp-except-get')
   * @returns Setting or Instance
   * @short Gets or sets the "getOverride" option.
   * @extra This option turns all POST, PUT, and DELETE requests into GET and instead sets a %_method% parameter representing the true method. <setting> can be %always%, which always adds %_method%, %jsonp%, which only overrides when using JSONP, %always-except-get%, or %jsonp-except-get%, which do the same except do not override GET methods, which typically do not require a %_method% parameter.
   * @example
   *
   *   api.getOverride()             -> 'jsonp-except-get'
   *   api.getOverride('always')     -> api
   *
   ***/
  InstanceMethods['getOverride']  = getterOrSetter('options', 'getOverride');

  /***
   * @method postOverride(<setting> = false)
   * @returns Setting or Instance
   * @short Gets or sets the "postOverride" option.
   * @extra Some APIs require a POST method to stand in for PUT and DELETE. This option turns all PUT and DELETE requests into POST with a %_method% parameter representing the true method. <setting> can be %true% or %false%.
   * @example
   *
   *   api.postOverride()         -> false
   *   api.postOverride(true)     -> api
   *
   ***/
  InstanceMethods['postOverride'] = getterOrSetter('options', 'postOverride');

  /***
   * @method format(<dataFormat> = 'json', [appendFormat] = false)
   * @returns Setting or Instance
   * @short Gets or sets the format.
   * @extra <dataFormat> is the format passed to the AJAX library. By default this is JSON, so the result will be parsed as JSON. [appendFormat] is the format appended to each route. By default this is %false%, so no format will be appended. If %true% it will use the <dataFormat>, and if anything else it will use it as the appended format instead.
   * @example
   *
   *   api.format()             -> { dataFormat: 'json', appendFormat: false }
   *   api.format('xml', 'php') -> api
   *
   ***/
  InstanceMethods['format'] = function(dataFormat, appendFormat) {
    if(arguments.length > 0) {
      this.defaultOptions.dataFormat   = dataFormat;
      this.defaultOptions.appendFormat = appendFormat;
      return this;
    } else {
      return { dataFormat: this.defaultOptions.format, appendFormat: this.defaultOptions.appendFormat };
    }
  }

  /***
   * @method context(<name>, <callback>)
   * @returns Nothing
   * @short Allows a callback inside which the context <name> will be prepended.
   * @extra If you have multiple routes with the same context, use this so that it doesn't have to be added to every %connect% statement.
   * @example
   *
   +   api.context('friends', function() {
   *     api.connect('posts');
   *     api.connect('photos');
   *     api.connect('events');
   *   });
   *
   ***/
  InstanceMethods['context'] = function(name, fn) {
    var prev = this.base;
    this.base = getRouteObject(this, name, {});
    fn.call(this);
    this.base = prev;
  }

  /***
   * @method connect(<route>, [options])
   * @returns Instance
   * @short Connects the route.
   * @extra This is the main workhorse of APIConnect. <route> is the route to be called, it can have the 4 HTTP verbs GET, POST, PUT, or DELETE preceding it, and it can also contain the format (.json, etc). [options] is an object that contains the options for the route. Any options here will be merged into the options passed when calling the route. Additionally there are 2 special options: %params% will "burn in" any parameters so that they will always be passed when the route is called. %as% will override the resulting method name, which by default is a camel-case form of the human-readable method (get, create, update, or destroy) plus the last fragment in the route. For example, %connect('GET friends/statuses')% will result in the method name %getStatuses%.
   * @example
   *
   +   api.connect('friends')                       -> Connects method api.getFriends()
   +   api.connect('POST friends')                  -> Connects method api.createFriends()
   +   api.connect('PUT friends')                   -> Connects method api.updateFriends()
   +   api.connect('DELETE friends')                -> Connects method api.updateFriends()
   +   api.connect('friends', { as 'fetchPeople' }) -> Connects method api.fetchPeople()
   +   api.connect('search', { params: { complete: true }, as: 'findCompleted' }) -> Connects method api.findCompleted() with permanent params "complete= true"
   *
   ***/
  InstanceMethods['connect'] = connectRoute;

  /***
   * @method resource(<name>, [options])
   * @returns Instance
   * @short Shortcut for connecting multiple routes for the same resource.
   * @extra For singular resources it will connect 4 routes, GET, POST, UPDATE, and DELETE as get<Name>, create<Name>, update<Name>, and destroy<Name>. For plural routes it will add %/:id% to the URL and singularize the method name for the above routes, and add an fifth "index" route without the %/:id% fragment using non-singular method name. Singular/plural routes will attempt to be intelligently detected by finding the singularized form of <name>. For non-countable or irregular nouns, instead pass %{ collection: true }% in [options] to force plural routes. Additionally, %only% and %except% are allowed in [options] to limit the routes connected. Both can be either an array or comma-delimited string. Note that when limiting connected routes, %index% and %show% are used instead of %get% to differentiate between singular and plural %get% routes to be connected. This is only applicable to the %resource% method.
   * @example
   *
   +   api.resource('tweet')                            -> Connects get, create, update, and destroy routes
   +   api.resource('tweets')                           -> Connects index, get, create, update, and destroy routes
   +   api.resource('tweets', { only: 'show,create' })   -> Connects get and create routes
   +   api.resource('tweets', { except: 'show,create' }) -> Connects index, update, and delete routes
   +   api.resource('equipment', { collection: true })  -> Connects index, get, create, update, and destroy routes
   *
   ***/
  InstanceMethods['resource'] = function(name, options) {
    options = options || {};
    var context = this,
        match = name.match(/(.*?)([^/]+?)(\.\w+)?$/),
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

    return this;
  }

  // Not documenting authorize methods for now.

  InstanceMethods['authorize'] = function(url, params) {

    var authParams, openerFields = [], openerFields, context = this, popup = false;

    authParams = {
      response_type: 'token',
      redirect_uri: util.getLocationValue('href'),
      _: new Date().getTime()
    }

    if(params.popup) {
      popup = true;
      delete params.popup;
    }

    objectEach(URL_OPENER_DEFAULTS, function(name, value) {
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

    params  = merge(authParams, params);

    url = util.getFullURL(url, params);

    return openExternalURL(context, url, popup, openerFields);

  };


  // Instance helpers

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
    objectEach(obj, function(key, value) {
      if(context[key]) {
        context[key](value);
      } else {
        context.defaultParams[key] = value;
      }
    })
  }

  function getterOrSetter(type, prop) {
    return function(set) {
      return getOrSet(this, arguments, type, prop, set);
    }
  }

  function getOrSet(context, args, type, prop, set) {
    var hash = getDefaultObject(context, type);
    if(args.length === 0) {
      return hash[prop];
    } else {
      hash[prop] = set;
      return context;
    }
  }

  function getDefaultObject(context, type) {
    return context['default' + type.slice(0,1).toUpperCase() + type.slice(1)];
  }

  // Route connect helpers

  function connectRoute(str, routeOptions) {

    var context = this, match, route, method, routeObject, routeParams, as;

    routeOptions = routeOptions || {};
    match        = str.match(/\s*(?:(get|post|put|delete)\s)?\/?([^\s?]+)(?:\?(\S+))?\s*(?:as\s+(\S+))?/i);
    method       = match[1] ? match[1].toUpperCase() : 'GET';
    route        = match[2];
    routeObject  = getRouteObject(context, route, routeOptions, method);
    routeParams  = getParamsFromString(match[3]) || routeOptions.params;
    as           = match[4] || routeOptions.as || getMethodName(method, routeObject);

    if(context[as]) {
      // Method exists so merge its route object to allow it a new context.
      mergeRoutes(context[as].routeObject, routeObject);
    } else {
      context[as] = function(params, options) {
        var url, key, callback, deferred;

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

        arrayEach(arguments, function(arg) {
          if(typeof arg === 'function') {
            callback = arg;
          }
        });

        params  = merge(context.defaultParams, routeParams, params);
        options = merge(context.defaultOptions, routeOptions, options);

        url = resolveURL(context, routeObject, params, options);

        deferred = initiateRequest(context, url, method, params, options);
        if(callback) deferred.then(callback);

        return deferred;
      }

      // Store a reference to the route object so
      // that it can be merged later if needed.
      context[as].routeObject = routeObject;

      return context;
    }
  }

  function getRouteObject(context, route, routeOptions, method) {

    var previous,
        result = context.base.concat();

    route = route.replace(/\.(\w+)$/, function(match, format) {
      routeOptions.appendFormat = format;
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

  function getMethodName(method, routeObject) {
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


  // Resource helpers

  function restrictActions(actions, restrictedActions, only) {
    var result = [], match, matchedIndex;
    if(!restrictedActions) return actions;
    arrayEach(restrictedActions, function(action, i, arr) {
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


  // URL Helpers

  function resolveURL(context, routeObject, params, options) {
    var url = getURLBase(params, options);

    arrayEach(routeObject, function(fragment) {
      var paramsExpected, found;

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
      url += '.' + (typeof options.appendFormat == 'string' ? options.appendFormat : options.dataFormat);
    }
    return url;
  }

  function getProtocol(setting, params) {
    var protocol = setting;
    if(setting == 'auto') {
      protocol = util.getLocationValue('protocol') == 'https:' || tokenExists(params) ? 'https' : 'http';
    }
    return protocol.replace(/:?$/, '');
  }

  function tokenExists(params) {
    return arrayAny(ACCESS_TOKEN_PARAMS, function(p) {
      return params[p];
    });
  }

  function getURLBase(params, options) {
    var base = getProtocol(options.protocol, params);
    base += '://';
    base += options.domain;
    if(options.port) {
      base += ':' + options.port;
    }
    return base;
  }

  // Request helpers

  function initiateRequest(context, url, method, params, options) {
    var deferred, cached, fullURL, split, intendedMethod = method;

    // If either this API or this browser does not support CORS and does support JSONP instead, use it.
    if(switchToJSONP(context, options)) {
      options.dataType = 'jsonp';
      // Delete the "jsonp" property as it will override the ajax callback otherwise.
      delete options.jsonp;
    } else {
      options.dataType = options.dataFormat;
    }

    if(allowGetOverride(options.getOverride, method, options.dataType == 'jsonp')) {
      params._method = method;
      method = 'GET';
    } else if(allowPostOverride(options.postOverride, method)) {
      params._method = method;
      method = 'POST';
    }

    fullURL = util.getFullURL(url, params);

    if(cached = cacheRetrieve(context, fullURL, options)) {
      callOptionalCallback(context, options.complete, cached);
      callOptionalCallback(context, options.success, cached);
      return util.Deferred().resolve(cached);
    }

    if(util.splitRequest(fullURL, options)) {
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
        if(util.isArray(split)) {

          arrayEach(split, function(request) {
            deferred.push(initiateRequest(context, request.url, method, request.params, options));
          });

          return util.when.apply(deferred).fail(function(data) {
            callOptionalCallback(context, callbacks.error, data);
          }).done(function(data) {
            callOptionalCallback(context, callbacks.complete, data);
            callOptionalCallback(context, callbacks.success, data);
          });

        }
      }
      callOptionalCallback(context, options.error, {});
      return util.Deferred().reject('Error: Max URL length exceeded!');
    }

    deferred = util.ajax(context, method, url, params, options);
    cacheCapture(context, intendedMethod, deferred, fullURL, options);

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

  function callOptionalCallback(context, callback, data) {
    if(callback) {
      callback.call(context, data);
    }
  }

  function switchToJSONP(context, options) {
    return ((!options.cors || !util.supportsCORS()) && options.jsonp && options.dataFormat == 'json' && !isSameDomain(context));
  }

  function isSameDomain(context) {
    return util.getLocationValue('hostname') == context.domain() && util.getLocationValue('port') == context.port();
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


  // Authorization helpers

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
    var deferred = util.Deferred();
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

  // Defining an object of jQuery specific implementations
  // that can later be overwritten in node.

  var util = {
    Deferred: function() {
      return $.Deferred();
    },
    supportsCORS: function() {
      return $.support.cors;
    },
    splitRequest: function(url, options) {
      return options.dataType == 'jsonp' && url.length > MAX_SIZE_FOR_JSONP_REQUESTS;
    },
    isArray: function(obj) {
      return $.isArray(obj);
    },
    ajax: function(context, method, url, params, options) {
      options.data = params;
      options.type = method;
      if(options.contentType == 'json') {
        options.contentType = 'application/json';
        options.processData = false;
        if(options.data && typeof options.data != 'string') {
          try {
            options.data = JSON.stringify(options.data);
          } catch(e) {
            // Give a better description and re-throw.
            e.description = JSON_STRINGIFY_ERROR;
            throw e;
          }
        }
      } else if(options.contentType == 'form') {
        // "contentType" is the header so default header takes over here.
        delete options.contentType;
      }
      return $.ajax(url, options);
    },
    when: function() {
      return $.when.apply(this, arguments);
    },
    getLocationValue: function(parameter) {
      return window.location[parameter];
    },
    getFullURL: function(url, params) {
      var stringParams = $.param(params);
      if(stringParams) {
        url += '?' + $.param(params);
      }
      return url;
    }
  };

  // Environment agnostic utility methods

  function objectEach(obj, fn) {
    if(obj) {
      for(var key in obj) {
        if(fn.call(obj, key, obj[key], obj) === false) {
          break;
        }
      }
    }
  }

  function arrayEach(arr, fn) {
    if(typeof arr === 'string') arr = arr.split(',');
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

  function merge() {
    var target = {};
    arrayEach(arguments, function(obj) {
      extend(target, obj);
    });
    return target;
  }

  function extend(target, source) {
    for(var key in source) {
      target[key] = source[key];
    }
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


  extend(APIConnect.prototype, InstanceMethods);


  if(typeof module !== 'undefined') {
    APIConnect.util = util;
    module.exports = APIConnect;
  } else {
    context.APIConnect = APIConnect;
  }


})(this);
