(function() {

  /*
  var ACTIONS = {
    'index':    { method: 'GET',    resource: false, verb: 'get'     },
    'show':     { method: 'GET',    resource: true,  verb: 'get'     },
    'create':   { method: 'POST',   resource: false  verb: 'create'  },
    'update':   { method: 'PUT',    resource: true   verb: 'update'  },
    'destroy':  { method: 'DELETE', resource: true   verb: 'destroy' }
  }

  var SINGULAR_ACTIONS = [
    ACTIONS['show'],
    ACTIONS['create'],
    ACTIONS['update'],
    ACTIONS['destroy']
  ];

  var PLURAL_ACTIONS = [
    ACTIONS['index'],
    ACTIONS['show'],
    ACTIONS['create'],
    ACTIONS['update'],
    ACTIONS['destroy']
  ];
  */

  function getterOrSetter(field) {
    return function(set) {
      if(set === undefined) {
        return this.defaults[field];
      } else {
        this.defaults[field] = set;
        return this;
      }
    }
  }


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

  /*
  function routesRoutine(plural) {
    return function(name, options, fn) {
      var verbs          = RESTFUL_VERBS.concat(),
          context        = this.routesContext || this,
          fullName       = this.routesPrefix + capitalize(name),
          level          = this.routesLevel,
          fullPluralName = this.routesPrefix + capitalize(pluralize(name));
      if(typeof options == 'function') {
        fn = options;
        options = {};
      }
      options = options || {};
      arrayEach(['only','except'], function(opt) {
        verbs = restrictVerbs(verbs, options[opt], opt == 'only');
      });
      arrayEach(verbs, function(verb) {
        var name = verb + (verb == 'get' && plural ? fullPluralName : fullName);
        context[name] = function() {
          runRoute(context, level, verb, arguments);
        }
      });
      if(fn) {
        fn.call(context, new RouteSet(context, fullName, level + 1));
      }
    }
  }
  */

  function runRoute(context, level, verb, arguments) {
    var args = Array.prototype.slice.call(arguments);
  }

  //function buildURL(context, ) {
    
  //}

  // Utility methods

  function arrayEach(arr, fn) {
    for(var i = 0; i < arr.length; i++) {
      if(fn.call(arr, arr[i], i, arr) === false) {
        break;
      }
    }
  }

  function iterateOverObject(obj, fn) {
    var key, keys = [];
    for(key in obj) {
      if(obj.hasOwnProperty(key)) {
        if(fn) fn(key, obj[key]);
        keys.push(key);
      }
    }
    return keys;
  }

  function camelize(str) {
    return str.replace(/-/g, '_').replace(/(^|_)([^_]+)/g, function(match, pre, word) {
      return word.slice(0, 1).toUpperCase() + word.slice(1);
    });
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
   { reg: /(alias|status)es$/gi, to: '$1' },
   { reg: /(octop|vir)i$/gi, to: '$1us' },
   { reg: /(cris|ax|test)es$/gi, to: '$1is' },
   { reg: /(shoe)s$/gi, to: '$1' },
   { reg: /(o)es$/gi, to: '$1' },
   { reg: /(bus)es$/gi, to: '$1' },
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

  function extend(klass, methods) {
    for(var key in methods) {
      klass.prototype[key] = methods[key];
    }
  }

  /*
  RouteSet = function(context, prefix, level) {
    this.routesContext = context;
    this.routesPrefix  = prefix || '';
    this.routesLevel   = level || 1;
  }

  extend(RouteSet, {

    resource: routesRoutine(false),

    resources: routesRoutine(true)

  });
  */

  APIInterface = function() {
    this.defaults = {
      protocol: window.location.protocol,
      domain: '',
      port: '',
      format: 'json'
    };
    this.base = [];
    this.routeset = new Routeset(this);
  };

  //extend(APIInterface, new RouteSet);


  function dynamicArray(arr, fn) {
    arr = arr || [];
    if(typeof arr == 'string') {
      arr = arr.split(',');
    }
    arrayEach(arr, fn);
  }

  function actionIsPlural(action) {
    return action == 'index' || action == 'create';
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
        if(param == 'id' && !previous.param) {
          // ex. /users/:id should expect either :id or :user_id
          // ex. tweets/:user/:id should not follow this pattern, however.
          setFragmentAndPrevious('expected', previous.singular + '_id');
          setFragmentAndPrevious('id_expected', true);
          previous.name = previous.singular;
        } else if(param.replace(/_id$/, '') == previous.singular) {
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
    var name = HTTP_VERBS[method].human, reversed;
    if(routingOptions.name) {
      name += camelize(routingOptions.name);
    } else {
      reversed = routeObject.concat().reverse();
      arrayEach(reversed, function(el) {
        if(!el.param) {
          name += camelize(el.name || el.text);
          return false;
        }
      });
    }
    return name;
  }

  var routeObjectsForMethodNames = {};

  function mergeRoutes(routes1, routes2) {
    var fragmentsToMerge = [],
        startIndex;

        console.info(routes1.map(function(a){ return a.text; }), routes2.map(function(a){ return a.text; }));
    arrayEach(routes2, function(fragment, i) {
      if(!routes1 || routes1.text != fragment.text) {
        fragmentsToMerge.push(fragment);
        if(startIndex === undefined) startIndex = i;
      } else if(startIndex !== undefined) {
        return false;
      }
    });
    Array.prototype.splice.apply(routes1, [startIndex, 0].concat(fragmentsToMerge));
  }

  function connectRoute(context, method, route, routingOptions) {

    routingOptions = routingOptions || {};

    var routeObject = getRouteObject(context, route, routingOptions, method);
    var methodName  = routingOptions.as || getMethodName(method, routeObject, routingOptions);

    routingOptions = routingOptions || {};

    if(context[methodName]) {
      mergeRoutes(routeObjectsForMethodNames[methodName], routeObject);
      return;
    }

    routeObjectsForMethodNames[methodName] = routeObject;

    context[methodName] = function(params, localOptions) {

      var url = '',
          options;

      params  = params  || {};
      options = $.extend({}, context.defaults, localOptions);

      url += options.protocol.replace(/:*$/, '://');
      url += options.domain;
      url += options.port;

      arrayEach(routeObject, function(fragment) {

        var paramsExpected,
            foundParam;

        paramsExpected = fragment.expected || fragment.id_expected;
        foundParam = (fragment.expected && params[fragment.expected]) || (fragment.id_expected && params['id']);

        // Add the fragment if it was either not expected a matching param,
        // or if it was exepecting one and it was found.
        if((paramsExpected && foundParam) || (!paramsExpected && !fragment.param)) {
          url += '/' + (fragment.param ? foundParam : fragment.text);
        }

      });

      url += '.' + options.format;

      context.last = {
        url: url,
        method: method,
        params: params
      }
    }
  }


  var HTTP_VERBS = {
    'GET':    { name: 'get',  human: 'get',    },
    'POST':   { name: 'post', human: 'create'  },
    'PUT':    { name: 'put',  human: 'update'  },
    'DELETE': { name: 'del',  human: 'destroy' }
  };

  var RESOURCE_ROUTES = [
    { name: 'index',   method: 'get',  has_id: false },
    { name: 'show',    method: 'get',  has_id: true  },
    { name: 'create',  method: 'post', has_id: false },
    { name: 'update',  method: 'put',  has_id: true  },
    { name: 'destroy', method: 'del',  has_id: true  }
  ]

  var GET_OR_SET_METHODS = [ 'protocol', 'domain', 'port', 'format' ];

  var InstanceMethods = {};

  iterateOverObject(HTTP_VERBS, function(method, obj) {
    // Thank you very much for your reserved keywords, IE...
    InstanceMethods[obj.name] = function(route, options) {
      connectRoute(this, method, route, options);
    }
  });

  arrayEach(GET_OR_SET_METHODS, function(name) {
    InstanceMethods[name] = function(set) {
      if(set === undefined) {
        return this.defaults[name];
      } else {
        this.defaults[name] = set;
        return this;
      }
    }
  });

  InstanceMethods['context'] = function(name, fn) {
    var prev = this.base;
    this.base = this.base.concat(getRouteObject(this, name, {}));
    fn.call(this);
    this.base = prev;
  }

  InstanceMethods['resource'] = function(name, options) {
    options = options || {};
    var context = this,
        singular = singularize(name),
        isPlural = singular != name,
        actions = RESOURCE_ROUTES.concat(),
        isCollection = options.collection || isPlural;

    arrayEach(['only','except'], function(opt) {
      actions = restrictActions(actions, options[opt], opt == 'only');
    });

    arrayEach(actions, function(action) {
      var route = name,
          isIndex = action.name == 'index';
      if(isCollection && action.has_id) {
        route += '/:id';
      }
      // Names like "getEquipment" will collide, so only set them up once. Passing a forced "collection"
      // property will allow an optional context later to handle both "index" and "show" actions in these edge cases.
      if(!isIndex || isPlural) {
        context[action.method](route, { name: isIndex ? name : singular, collection: options.collection });
      }
    });

  }



  extend(APIInterface, InstanceMethods);


  /*j
  function setupNewRoutes(routeset, actions, name, args, plural) {
    var options,
        fn,
        fullName = capitalize(name);

    if(typeof args[1] == 'function') {
      options = {};
      fn = args[1];
    } else {
      options = args[1] || {};
      fn = args[2];
    }

    arrayEach(['only','except'], function(opt) {
      actions = restrictActions(actions, options[opt], opt == 'only');
    });

    arrayEach(actions, function(action) {
      routeset.connect(action, fullName, plural);
    });
    if(fn) {
      fn.call(routeset.context, new Routeset(routeset.context, fullName, routeset));
    }
  }
  */

  function Routeset(context, name, set) {
    this.context = context;
    this.name = name || '';
    this.super = set;
  }

  extend(Routeset, {
    resource: function(name, options) {
      return;
      options = options || {};

      arrayEach(['only','except'], function(opt) {
        actions = restrictActions(actions, options[opt], opt == 'only');
      });


      setupNewRoutes(this, SINGULAR_ACTIONS, name, arguments, false);
    },
    /*
    resources: function(name) {
      setupNewRoutes(this, PLURAL_ACTIONS, name, arguments, true);
    },
    connect: function(action, name, plural) {
      //var name = verb == 'get' && plural ? pluralize(fullName) : fullName;
      if(plural && verb == 'get') {
        name = pluralize(name);
      }
      var set = this, action = verb + this.name + name;
      this.context[action] = function() {
      }
    },
    getFullPathAndResource: function(verb, args) {
      var set = this, full = '', ordered = typeof args != 'object';
      while(set) {
        full = set.name + '/';
        set = set.super;
      }
      return full + (path || '');
    }
    */
  });

  /*jjjjjjjjjjjjjjj
      var verbs          = RESTFUL_VERBS.concat(),
          context        = this.routesContext || this,
          fullName       = this.routesPrefix + capitalize(name),
          level          = this.routesLevel,
          fullPluralName = this.routesPrefix + capitalize(pluralize(name));
      if(typeof options == 'function') {
        fn = options;
        options = {};
      }
      options = options || {};
      arrayEach(['only','except'], function(opt) {
        verbs = restrictVerbs(verbs, options[opt], opt == 'only');
      });
      arrayEach(verbs, function(verb) {
        var name = verb + (verb == 'get' && plural ? fullPluralName : fullName);
        context[name] = function() {
          runRoute(context, level, verb, arguments);
        }
      });
      if(fn) {
        fn.call(context, new RouteSet(context, fullName, level + 1));
      }

      */

})();
