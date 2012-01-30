(function() {


  // Local vars

  var api, capturedRequests = [];

  $.ajax = captureRequest;


  // Utility methods

  function captureRequest(url, options) {
    capturedRequests.push({ url: url, params: options.data, method: options.type });
    return $.Deferred().resolve({ response: 'RESPONSE!' });
  }

  function assertRouteCalled(context, url, method, params) {
    var request = capturedRequests[capturedRequests.length - 1],
        expectedParamsLength = 0,
        actualParamsLength = 0;
    params = params || {};
    equals(request.url, url, 'Last URL was: ' + url);
    equals(request.method, method, 'Last method was: ' + method);
    for(var key in params) {
      equals(request.params[key], params[key], 'Params ' + key + ' was: ' + params[key]);
      expectedParamsLength += 1;
    }
    for(var key in request.params) {
      actualParamsLength += 1;
    }
    equals(actualParamsLength, expectedParamsLength, 'Params length was correct');
  }

  function arrayEach(arr, fn) {
    for(var i = 0; i < arr.length; i++) {
      if(fn.call(arr, arr[i], i, arr) === false) {
        break;
      }
    }
  }

  module('APIInterface', {
    setup: function() {
      api = new APIInterface();
      api.domain('domain');
      capturedRequests = [];
    }
  });


  test('Domain Setup', function() {
    strictEqual(api.domain('test'), api, 'APIInterface#domain setting should return the instance');
    equal(api.domain(), 'test', ' APIInterface#domain calling without arguments should return the field');
  });

  test('Custom Setters', function() {

    api.protocol('https');
    api.domain('twotter.com');
    api.port('5000');
    api.format('xml');

    api.get('foobar');
    api.getFoobar();

    assertRouteCalled(api, 'https://twotter.com:5000/foobar.xml', 'GET')

  });


  test('get | home_timeline', function() {
    api.get('home_timeline');
    equal(typeof api.getHomeTimeline, 'function', 'show exists');
    equal(typeof api.getHomeTimelines, 'undefined', 'index does not exist');
    equal(typeof api.createHomeTimeline, 'undefined', 'create does not exist');
    equal(typeof api.updateHomeTimeline, 'undefined', 'update does not exist');
    equal(typeof api.destroyHomeTimeline, 'undefined', 'delete does not exist');

    api.getHomeTimeline();
    assertRouteCalled(api, 'http://domain/home_timeline.json', 'GET')

  });


  test('post | home_timeline', function() {
    api.post('home_timeline');
    equal(typeof api.getHomeTimeline, 'undefined', 'show does not exist');
    equal(typeof api.getHomeTimelines, 'undefined', 'index does not exist');
    equal(typeof api.createHomeTimeline, 'function', 'create exists');
    equal(typeof api.updateHomeTimeline, 'undefined', 'update does not exist');
    equal(typeof api.destroyHomeTimeline, 'undefined', 'delete does not exist');

    api.createHomeTimeline();
    assertRouteCalled(api, 'http://domain/home_timeline.json', 'POST')

  });

  test('put | home_timeline', function() {
    api.put('home_timeline');
    equal(typeof api.getHomeTimeline, 'undefined', 'show does not exist');
    equal(typeof api.getHomeTimelines, 'undefined', 'index does not exist');
    equal(typeof api.createHomeTimeline, 'undefined', 'create does not exist');
    equal(typeof api.updateHomeTimeline, 'function', 'update exists');
    equal(typeof api.destroyHomeTimeline, 'undefined', 'delete does not exist');

    api.updateHomeTimeline();
    assertRouteCalled(api, 'http://domain/home_timeline.json', 'PUT')

  });

  test('delete | home_timeline', function() {
    api.del('home_timeline');
    equal(typeof api.getHomeTimeline, 'undefined', 'show does not exist');
    equal(typeof api.getHomeTimelines, 'undefined', 'index does not exist');
    equal(typeof api.createHomeTimeline, 'undefined', 'create does not exist');
    equal(typeof api.updateHomeTimeline, 'undefined', 'update does not exist');
    equal(typeof api.destroyHomeTimeline, 'function', 'delete exists');

    api.destroyHomeTimeline();
    assertRouteCalled(api, 'http://domain/home_timeline.json', 'DELETE')

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
        api.get(route[0]);
      });
    });

    arrayEach(twitter_routes, function(route) {
      var method = api['get' + route[1]];
      equal(typeof method, 'function', route[0] + ' exists');
      method();
      assertRouteCalled(api, 'http://domain/statuses/' + route[0] + '.json', 'GET');
    });

  });

  test('twitter routes with params', function() {

    api.context('statuses/:id', function() {
      api.get('retweeted_by');
    });

    equal(typeof api.getRetweetedBy, 'function', 'route exists');
    api.getRetweetedBy({ id: 18 });
    assertRouteCalled(api, 'http://domain/statuses/18/retweeted_by.json', 'GET');
    api.getRetweetedBy();
    assertRouteCalled(api, 'http://domain/retweeted_by.json', 'GET');

  });



  test('returns from compound context', function() {

    api.context('statuses/:status_id', function() {
      api.get('profile');
    });
    api.get('moof');

    api.getProfile({ status_id: 15 });
    assertRouteCalled(api, 'http://domain/statuses/15/profile.json', 'GET');
    api.getProfile({ id: 15 });
    assertRouteCalled(api, 'http://domain/profile.json', 'GET', { id: 15 });

    api.getMoof({ status_id: 15 });
    assertRouteCalled(api, 'http://domain/moof.json', 'GET', { status_id: 15 });
    api.getMoof({ id: 15 });
    assertRouteCalled(api, 'http://domain/moof.json', 'GET', { id: 15 });
    api.getMoof();
    assertRouteCalled(api, 'http://domain/moof.json', 'GET');


  });


  test('single show context', function() {

    api.get('statuses/:status_id');

    api.getStatus({ status_id: 15 });
    assertRouteCalled(api, 'http://domain/statuses/15.json', 'GET');
    api.getStatus({ id: 15 });
    assertRouteCalled(api, 'http://domain.json', 'GET', { id: 15 });
    api.getStatus();
    assertRouteCalled(api, 'http://domain.json', 'GET');

  });


  test('deep optional contexts', function() {

    api.get('goals/:goal_id/items/:item_id/sentences/:sentence_id');

    api.getSentence({ sentence_id: 15, item_id: 19, goal_id: 2 });
    assertRouteCalled(api, 'http://domain/goals/2/items/19/sentences/15.json', 'GET');

    api.getSentence({ item_id: 19, goal_id: 2 });
    assertRouteCalled(api, 'http://domain/goals/2/items/19.json', 'GET');

    api.getSentence({ goal_id: 2 });
    assertRouteCalled(api, 'http://domain/goals/2.json', 'GET');

    api.getSentence({ sentence_id: 15, goal_id: 2 });
    assertRouteCalled(api, 'http://domain/goals/2/sentences/15.json', 'GET');

    api.getSentence({ sentence_id: 15 });
    assertRouteCalled(api, 'http://domain/sentences/15.json', 'GET');

    api.getSentence();
    assertRouteCalled(api, 'http://domain.json', 'GET');

  });


  test('multiple optional contexts', function() {

    api.get('goals/:goal_id/items/:item_id/sentences/:sentence_id');
    api.get('goals/:goal_id/items/:item_id');
    api.get('goals/:goal_id');

    api.getSentence({ sentence_id: 15, item_id: 19, goal_id: 2 });
    assertRouteCalled(api, 'http://domain/goals/2/items/19/sentences/15.json', 'GET');

    api.getItem({ item_id: 19, goal_id: 2 });
    assertRouteCalled(api, 'http://domain/goals/2/items/19.json', 'GET');

    api.getGoal({ goal_id: 2 });
    assertRouteCalled(api, 'http://domain/goals/2.json', 'GET');

    api.getGoal({ sentence_id: 15 });
    assertRouteCalled(api, 'http://domain.json', 'GET', { sentence_id: 15 });

  });


  test('create | multiple optional contexts', function() {

    api.post('goals/:goal_id/items/:item_id/sentences/:sentence_id');
    api.post('goals/:goal_id/items/:item_id');
    api.post('goals/:goal_id');

    api.createSentence({ sentence_id: 15, item_id: 19, goal_id: 2 });
    assertRouteCalled(api, 'http://domain/goals/2/items/19/sentences/15.json', 'POST');

    api.createItem({ item_id: 19, goal_id: 2 });
    assertRouteCalled(api, 'http://domain/goals/2/items/19.json', 'POST');

    api.createGoal({ goal_id: 2 });
    assertRouteCalled(api, 'http://domain/goals/2.json', 'POST');

    api.createGoal({ sentence_id: 15 });
    assertRouteCalled(api, 'http://domain.json', 'POST', { sentence_id: 15 });

  });

  test('destroy | multiple optional contexts', function() {

    api.del('goals/:goal_id/items/:item_id/sentences/:sentence_id');
    api.del('goals/:goal_id/items/:item_id');
    api.del('goals/:goal_id');

    api.destroySentence({ sentence_id: 15, item_id: 19, goal_id: 2 });
    assertRouteCalled(api, 'http://domain/goals/2/items/19/sentences/15.json', 'DELETE');

    api.destroyItem({ item_id: 19, goal_id: 2 });
    assertRouteCalled(api, 'http://domain/goals/2/items/19.json', 'DELETE');

    api.destroyGoal({ goal_id: 2 });
    assertRouteCalled(api, 'http://domain/goals/2.json', 'DELETE');

    api.destroyGoal({ sentence_id: 15 });
    assertRouteCalled(api, 'http://domain.json', 'DELETE', { sentence_id: 15 });

  });

  test('resource | basic', function() {

    api.resource('tweet');

    api.getTweet();
    assertRouteCalled(api, 'http://domain/tweet.json', 'GET');

    api.createTweet();
    assertRouteCalled(api, 'http://domain/tweet.json', 'POST');

    api.updateTweet();
    assertRouteCalled(api, 'http://domain/tweet.json', 'PUT');

    api.destroyTweet();
    assertRouteCalled(api, 'http://domain/tweet.json', 'DELETE');

    equal(typeof api.getTweets, 'undefined', 'index does not exist');

  });


  test('resource | collection', function() {

    api.resource('tweets');

    api.getTweet({ id: 3 });
    assertRouteCalled(api, 'http://domain/tweets/3.json', 'GET');

    api.getTweet();
    assertRouteCalled(api, 'http://domain.json', 'GET');

    api.createTweet();
    assertRouteCalled(api, 'http://domain/tweets.json', 'POST');

    api.updateTweet({ id: 3 });
    assertRouteCalled(api, 'http://domain/tweets/3.json', 'PUT');

    api.updateTweet();
    assertRouteCalled(api, 'http://domain.json', 'PUT');

    api.destroyTweet({ id: 3 });
    assertRouteCalled(api, 'http://domain/tweets/3.json', 'DELETE');

    // Also index route
    api.getTweets();
    assertRouteCalled(api, 'http://domain/tweets.json', 'GET');

  });


  test('resource | uncountable collection', function() {

    api.resource('equipment', { collection: true });

    api.getEquipment({ id: 3 });
    assertRouteCalled(api, 'http://domain/equipment/3.json', 'GET');

    // Doubles as index route when collection: true
    api.getEquipment();
    assertRouteCalled(api, 'http://domain/equipment.json', 'GET');

    api.createEquipment();
    assertRouteCalled(api, 'http://domain/equipment.json', 'POST');

    api.updateEquipment({ id: 3 });
    assertRouteCalled(api, 'http://domain/equipment/3.json', 'PUT');

    api.updateEquipment();
    assertRouteCalled(api, 'http://domain.json', 'PUT');

    api.destroyEquipment({ id: 3 });
    assertRouteCalled(api, 'http://domain/equipment/3.json', 'DELETE');

    api.destroyEquipment();
    assertRouteCalled(api, 'http://domain.json', 'DELETE');

  });


  test('resource | uncountable collection on explicit GET', function() {

    api.get('tweets/:tweet_id', { collection: true });

    api.getTweet({ tweet_id: 3 });
    assertRouteCalled(api, 'http://domain/tweets/3.json', 'GET');

    api.getTweet();
    assertRouteCalled(api, 'http://domain/tweets.json', 'GET');

  });


  test('resource | uncountable collection on explicit GET routed with context', function() {

    api.context('tweets/:tweet_id', function() {
      api.get('status', { collection: true });
    });

    api.getStatus({ tweet_id: 3 });
    assertRouteCalled(api, 'http://domain/tweets/3/status.json', 'GET');

    api.getStatus();
    assertRouteCalled(api, 'http://domain/status.json', 'GET');

  });


  test('custom twitter routes', function() {

    api.context('statuses/:id', function() {

      api.get('retweeted_by');
      api.get('retweeted_by/ids');

    });

    api.context('statuses', function() {

      api.post('destroy/:id', { as: 'destroyTweet' });
      api.post('retweet/:id');
      api.post('update', { as: 'updateStatus' });
      api.post('update_with_media', { as: 'updateStatusWithMedia' });
      api.get('oembed');

    });


    api.getRetweetedBy({ id: 13 });
    assertRouteCalled(api, 'http://domain/statuses/13/retweeted_by.json', 'GET');

    api.getRetweetedBy({ status_id: 13 });
    assertRouteCalled(api, 'http://domain/statuses/13/retweeted_by.json', 'GET');

    api.getIds({ id: 13 });
    assertRouteCalled(api, 'http://domain/statuses/13/retweeted_by/ids.json', 'GET');

    api.destroyTweet({ id: 13 });
    assertRouteCalled(api, 'http://domain/statuses/destroy/13.json', 'POST');

    api.createRetweet({ id: 13 });
    assertRouteCalled(api, 'http://domain/statuses/retweet/13.json', 'POST');

    api.updateStatus();
    assertRouteCalled(api, 'http://domain/statuses/update.json', 'POST');

    api.updateStatusWithMedia();
    assertRouteCalled(api, 'http://domain/statuses/update_with_media.json', 'POST');

    api.getOembed();
    assertRouteCalled(api, 'http://domain/statuses/oembed.json', 'GET');

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
      api.get('items');
    });
    api.context('users/:user_id', function() {
      api.get('items');
    });

    api.getItems({ goal_id: 3 });
    assertRouteCalled(api, 'http://domain/goals/3/items.json', 'GET');

    api.getItems({ user_id: 3 });
    assertRouteCalled(api, 'http://domain/users/3/items.json', 'GET');

    api.getItems();
    assertRouteCalled(api, 'http://domain/items.json', 'GET');

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
      api.get('cats');
    });
    api.context('neighborhoods/:neighborhood_id', function() {
      api.context('homes/:home_id', function() {
        api.get('cats');
      });
    });

    api.get('cats');

    api.getCats();
    assertRouteCalled(api, 'http://domain/cats.json', 'GET');

    api.getCats({ neighborhood_id: 5 });
    assertRouteCalled(api, 'http://domain/neighborhoods/5/cats.json', 'GET');

    api.getCats({ home_id: 5 });
    assertRouteCalled(api, 'http://domain/homes/5/cats.json', 'GET');

    api.getCats({ neighborhood_id: 18, home_id: 5 });
    assertRouteCalled(api, 'http://domain/neighborhoods/18/homes/5/cats.json', 'GET');


  });

  test('default params', function() {
    api.params({ foo: 'bar' });
    api.param('moo', 'car');
    api.get('home_timeline');
    api.getHomeTimeline();
    assertRouteCalled(api, 'http://domain/home_timeline.json', 'GET', { foo: 'bar', moo: 'car' })
    equal(api.foo(), 'bar', 'Param foo can be retrieved');
    equal(api.moo(), 'car', 'Param moo can be retrieved');
  });



  test('api key', function() {
    api.key('3h234lk2h432hl');
    api.get('home_timeline');
    api.getHomeTimeline();
    assertRouteCalled(api, 'http://domain/home_timeline.json', 'GET', { api_key: '3h234lk2h432hl' })
    equal(api.key(), '3h234lk2h432hl', 'API key is retrieved');
  });

  test('api key override param', function() {
    api.key('my_special_api_key', '3h234lk2h432hl');
    api.get('home_timeline');
    api.getHomeTimeline();
    assertRouteCalled(api, 'http://domain/home_timeline.json', 'GET', { my_special_api_key: '3h234lk2h432hl' })
    equal(api.key(), '3h234lk2h432hl', 'API key is retrieved');
  });


  test('caching', function() {
    api.get('home_timeline');
    api.getHomeTimeline({ foo: 'bar' });
    assertRouteCalled(api, 'http://domain/home_timeline.json', 'GET', { foo: 'bar' })
    equal(capturedRequests.length, 1, 'Captured requests is 1');
    api.getHomeTimeline({ foo: 'bar' }, { cache: true });
    equal(capturedRequests.length, 2, 'Begin cache capture, requests is now 2', { foo: 'bar' });
    api.getHomeTimeline({ foo: 'bar' }, { cache: true });
    equal(capturedRequests.length, 2, 'Captured from cache, requests is still 2', { foo: 'bar' });
    api.getHomeTimeline();
    equal(capturedRequests.length, 3, 'No caching, requests is now 3');
  });

  test('allow options through constructor', function() {

    var api = new APIInterface({
      domain: 'foobar.com',
      protocol: 'https',
      port: 5002,
      key: 'APIKEY',
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
      assertRouteCalled(api, 'https://foobar.com:5002/statuses/' + path + '.json', 'GET', { api_key: 'APIKEY' })
    });

  });


  test('allow options through constructor with as override', function() {

    var api = new APIInterface({
      domain: 'foobar.com',
      protocol: 'https',
      port: 5002,
      key: 'APIKEY',
      routes: [
        'GET foobar',
        'GET foobars AS whatever'
      ]
    });

    api.getFoobar();
    assertRouteCalled(api, 'https://foobar.com:5002/foobar.json', 'GET', { api_key: 'APIKEY' })

    api.whatever();
    assertRouteCalled(api, 'https://foobar.com:5002/foobars.json', 'GET', { api_key: 'APIKEY' })

  });





})();
