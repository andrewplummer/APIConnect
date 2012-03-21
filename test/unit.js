(function() {



  if(typeof QUnit !== 'undefined') {
    testModule = QUnit.module;
  }

  // Local vars

  var api, capturedRequests = [], counter, apiError;

  if(typeof exports !== 'undefined') {
    setupNode();
  } else {
    setupClient();
  }

  function setupNode() {

    // Custom non-QUnit stuff
    require('./setup');
    environment = 'node';
    equals = equal;

    require('./unit');

    APIConnect = require('../lib/main');

    // Mock jQuery for the tests
    $ = {
      Deferred: require('jquery-deferred').Deferred,
      support: { cors: true }
    };

    // Mock the window
    window = {
      location: {
      }
    }

    // Hacking the prototype to capture the request
    require('request')('http://localhost').__proto__.init = function(options) {
      var captureOptions = {
        options: options,
        type: this.method,
        data: this.method == 'GET' ? options.qs : options.form
      };
      if(options.json) {
        captureOptions.data = JSON.stringify(options.json);
      }
      captureRequest(this.url, captureOptions);
      options.callback(null, null, '{ "response": "RESPONDED!" }');
      return this;
    }

    setTimeout(function() {
      syncTestsFinished();
    }, 1);

  }

  function setupClient() {
    environment = 'client';
    // Capture the request directly
    $.ajax = captureRequest;
  }

  // Utility methods

  function captureRequest(url, options) {
    capturedRequests.push({ url: url, options: options, params: options.data, method: options.type, options: options });
    var response = options.dataType == 'json' ? { response: 'RESPONDED!' } : 'RESPONDED!';
    if(apiError) {
      if(options.error) {
        options.error(response);
      }
      return $.Deferred().reject(response);
    } else {
      if(options.complete) {
        options.complete(response);
      }
      if(options.success) {
        options.success(response);
      }
      return $.Deferred().resolve(response);
    }
  }

  function overrideIfRequestIsJSONP(params, method, setting) {
    return params._method != 'GET' &&
           !$.support.cors &&
           (setting == 'jsonp' || (setting == 'jsonp-except-get' && method != 'GET'));
  }

  function withoutCorsSupport(fn) {
    var was = $.support.cors;
    $.support.cors = false;
    fn();
    $.support.cors = was;
  }

  function simulateAPIError(fn) {
    apiError = true;
    fn();
    apiError = false;
  }

  function getLastRequest() {
    return capturedRequests[capturedRequests.length - 1];
  }

  function assertRouteCalled(context, url, method, params) {
    var request = getLastRequest(),
        expectedParamsLength = 0,
        actualParamsLength = 0;

    params = params || {};

    if(overrideIfRequestIsJSONP(params, method, context.defaultOptions.getOverride)) {
      if(!params._method) params._method = method;
      method = 'GET';
    }
    equals(request.url, url, 'Last URL was: ' + url);
    equals(request.method, method, 'Last method was: ' + method);
    if(typeof params == 'string') {
      equals(request.params, params, 'Params was a string and was equal');
    } else {
      for(var key in params) {
        equals(String(request.params[key]), String(params[key]), 'Params ' + key + ' was: ' + params[key]);
        expectedParamsLength += 1;
      }
      for(var key in request.params) {
        actualParamsLength += 1;
      }
    }
    equals(actualParamsLength, expectedParamsLength, 'Params length was correct');
  }

  function assertLastWasContentType(type) {
    var options = getLastRequest().options;
    if(environment == 'node') {
      if(type == 'json') {
        equals(options.json === 'undefined', false, '.json was defined');
      } else {
        equals(options.form === 'undefined', false, '.form was defined');
      }
    } else {
      if(type == 'json') {
        equals(options.contentType, 'application/json', 'Last request was application/json');
        equals(options.processData, false, 'Last request did not process data');
        equals(typeof options.data, 'string', 'Last request data was a string');
      } else {
        equals(options.contentType, undefined, 'Last request was application/json');
        equals(options.processData, undefined, 'Last request did not process data');
        equals(typeof options.data, 'object', 'Last request data was a string');
      }
    }
  }

  function arrayEach(arr, fn) {
    for(var i = 0; i < arr.length; i++) {
      if(fn.call(arr, arr[i], i, arr) === false) {
        break;
      }
    }
  }

  function updateCounter() {
    counter++;
  }

  testModule('APIConnect', {
    setup: function() {
      api = new APIConnect();
      api.domain('domain');
      capturedRequests = [];
      counter = 0;
      apiError = false;
    }
  });


  // START TESTS


  test('Domain Setup', function() {
    equal(api.domain('test'), api, 'APIConnect#domain setting should return the instance');
    equal(api.domain(), 'test', ' APIConnect#domain calling without arguments should return the field');
  });

  test('Custom Setters', function() {

    api.protocol('https');
    api.domain('twotter.com');
    api.port('5000');
    api.format('xml');

    api.connect('foobar');
    api.getFoobar();

    assertRouteCalled(api, 'https://twotter.com:5000/foobar', 'GET')

  });

  test('get | home_timeline', function() {
    api.connect('home_timeline');
    equal(typeof api.getHomeTimeline, 'function', 'show exists');
    equal(typeof api.getHomeTimelines, 'undefined', 'index does not exist');
    equal(typeof api.createHomeTimeline, 'undefined', 'create does not exist');
    equal(typeof api.updateHomeTimeline, 'undefined', 'update does not exist');
    equal(typeof api.destroyHomeTimeline, 'undefined', 'delete does not exist');

    api.getHomeTimeline();
    assertRouteCalled(api, 'http://domain/home_timeline', 'GET')

  });



  test('post | home_timeline', function() {
    api.connect('POST home_timeline');
    equal(typeof api.getHomeTimeline, 'undefined', 'show does not exist');
    equal(typeof api.getHomeTimelines, 'undefined', 'index does not exist');
    equal(typeof api.createHomeTimeline, 'function', 'create exists');
    equal(typeof api.updateHomeTimeline, 'undefined', 'update does not exist');
    equal(typeof api.destroyHomeTimeline, 'undefined', 'delete does not exist');

    api.createHomeTimeline();
    assertRouteCalled(api, 'http://domain/home_timeline', 'POST')

  });


  test('put | home_timeline', function() {
    api.connect('PUT home_timeline');
    equal(typeof api.getHomeTimeline, 'undefined', 'show does not exist');
    equal(typeof api.getHomeTimelines, 'undefined', 'index does not exist');
    equal(typeof api.createHomeTimeline, 'undefined', 'create does not exist');
    equal(typeof api.updateHomeTimeline, 'function', 'update exists');
    equal(typeof api.destroyHomeTimeline, 'undefined', 'delete does not exist');

    api.updateHomeTimeline();
    assertRouteCalled(api, 'http://domain/home_timeline', 'PUT')

  });

  test('delete | home_timeline', function() {
    api.connect('DELETE home_timeline');
    equal(typeof api.getHomeTimeline, 'undefined', 'show does not exist');
    equal(typeof api.getHomeTimelines, 'undefined', 'index does not exist');
    equal(typeof api.createHomeTimeline, 'undefined', 'create does not exist');
    equal(typeof api.updateHomeTimeline, 'undefined', 'update does not exist');
    equal(typeof api.destroyHomeTimeline, 'function', 'delete exists');

    api.destroyHomeTimeline();
    assertRouteCalled(api, 'http://domain/home_timeline', 'DELETE')

  });

  test('basic twitter GET routes with context', function() {

    var twitter_routes = [
      ['home_timeline','HomeTimeline'],
      ['mentions','Mentions'],
      ['public_timeline','PublicTimeline'],
      ['retweeted_by_me','RetweetedByMe'],
      ['retweeted_to_me','RetweetedToMe'],
      ['retweets_of_me','RetweetsOfMe'],
      ['user_timeline','UserTimeline'],
      ['retweeted_to_user','RetweetedToUser'],
      ['retweeted_by_user','RetweetedByUser']
    ];

    api.context('statuses', function() {
      arrayEach(twitter_routes, function(route) {
        api.connect(route[0]);
      });
    });

    arrayEach(twitter_routes, function(route) {
      var method = api['get' + route[1]];
      equal(typeof method, 'function', route[0] + ' exists');
      method();
      assertRouteCalled(api, 'http://domain/statuses/' + route[0] + '', 'GET');
    });

  });


  test('twitter routes with params', function() {

    api.context('statuses/:id', function() {
      api.connect('retweeted_by');
    });

    equal(typeof api.getRetweetedBy, 'function', 'route exists');
    api.getRetweetedBy({ id: 18 });
    assertRouteCalled(api, 'http://domain/statuses/18/retweeted_by', 'GET');
    api.getRetweetedBy();
    assertRouteCalled(api, 'http://domain/retweeted_by', 'GET');

  });



  test('returns from compound context', function() {

    api.context('statuses/:status_id', function() {
      api.connect('profile');
    });
    api.connect('moof');

    api.getProfile({ status_id: 15 });
    assertRouteCalled(api, 'http://domain/statuses/15/profile', 'GET');
    api.getProfile({ id: 15 });
    assertRouteCalled(api, 'http://domain/profile', 'GET', { id: 15 });

    api.getMoof({ status_id: 15 });
    assertRouteCalled(api, 'http://domain/moof', 'GET', { status_id: 15 });
    api.getMoof({ id: 15 });
    assertRouteCalled(api, 'http://domain/moof', 'GET', { id: 15 });
    api.getMoof();
    assertRouteCalled(api, 'http://domain/moof', 'GET');


  });


  test('single show context', function() {

    api.connect('statuses/:status_id');

    api.getStatus({ status_id: 15 });
    assertRouteCalled(api, 'http://domain/statuses/15', 'GET');
    api.getStatus({ id: 15 });
    assertRouteCalled(api, 'http://domain', 'GET', { id: 15 });
    api.getStatus();
    assertRouteCalled(api, 'http://domain', 'GET');

  });


  test('deep optional contexts', function() {

    api.connect('goals/:goal_id/items/:item_id/sentences/:sentence_id');

    api.getSentence({ sentence_id: 15, item_id: 19, goal_id: 2 });
    assertRouteCalled(api, 'http://domain/goals/2/items/19/sentences/15', 'GET');

    api.getSentence({ item_id: 19, goal_id: 2 });
    assertRouteCalled(api, 'http://domain/goals/2/items/19', 'GET');

    api.getSentence({ goal_id: 2 });
    assertRouteCalled(api, 'http://domain/goals/2', 'GET');

    api.getSentence({ sentence_id: 15, goal_id: 2 });
    assertRouteCalled(api, 'http://domain/goals/2/sentences/15', 'GET');

    api.getSentence({ sentence_id: 15 });
    assertRouteCalled(api, 'http://domain/sentences/15', 'GET');

    api.getSentence();
    assertRouteCalled(api, 'http://domain', 'GET');

  });


  test('multiple optional contexts', function() {

    api.connect('goals/:goal_id/items/:item_id/sentences/:sentence_id');
    api.connect('goals/:goal_id/items/:item_id');
    api.connect('goals/:goal_id');

    api.getSentence({ sentence_id: 15, item_id: 19, goal_id: 2 });
    assertRouteCalled(api, 'http://domain/goals/2/items/19/sentences/15', 'GET');

    api.getItem({ item_id: 19, goal_id: 2 });
    assertRouteCalled(api, 'http://domain/goals/2/items/19', 'GET');

    api.getGoal({ goal_id: 2 });
    assertRouteCalled(api, 'http://domain/goals/2', 'GET');

    api.getGoal({ sentence_id: 15 });
    assertRouteCalled(api, 'http://domain', 'GET', { sentence_id: 15 });

  });


  test('create | multiple optional contexts', function() {

    api.connect('POST goals/:goal_id/items/:item_id/sentences/:sentence_id');
    api.connect('POST goals/:goal_id/items/:item_id');
    api.connect('POST goals/:goal_id');

    api.createSentence({ sentence_id: 15, item_id: 19, goal_id: 2 });
    assertRouteCalled(api, 'http://domain/goals/2/items/19/sentences/15', 'POST');

    api.createItem({ item_id: 19, goal_id: 2 });
    assertRouteCalled(api, 'http://domain/goals/2/items/19', 'POST');

    api.createGoal({ goal_id: 2 });
    assertRouteCalled(api, 'http://domain/goals/2', 'POST');

    api.createGoal({ sentence_id: 15 });
    assertRouteCalled(api, 'http://domain', 'POST', { sentence_id: 15 });

  });

  test('destroy | multiple optional contexts', function() {

    api.connect('DELETE goals/:goal_id/items/:item_id/sentences/:sentence_id');
    api.connect('DELETE goals/:goal_id/items/:item_id');
    api.connect('DELETE goals/:goal_id');

    api.destroySentence({ sentence_id: 15, item_id: 19, goal_id: 2 });
    assertRouteCalled(api, 'http://domain/goals/2/items/19/sentences/15', 'DELETE');

    api.destroyItem({ item_id: 19, goal_id: 2 });
    assertRouteCalled(api, 'http://domain/goals/2/items/19', 'DELETE');

    api.destroyGoal({ goal_id: 2 });
    assertRouteCalled(api, 'http://domain/goals/2', 'DELETE');

    api.destroyGoal({ sentence_id: 15 });
    assertRouteCalled(api, 'http://domain', 'DELETE', { sentence_id: 15 });

  });

  test('resource | basic', function() {

    api.resource('tweet');

    api.getTweet();
    assertRouteCalled(api, 'http://domain/tweet', 'GET');

    api.createTweet();
    assertRouteCalled(api, 'http://domain/tweet', 'POST');

    api.updateTweet();
    assertRouteCalled(api, 'http://domain/tweet', 'PUT');

    api.destroyTweet();
    assertRouteCalled(api, 'http://domain/tweet', 'DELETE');

    equal(typeof api.getTweets, 'undefined', 'index does not exist');

  });


  test('resource | collection', function() {

    api.resource('tweets');

    api.getTweet({ id: 3 });
    assertRouteCalled(api, 'http://domain/tweets/3', 'GET');

    api.getTweet();
    assertRouteCalled(api, 'http://domain', 'GET');

    api.createTweet();
    assertRouteCalled(api, 'http://domain/tweets', 'POST');

    api.updateTweet({ id: 3 });
    assertRouteCalled(api, 'http://domain/tweets/3', 'PUT');

    api.updateTweet();
    assertRouteCalled(api, 'http://domain', 'PUT');

    api.destroyTweet({ id: 3 });
    assertRouteCalled(api, 'http://domain/tweets/3', 'DELETE');

    // Also index route
    api.getTweets();
    assertRouteCalled(api, 'http://domain/tweets', 'GET');

  });


  test('resource | uncountable collection', function() {

    api.resource('equipment', { collection: true });

    api.getEquipment({ id: 3 });
    assertRouteCalled(api, 'http://domain/equipment/3', 'GET');

    // Doubles as index route when collection: true
    api.getEquipment();
    assertRouteCalled(api, 'http://domain/equipment', 'GET');

    api.createEquipment();
    assertRouteCalled(api, 'http://domain/equipment', 'POST');

    api.updateEquipment({ id: 3 });
    assertRouteCalled(api, 'http://domain/equipment/3', 'PUT');

    api.updateEquipment();
    assertRouteCalled(api, 'http://domain', 'PUT');

    api.destroyEquipment({ id: 3 });
    assertRouteCalled(api, 'http://domain/equipment/3', 'DELETE');

    api.destroyEquipment();
    assertRouteCalled(api, 'http://domain', 'DELETE');

  });


  test('resource | uncountable collection on explicit GET', function() {

    api.connect('tweets/:tweet_id', { collection: true });

    api.getTweet({ tweet_id: 3 });
    assertRouteCalled(api, 'http://domain/tweets/3', 'GET');

    api.getTweet();
    assertRouteCalled(api, 'http://domain/tweets', 'GET');

  });


  test('resource | uncountable collection on explicit GET routed with context', function() {

    api.context('tweets/:tweet_id', function() {
      api.connect('status', { collection: true });
    });

    api.getStatus({ tweet_id: 3 });
    assertRouteCalled(api, 'http://domain/tweets/3/status', 'GET');

    api.getStatus();
    assertRouteCalled(api, 'http://domain/status', 'GET');

  });

  test('resource with compound context', function() {

    api.context('foo/:foo_id/bar/:bar_id', function() {
      api.resource('status');
    });

    api.getStatus();
    assertRouteCalled(api, 'http://domain/status', 'GET')

    api.getStatus({ foo_id: 5 });
    assertRouteCalled(api, 'http://domain/foo/5/status', 'GET')

    api.getStatus({ foo_id: 5, bar_id: 7 });
    assertRouteCalled(api, 'http://domain/foo/5/bar/7/status', 'GET')

    api.getStatus({ bar_id: 7 });
    assertRouteCalled(api, 'http://domain/bar/7/status', 'GET')


  });

  test('resource with inline context', function() {

    api.resource('foo/:foo_id/bar/:bar_id/status');

    api.getStatus();
    assertRouteCalled(api, 'http://domain/status', 'GET')

    api.getStatus({ foo_id: 5 });
    assertRouteCalled(api, 'http://domain/foo/5/status', 'GET')

    api.getStatus({ foo_id: 5, bar_id: 7 });
    assertRouteCalled(api, 'http://domain/foo/5/bar/7/status', 'GET')

    api.getStatus({ bar_id: 7 });
    assertRouteCalled(api, 'http://domain/bar/7/status', 'GET')


  });



  test('custom twitter routes', function() {

    api.context('statuses/:id', function() {

      api.connect('retweeted_by');
      api.connect('retweeted_by/ids');

    });

    api.context('statuses', function() {

      api.connect('POST destroy/:id', { as: 'destroyTweet' });
      api.connect('POST retweet/:id');
      api.connect('POST update', { as: 'updateStatus' });
      api.connect('POST update_with_media', { as: 'updateStatusWithMedia' });
      api.connect('oembed');

    });


    api.getRetweetedBy({ id: 13 });
    assertRouteCalled(api, 'http://domain/statuses/13/retweeted_by', 'GET');

    api.getRetweetedBy({ status_id: 13 });
    assertRouteCalled(api, 'http://domain/statuses/13/retweeted_by', 'GET');

    api.getIds({ id: 13 });
    assertRouteCalled(api, 'http://domain/statuses/13/retweeted_by/ids', 'GET');

    api.destroyTweet({ id: 13 });
    assertRouteCalled(api, 'http://domain/statuses/destroy/13', 'POST');

    api.createRetweet({ id: 13 });
    assertRouteCalled(api, 'http://domain/statuses/retweet/13', 'POST');

    api.updateStatus();
    assertRouteCalled(api, 'http://domain/statuses/update', 'POST');

    api.updateStatusWithMedia();
    assertRouteCalled(api, 'http://domain/statuses/update_with_media', 'POST');

    api.getOembed();
    assertRouteCalled(api, 'http://domain/statuses/oembed', 'GET');

  });


  test('Resource | only get', function() {
    api.resource('cat', { only: 'show' });
    equal(typeof api.getCat, 'function', 'get exists');
    equal(typeof api.createCat, 'undefined', 'create does not exist');
    equal(typeof api.updateCat, 'undefined', 'update does not exist');
    equal(typeof api.destroyCat, 'undefined', 'delete does not exist');
  });

  test('Resource | only create', function() {
    api.resource('cat', { only: 'create' });
    equal(typeof api.getCat, 'undefined', 'get does not exist');
    equal(typeof api.createCat, 'function', 'create exists');
    equal(typeof api.updateCat, 'undefined', 'update does not exist');
    equal(typeof api.destroyCat, 'undefined', 'delete does not exist');
  });

  test('Resource | only update and destroy', function() {
    api.resource('cat', { only: ['update','destroy'] });
    equal(typeof api.getCat, 'undefined', 'get does not exist');
    equal(typeof api.createCat, 'undefined', 'create does not exist');
    equal(typeof api.updateCat, 'function', 'update exists');
    equal(typeof api.destroyCat, 'function', 'delete exists');
  });

  test('Resource | only update and destroy CSV', function() {
    api.resource('cat', { only: 'update,destroy' });
    equal(typeof api.getCat, 'undefined', 'get does not exist');
    equal(typeof api.createCat, 'undefined', 'create does not exist');
    equal(typeof api.updateCat, 'function', 'update exists');
    equal(typeof api.destroyCat, 'function', 'delete exists');
  });

  test('Resource | except create', function() {
    api.resource('cat', { except: 'create' });
    equal(typeof api.getCat, 'function', 'get exists');
    equal(typeof api.createCat, 'undefined', 'create does not exist');
    equal(typeof api.updateCat, 'function', 'update exists');
    equal(typeof api.destroyCat, 'function', 'delete exists');
  });

  test('Resource | except update and destroy', function() {
    api.resource('cat', { except: ['update','destroy'] });
    equal(typeof api.getCat, 'function', 'get exists');
    equal(typeof api.createCat, 'function', 'create exists');
    equal(typeof api.updateCat, 'undefined', 'update does not exist');
    equal(typeof api.destroyCat, 'undefined', 'delete does not exist');
  });

  test('Resource | except update and destroy CSV', function() {
    api.resource('cat', { except: 'update,destroy' });
    equal(typeof api.getCat, 'function', 'get exists');
    equal(typeof api.createCat, 'function', 'create exists');
    equal(typeof api.updateCat, 'undefined', 'update does not exist');
    equal(typeof api.destroyCat, 'undefined', 'delete does not exist');
  });

  test('Multiple contexts on the same level', function() {

    api.context('goals/:goal_id', function() {
      api.connect('items');
    });
    api.context('users/:user_id', function() {
      api.connect('items');
    });

    api.getItems({ goal_id: 3 });
    assertRouteCalled(api, 'http://domain/goals/3/items', 'GET');

    api.getItems({ user_id: 3 });
    assertRouteCalled(api, 'http://domain/users/3/items', 'GET');

    api.getItems();
    assertRouteCalled(api, 'http://domain/items', 'GET');

  });


  test('Deep contexts are properly set', function() {

    api.context('neighborhoods/:neighborhood_id', function() {
      api.context('homes/:home_id', function() {
        equal(api.base.length, 4, 'Context should have base length of 4');
      });
    });

  });

  test('Multiple contexts on different levels', function() {

    api.context('neighborhoods/:neighborhood_id', function() {
      api.connect('cats');
    });
    api.context('neighborhoods/:neighborhood_id', function() {
      api.context('homes/:home_id', function() {
        api.connect('cats');
      });
    });

    api.connect('cats');

    api.getCats();
    assertRouteCalled(api, 'http://domain/cats', 'GET');

    api.getCats({ neighborhood_id: 5 });
    assertRouteCalled(api, 'http://domain/neighborhoods/5/cats', 'GET');

    api.getCats({ home_id: 5 });
    assertRouteCalled(api, 'http://domain/homes/5/cats', 'GET');

    api.getCats({ neighborhood_id: 18, home_id: 5 });
    assertRouteCalled(api, 'http://domain/neighborhoods/18/homes/5/cats', 'GET');


  });

  test('default params', function() {
    api.params({ foo: 'bar' });
    api.param('moo', 'car');
    api.connect('home_timeline');
    api.getHomeTimeline();
    assertRouteCalled(api, 'http://domain/home_timeline', 'GET', { foo: 'bar', moo: 'car' })
  });


  test('caching', function() {
    api.connect('home_timeline');
    api.getHomeTimeline({ foo: 'bar' });

    assertRouteCalled(api, 'http://domain/home_timeline', 'GET', { foo: 'bar' })
    equal(capturedRequests.length, 1, 'Captured requests is 1');

    api.getHomeTimeline({ foo: 'bar' }, { cache: true });
    equal(capturedRequests.length, 2, 'Begin cache capture, requests is now 2', { foo: 'bar' });


    api.getHomeTimeline({ foo: 'bar' }, {
      cache: true,
      complete: updateCounter,
      success:  updateCounter,
      error:    updateCounter
    }).then(updateCounter);
    equal(capturedRequests.length, 2, 'Captured from cache, requests is still 2', { foo: 'bar' });

    return;
    api.getHomeTimeline();

    equal(capturedRequests.length, 3, 'No caching, requests is now 3');
    equal(counter, 3, 'Counter should be 3');
  });

  test('caching only works for GET requests', function() {
    api.connect('POST status');
    api.createStatus({ foo: 'bar' });

    assertRouteCalled(api, 'http://domain/status', 'POST', { foo: 'bar' })
    equal(capturedRequests.length, 1, 'Captured requests is 1');

    api.createStatus({ foo: 'bar' }, { cache: true });
    equal(capturedRequests.length, 2, 'Begin cache capture, requests is now 2', { foo: 'bar' });

    api.createStatus({ foo: 'bar' }, {
      cache: true,
      complete: updateCounter,
      success:  updateCounter,
      error:    updateCounter
    }).then(updateCounter);


    equal(capturedRequests.length, 3, 'Cache has no effect with POST requests... counter is 3', { foo: 'bar' });

    api.createStatus();

    equal(capturedRequests.length, 4, '4 requests have run');
    equal(counter, 3, 'Counter should be 3');
  });


  test('allow options through constructor', function() {

    api = new APIConnect({
      api_key: 'APIKEY',
      domain: 'foobar.com',
      protocol: 'https',
      port: 5002,
      routes: [
        'GET statuses/home_timeline',
        'GET statuses/mentions',
        'GET statuses/public_timeline',
        'GET statuses/retweeted_by_me',
        'GET statuses/retweeted_to_me',
        'GET statuses/retweets_of_me',
        'GET statuses/user_timeline',
        'GET statuses/retweeted_to_user',
        'GET statuses/retweeted_by_user'
      ]
    });

    var twitter_routes = [
      ['home_timeline','HomeTimeline'],
      ['mentions','Mentions'],
      ['public_timeline','PublicTimeline'],
      ['retweeted_by_me','RetweetedByMe'],
      ['retweeted_to_me','RetweetedToMe'],
      ['retweets_of_me','RetweetsOfMe'],
      ['user_timeline','UserTimeline'],
      ['retweeted_to_user','RetweetedToUser'],
      ['retweeted_by_user','RetweetedByUser']
    ];


    arrayEach(twitter_routes, function(r) {
      var path = r[0];
      var method = 'get' + r[1];
      api[method]();
      assertRouteCalled(api, 'https://foobar.com:5002/statuses/' + path + '', 'GET', { api_key: 'APIKEY' })
    });

  });


  test('allow options through constructor with as override', function() {

    api = new APIConnect({
      api_key: 'APIKEY',
      domain: 'foobar.com',
      protocol: 'https',
      port: 5002,
      routes: [
        'GET foobar',
        'GET foobars AS whatever'
      ]
    });

    api.getFoobar();
    assertRouteCalled(api, 'https://foobar.com:5002/foobar', 'GET', { api_key: 'APIKEY' })

    api.whatever();
    assertRouteCalled(api, 'https://foobar.com:5002/foobars', 'GET', { api_key: 'APIKEY' })

  });


  test('allow resources through constructor', function() {

    api = new APIConnect({
      domain: 'foobar.com',
      resources: [
        'status',
        'foo/:foo_id/poo',
        'foo/:foo_id/cats'
      ]
    });

    api.getStatus();
    assertRouteCalled(api, 'http://foobar.com/status', 'GET')

    api.updatePoo({ foo_id: 19, maw: 'hoho' });
    assertRouteCalled(api, 'http://foobar.com/foo/19/poo', 'PUT', { maw: 'hoho' })

    api.destroyCat({ id: 3, foo_id: 19 });
    assertRouteCalled(api, 'http://foobar.com/foo/19/cats/3', 'DELETE')

  });

  test('allow resources through constructor with overrides', function() {

    api = new APIConnect({
      domain: 'foobar.com',
      resources: [
        'statuses ONLY index,destroy',
        'cap EXCEPT update'
      ]
    });

    equal(typeof api.getStatuses, 'function', 'index exists');
    equal(typeof api.getStatus, 'undefined', 'show does not exist');
    equal(typeof api.destroyStatus, 'function', 'destroy exists');
    equal(typeof api.updateStatus, 'undefined', 'update does not exist');

    equal(typeof api.getCaps, 'undefined', 'index does not exist');
    equal(typeof api.getCap, 'function', 'show exists');
    equal(typeof api.createCap, 'function', 'create exists');
    equal(typeof api.updateCap, 'undefined', 'update does not exist');
    equal(typeof api.destroyCap, 'function', 'destroy exists');

  });


  test('getOverride | always', function() {

    api.getOverride('always');

    api.connect('foobar');
    api.connect('POST foobar');

    api.getFoobar();
    assertRouteCalled(api, 'http://domain/foobar', 'GET', { _method: 'GET' })

    api.createFoobar();
    assertRouteCalled(api, 'http://domain/foobar', 'GET', { _method: 'POST' })

  });

  test('getOverride | jsonp', function() {

    api.getOverride('jsonp');

    api.connect('foobar');
    api.connect('POST foobar');


    api.getFoobar();
    assertRouteCalled(api, 'http://domain/foobar', 'GET')

    api.createFoobar();
    assertRouteCalled(api, 'http://domain/foobar', 'POST')

    api.cors(false);

    api.getFoobar();
    assertRouteCalled(api, 'http://domain/foobar', 'GET', { _method: 'GET' })

    api.createFoobar();
    assertRouteCalled(api, 'http://domain/foobar', 'GET', { _method: 'POST' });

  });


  test('getOverride | never', function() {

    api.getOverride('never');
    api.cors(false);

    api.connect('foobar');
    api.connect('POST foobar');

    api.getFoobar();
    assertRouteCalled(api, 'http://domain/foobar', 'GET')

    api.createFoobar();
    assertRouteCalled(api, 'http://domain/foobar', 'POST')

  });



  test('getOverride | always-except-get', function() {

    api.getOverride('always-except-get');

    api.connect('foobar');
    api.connect('POST foobar');

    api.getFoobar();
    assertRouteCalled(api, 'http://domain/foobar', 'GET')

    api.createFoobar();
    assertRouteCalled(api, 'http://domain/foobar', 'GET', { _method: 'POST' })

  });


  test('getOverride | jsonp-except-get', function() {

    api.getOverride('jsonp-except-get');

    api.connect('foobar');
    api.connect('POST foobar');

    api.getFoobar();
    assertRouteCalled(api, 'http://domain/foobar', 'GET')

    api.createFoobar();
    assertRouteCalled(api, 'http://domain/foobar', 'POST')

    api.cors(false);

    api.getFoobar();
    assertRouteCalled(api, 'http://domain/foobar', 'GET')

    api.createFoobar();
    assertRouteCalled(api, 'http://domain/foobar', 'GET', { _method: 'POST' })

  });


  test('getOverride | default is jsonp-except-get', function() {

    api.connect('foobar');
    api.connect('POST foobar');

    api.getFoobar();
    assertRouteCalled(api, 'http://domain/foobar', 'GET')

    api.createFoobar();
    assertRouteCalled(api, 'http://domain/foobar', 'POST')

    api.cors(false);

    api.getFoobar();
    assertRouteCalled(api, 'http://domain/foobar', 'GET')

    api.createFoobar();
    assertRouteCalled(api, 'http://domain/foobar', 'GET', { _method: 'POST' })

  });

  test('postOverride | default is false', function() {

    api.resource('foobar');

    api.getFoobar();
    assertRouteCalled(api, 'http://domain/foobar', 'GET')

    api.createFoobar();
    assertRouteCalled(api, 'http://domain/foobar', 'POST')

    api.updateFoobar();
    assertRouteCalled(api, 'http://domain/foobar', 'PUT')

    api.destroyFoobar();
    assertRouteCalled(api, 'http://domain/foobar', 'DELETE')

    api.cors(false);

    api.getFoobar();
    assertRouteCalled(api, 'http://domain/foobar', 'GET')

    api.createFoobar();
    assertRouteCalled(api, 'http://domain/foobar', 'GET', { _method: 'POST' })

    api.updateFoobar();
    assertRouteCalled(api, 'http://domain/foobar', 'GET', { _method: 'PUT' })

    api.destroyFoobar();
    assertRouteCalled(api, 'http://domain/foobar', 'GET', { _method: 'DELETE' })

  });


  test('postOverride | always', function() {

    api.resource('foobar');
    api.postOverride(true);

    api.getFoobar();
    assertRouteCalled(api, 'http://domain/foobar', 'GET')

    api.createFoobar();
    assertRouteCalled(api, 'http://domain/foobar', 'POST')

    api.updateFoobar();
    assertRouteCalled(api, 'http://domain/foobar', 'POST', { _method: 'PUT' })

    api.destroyFoobar();
    assertRouteCalled(api, 'http://domain/foobar', 'POST', { _method: 'DELETE' })

    api.cors(false);

    api.getFoobar();
    assertRouteCalled(api, 'http://domain/foobar', 'GET')

    api.createFoobar();
    assertRouteCalled(api, 'http://domain/foobar', 'GET', { _method: 'POST' })

    api.updateFoobar();
    assertRouteCalled(api, 'http://domain/foobar', 'GET', { _method: 'PUT' })

    api.destroyFoobar();
    assertRouteCalled(api, 'http://domain/foobar', 'GET', { _method: 'DELETE' })

  });



  test('tricking with an extra slash', function() {

    api.connect('POST /statuses/favorite');
    api.connect('PUT statuses/favorite');

    api.createFavorite();
    assertRouteCalled(api, 'http://domain/statuses/favorite', 'POST')

    api.updateFavorite();
    assertRouteCalled(api, 'http://domain/statuses/favorite', 'PUT')

  });

  test('massive GET urls', function() {

    var str = '', deferred, msg;

    api.cors(false);
    api.connect('GET /status');

    for(var i = 0; i < 5000; i++) {
      str += 'a';
    }

    deferred = api.getStatus({ q: str });

    deferred.fail(function() {
      msg = arguments[0];
    });

    equal(capturedRequests.length, 0, 'Get requests > 4091 chars cannot be made');
    equal(msg, 'Error: Max URL length exceeded!', 'Error message is set.');

  });

  test('massive GET urls with simple callback', function() {

    var str = '',
        deferred,
        deferredCount = 0,
        successCount  = 0,
        errorCount    = 0,
        completeCount = 0;


    api.cors(false);
    api.connect('GET /status');

    for(var i = 0; i < 5000; i++) {
      str += 'a';
    }

    deferred = api.getStatus({ q: str }, {
      sizeError: function() {
        // Doing something cool
      },
      error: function() {
        errorCount++;
      },
      complete: function() {
        completeCount++;
      },
      success: function() {
        successCount++;
      }
    });

    deferred.fail(function() {
      deferredCount--;
    });

    deferred.done(function() {
      deferredCount++;
    });

    equal(deferredCount,  -1,  'Done callback fired once');
    equal(errorCount,     0,  'Error count should be 0');
    equal(completeCount,  0,  'Complete count should be 0');
    equal(successCount,   0,  'Success count should be 0');

    equal(capturedRequests.length, 0, 'Get requests > 4091 chars cannot be made');

  });


  test('massive GET urls with url split', function() {

    var msg,
        str = '',
        deferred,
        deferredCount = 0,
        successCount  = 0,
        errorCount    = 0,
        completeCount = 0;

    api.cors(false);
    api.connect('GET /status');

    for(var i = 0; i < 5000; i++) {
      str += 'a';
    }

    deferred = api.getStatus({ q: str }, {
      sizeError: function(url, params) {
        var one = { url: url, params: {} };
        var two = { url: url, params: {} };
        one.params.q = params.q.slice(0, Math.floor(params.q.length / 2));
        two.params.q = params.q.slice(Math.floor(params.q.length / 2));
        return [one, two];
      },
      error: function() {
        errorCount++;
      },
      complete: function() {
        completeCount++;
      },
      success: function() {
        successCount++;
      }
    });

    deferred.fail(function() {
      deferredCount--;
    });

    deferred.done(function() {
      deferredCount++;
    });

    equal(capturedRequests.length, 2, '1 request split into 2');

    equal(deferredCount,  1,  'Done callback fired once');
    equal(errorCount,     0,  'Error count should be 0');
    equal(completeCount,  1,  'Complete count should be 1');
    equal(successCount,   1,  'Success count should be 1');

    equal(capturedRequests[capturedRequests.length - 1].params.q, str.slice(0, 2500), 'Request 1 first half')
    equal(capturedRequests[capturedRequests.length - 2].params.q, str.slice(2500), 'Request 1 second half')

  });

  test('params in routing objects', function() {
    api.connect('GET /memory', { params: { skip: true }});
    api.getMemory();
    assertRouteCalled(api, 'http://domain/memory', 'GET', { skip: true })
  });

  test('params as part of connect string', function() {
    api.connect('GET /memory?skip=true');
    api.getMemory();
    assertRouteCalled(api, 'http://domain/memory', 'GET', { skip: true })
  });

  test('connect with WITH and AS', function() {
    api.connect('GET /memory?skip=true AS foobar');
    api.foobar();
    assertRouteCalled(api, 'http://domain/memory', 'GET', { skip: true })
  });

  test('connect only 1 param uses that param for the name', function() {
    api.connect('GET /:username');
    api.getUsername({ username: 'moo' });
    assertRouteCalled(api, 'http://domain/moo', 'GET')
  });

  test('string can substitute for params object', function() {
    api.connect('GET /:username');
    api.getUsername('moo');
    assertRouteCalled(api, 'http://domain/moo', 'GET')
  });


  test('format can append the format to the string', function() {
    api.connect('GET /foobar');
    api.format('json', true);
    api.getFoobar();
    assertRouteCalled(api, 'http://domain/foobar.json', 'GET')
  });

  test('appended format can differ from data format', function() {
    api.connect('GET /foobar');
    api.format('json', 'asp');
    api.getFoobar();
    assertRouteCalled(api, 'http://domain/foobar.asp', 'GET')
  });

  test('method name does not use _id', function() {
    api.connect('GET /:post_id');
    api.getPost({ post_id: 13 });
    assertRouteCalled(api, 'http://domain/13', 'GET')
  });

  test('route allows format', function() {
    api.connect('GET /items.json');
    api.getItems();
    assertRouteCalled(api, 'http://domain/items.json', 'GET')
  });

  test('route allows format with fragment', function() {
    api.connect('GET /:name.json');
    api.getName({ name: 'jackson' });
    assertRouteCalled(api, 'http://domain/jackson.json', 'GET')
  });

  test('route allows format with resource', function() {
    api.resource('cats.json');
    api.getCats();
    assertRouteCalled(api, 'http://domain/cats.json', 'GET')
  });

  test('getters should check argument length', function() {
    equals(api.domain(), 'domain', 'Getter works')
    equals(api.domain(undefined) === api, true, 'Passing undefined sets to undefined')
  });

  test('params will return all params', function() {
    equals(typeof api.params(), 'object', 'no arguments to params returns the object')
    equals(typeof api.options(), 'object', 'same for options')
  });

  test('will switch to JSONP if no browser support for CORS', function() {
    withoutCorsSupport(function() {
      api.connect('DELETE user');
      api.destroyUser();
      // Node environment always supports CORS
      var expected = environment == 'node' ? undefined : 'DELETE';
      equals(capturedRequests[0].params._method, expected, 'Last call was JSONP');
    });
  });

  test('same domain will not use JSONP', function() {
    withoutCorsSupport(function() {
      api.domain(window.location.hostname);
      api.port(window.location.port);
      api.connect('DELETE user');
      api.destroyUser();
      equals(capturedRequests[0].params._method, undefined, 'Last call was not JSONP');
    });
  });

  test('constructor accepts a single domain string', function() {
    api = new APIConnect('threemusketeers.com');
    api.connect('chocolate');
    api.getChocolate();
    assertRouteCalled(api, 'http://threemusketeers.com/chocolate', 'GET')
  });

  test('constructor domain string can have port', function() {
    api = new APIConnect('localhost:4000');
    api.connect('chocolate');
    api.getChocolate();
    assertRouteCalled(api, 'http://localhost:4000/chocolate', 'GET')
  });

  test('allow direct burn-in of params', function() {
    api.connect('chocolate?moo=foo');
    api.getChocolate();
    assertRouteCalled(api, 'http://domain/chocolate', 'GET', { moo: 'foo' })
  });

  test('last function can be a direct "then" callback shortcut', function() {
    api.connect('chocolate');
    api.getChocolate(function() {
      counter++;
    });
    assertRouteCalled(api, 'http://domain/chocolate', 'GET');
    equals(counter, 1, 'Counter should have incremented');
  });

  test('function shortcut should be fired even on errors', function() {
    api.connect('chocolate');
    simulateAPIError(function() {
      api.getChocolate(function() {
        counter++;
      });
    });
    equals(counter, 1, 'Counter should have incremented');
  });

  test('can send up application/json data type', function() {
    api.contentType('json');
    api.connect('POST chocolate');
    api.createChocolate({ foo: 'bar' });
    var expectedParamsString = $.support.cors ? '{"foo":"bar"}' : '{"foo":"bar","_method":"POST"}';
    assertRouteCalled(api, 'http://domain/chocolate', 'POST', expectedParamsString);
    assertLastWasContentType('json');
  });

  test('different format', function() {
    api.format('xml', 'php');
    api.connect('chocolate');
    api.getChocolate().then(function(response) {
      equal(typeof response, 'string', 'Response should be a string');
    });
    assertRouteCalled(api, 'http://domain/chocolate.php', 'GET');
  });

  test('connect should return the context', function() {
    equals(api.connect('foobar') === api, true, 'Connect returned the context');
  });

  test('resource should return the context', function() {
    equals(api.resource('foobar') === api, true, 'Resource returned the context');
  });

  test('method is not confused with the route', function() {
    api.connect('posts');
    api.getPosts();
    assertRouteCalled(api, 'http://domain/posts', 'GET');
  });

})();
