(function() {

  var ACTIONS = {
    'index':   { verb: 'get',     method:  'GET',    plural:  true  },
    'show':    { verb: 'get',     method:  'GET',    plural:  false },
    'create':  { verb: 'create',  method:  'POST',   plural:  true  },
    'update':  { verb: 'update',  method:  'PUT',    plural:  false },
    'destroy': { verb: 'destroy', method:  'DELETE', plural:  false }
  }

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
    var result = [], match;
    if(!restrictedActions) return actions;
    dynamicArray(restrictedActions, function(action, i, arr) {
      match = arrayAny(arr, action);
      if((match && only) || (!match && !only)) {
        result.push(action);
      }
    });
    return result;
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

  function arrayAny(arr, find) {
    for(var i = 0; i < arr.length; i++) {
      if(arr[i] === find) {
        return true;
      }
    }
    return false;
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

  function pluralize(str) {
    arrayEach(PLURAL_REPLACEMENTS, function(r) {
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


  function connectRoute(context, route, action, routingOptions) {
    routingOptions = routingOptions || {};
    if(action == 'index' && routingOptions.plural !== false) {
      route = pluralize(route);
    }
    context[ACTIONS[action].verb + camelize(route)] = function(params, localOptions) {

      var url = '',
          options;

      params  = params  || {};
      options = $.extend({}, context.defaults, routingOptions, localOptions);

      url += options.protocol.replace(/:*$/, '://');
      url += options.domain;
      url += options.port;
      url += '/';

      dynamicArray(options.prefix, function(p) {
        url += p + '/';
      });

      dynamicArray(options.context, function(context) {
        var plural, prop;
        if(options.hasOwnProperty('plural')) {
          plural = options.plural;
        }
        if(typeof context == 'object') {
          plural  = context.plural;
          context = context.text;
        }
        prop = params[context + '_id'];
        if(prop) {
          if(context.hasOwnProperty('plural')) {
            plural = context.plural;
            context = context.text;
          }
          if(plural === undefined) {
            context = pluralize(context);
          } else if(plural) {
            context = plural;
          }
          url += context + '/' + prop + '/';
        }
      });

      url += routingOptions.plural === false ? route : pluralize(route);

      if(params.id && !ACTIONS[action].plural) {
        url += '/' + params.id;
      }

      url += '.' + options.format;

      context.last = {
        url: url,
        method: ACTIONS[action].method,
        params: params
      }
    }
  }

  function getRouteObject(route) {
    var prev, result = [], method = '';
    arrayEach(route.split('/'), function(chunk, i) {
      var match = chunk.match(/^:(.+)$/), param = match && match[1], obj = {};
      if(param) {
        if(param == 'id' && prev) {
          obj.param = singularize(chunk) + '_id';
        } else {
          obj.param = param;
        }
        prev = null;
      } else {
        prev = chunk;
      }
      obj.name = chunk;
      result.push(obj);
    });
    console.info('nein', result);
    return result;
  }

  extend(APIInterface, {

    resource: function(resource, options) {

      var actions = iterateOverObject(ACTIONS), context = this;

      options = options || {};

      arrayEach(['only','except'], function(opt) {
        actions = restrictActions(actions, options[opt], opt == 'only');
      });

      arrayEach(actions, function(action) {
        connectRoute(context, resource, action, options);
      });

      //this.routeset.resource.apply(this.routeset, arguments);
    },

    get: function(route, options) {
      var o = getRouteObject(route);
      connectRoute(this, 'get', route, options);
    },

    index: function(route, options) {
      connectRoute(this, route, 'index', options);
    },

    show: function(route, options) {
      connectRoute(this, route, 'show', options);
    },

    create: function(route, options) {
      connectRoute(this, route, 'create', options);
    },

    update: function(route, options) {
      connectRoute(this, route, 'update', options);
    },

    destroy: function(route, options) {
      connectRoute(this, route, 'destroy', options);
    },

    protocol:  getterOrSetter('protocol'),
    domain:    getterOrSetter('domain'),
    port:      getterOrSetter('port'),
    format:    getterOrSetter('format')

  });


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
      console.info('UMMM', action);
      this.context[action] = function() {
        console.info('trying to connect!', set.getFullPathAndResource(verb, arguments));
      }
    },
    getFullPathAndResource: function(verb, args) {
      var set = this, full = '', ordered = typeof args != 'object';
      while(set) {
        full = set.name + '/';
        set = set.super;
      }
      console.info('anoo', verb, args);
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
