


var api;

function assertRouteCalled(context, url, method, params) {
  params = params || {};
  equals(context.last.url, url, 'Last URL was: ' + url);
  equals(context.last.method, method, 'Last method was: ' + method);
  for(var key in params) {
    equals(context.last.params[key], params[key], 'Params ' + key + ' was: ' + params[key]);

  }
}

module('APIInterface', {
  setup: function() {
    api = new APIInterface();
    api.domain('domain');
  }
});




test('Domain Setup', function() {
  strictEqual(api.domain('test'), api, 'APIInterface#domain setting should return the instance');
  equal(api.domain(), 'test', ' APIInterface#domain calling without arguments should return the field');
});

// Plural:

// GET    /users
// GET    /users/4
// POST   /users
// PUT    /users/4
// DELETE /users/4

// Singular:

// GET    tweet/user
// POST   tweet/user
// PUT    tweet/user
// DELETE tweet/user



//  api.get





/*

api.context('foobar', function() {
  api.resource('mice');
  api.resource('foo');
  api.context('mow', function() {
    api.resource('mama');
  });
});

api.prefix('statuses', function() {
  api.get('home_timeline');
  api.get('mentions');
});


api.get('home_timeline', { prefix: 'statuses' });

api.get('mentions', { context: 'status' });

api.get('items', { context: 'goal' });

api.get('sentences', { context: 'goal' });
api.get('sentences', { context: ['goal','item'] });




GET :user/lists/memberships

GET lists/memberships


getUserListsMemberships()

getListsMemberships()


GET lists/members
DELETE :user/:list_id/members
GET :user/:list_id/members
GET :user/:list_id/members/:id
POST :user/:list_id/members


getListMembers()
deleteUserListMembers()
getUserListMembers()
getUserListMembers()
postUserListMembers()


GET statuses/home_timeline


getStatusHomeTimeline();














*/

test('get | defaults', function() {
  api.get('home_timeline');
  equal(typeof api.getHomeTimeline, 'function', 'show exists');
  equal(typeof api.getHomeTimelines, 'undefined', 'index does not exist');
  equal(typeof api.createHomeTimeline, 'undefined', 'create does not exist');
  equal(typeof api.updateHomeTimeline, 'undefined', 'update does not exist');
  equal(typeof api.destroyHomeTimeline, 'undefined', 'delete does not exist');

  api.getHomeTimeline();
  assertRouteCalled(api, 'http://domain/home_timeline.json', 'GET')

});


/*
test('show | defaults', function() {
  api.get('home_timeline');
  equal(typeof api.getHomeTimeline, 'function', 'show exists');
  equal(typeof api.getHomeTimelines, 'undefined', 'index does not exist');
  equal(typeof api.createHomeTimeline, 'undefined', 'create does not exist');
  equal(typeof api.updateHomeTimeline, 'undefined', 'update does not exist');
  equal(typeof api.destroyHomeTimeline, 'undefined', 'delete does not exist');

  api.getHomeTimeline();
  assertRouteCalled(api, 'http://domain/home_timeline.json', 'GET')

});

test('show | with prefix', function() {
  api.show('home_timeline', { prefix: 'statuses' });
  api.getHomeTimeline();
  assertRouteCalled(api, 'http://domain/statuses/home_timeline.json', 'GET')
});

test('show | with multiple prefixes', function() {
  api.show('home_timeline', { prefix: 'status,matus' });
  api.getHomeTimeline();
  assertRouteCalled(api, 'http://domain/status/matus/home_timeline.json', 'GET')

});

test('show | with unused context', function() {
  api.show('retweeted_by', { context: 'status' });
  api.getRetweetedBy();
  assertRouteCalled(api, 'http://domain/retweeted_by.json', 'GET')
});

test('show | with used context', function() {
  api.show('retweeted_by', { context: 'status' });
  api.getRetweetedBy({ status_id: 3 });
  assertRouteCalled(api, 'http://domain/statuses/3/retweeted_by.json', 'GET')
});

test('show | with multiple contexts', function() {
  api.show('sentences', { context: 'goal,item' });
  api.getSentences({ goal_id: 910, item_id: 3350 });
  assertRouteCalled(api, 'http://domain/goals/910/items/3350/sentences.json', 'GET')
});

test('show | with context and special pluralize', function() {
  api.show('sentences', { context: 'goal', plural: 'goalsies' });
  api.getSentences({ goal_id: 910 });
  assertRouteCalled(api, 'http://domain/goalsies/910/sentences.json', 'GET')
});

test('show | with context and plural is false', function() {
  api.show('sentences', { context: 'goal', plural: false });
  api.getSentences({ goal_id: 910 });
  assertRouteCalled(api, 'http://domain/goal/910/sentences.json', 'GET')
});

test('show | with context and plural is blank', function() {
  api.show('sentences', { context: 'goal', plural: '' });
  api.getSentences({ goal_id: 910 });
  assertRouteCalled(api, 'http://domain/goal/910/sentences.json', 'GET')
});

test('show | with multiple contexts with different pluralize strategies', function() {
  api.show('sentences', { context: [{ text: 'goal', plural: 'poops' }, { text: 'item' }] });
  api.getSentences({ goal_id: 910, item_id: 3350 });
  assertRouteCalled(api, 'http://domain/poops/910/items/3350/sentences.json', 'GET')
});

test('show | with id', function() {
  api.show('retweets');
  api.getRetweets({ id: 3 });
  assertRouteCalled(api, 'http://domain/retweets/3.json', 'GET')
});

test('index | without id', function() {
  api.index('retweets');
  api.getRetweets();
  assertRouteCalled(api, 'http://domain/retweets.json', 'GET')
});

test('index | with id', function() {
  api.index('retweets');
  api.getRetweets({ id: 3 });
  assertRouteCalled(api, 'http://domain/retweets.json', 'GET', { id: 3 })
});

test('create', function() {
  api.create('tweet');
  api.createTweet();
  assertRouteCalled(api, 'http://domain/tweets.json', 'POST')
});




test('resource | defaults', function() {
  api.resource('cat');
  equal(typeof api.getCats, 'function', 'get exists');
  equal(typeof api.getCat, 'function', 'get exists');
  equal(typeof api.createCat, 'function', 'create exists');
  equal(typeof api.updateCat, 'function', 'update exists');
  equal(typeof api.destroyCat, 'function', 'delete exists');
});

test('resource | with context', function() {
  api.resource('cat');

  api.getCats();
  assertRouteCalled(api, 'http://domain/cats.json', 'GET')
  api.getCat({ id: 3 });
  assertRouteCalled(api, 'http://domain/cats/3.json', 'GET')
  api.createCat();
  assertRouteCalled(api, 'http://domain/cats.json', 'POST')
  api.updateCat({ id: 3 });
  assertRouteCalled(api, 'http://domain/cats/3.json', 'PUT')
  api.destroyCat({ id: 3 });
  assertRouteCalled(api, 'http://domain/cats/3.json', 'DELETE')
});


/*
test('Resource | only get', function() {
  api.resource('cat', { only: 'get' });
  equal(typeof api.getCat, 'function', 'get exists');
  equal(typeof api.createCat, 'undefined', 'create exists');
  equal(typeof api.updateCat, 'undefined', 'update exists');
  equal(typeof api.destroyCat, 'undefined', 'delete exists');
});

test('Resource | only create', function() {
  api.resource('cat', { only: 'create' });
  equal(typeof api.getCat, 'undefined', 'get exists');
  equal(typeof api.createCat, 'function', 'create exists');
  equal(typeof api.updateCat, 'undefined', 'update exists');
  equal(typeof api.destroyCat, 'undefined', 'delete exists');
});

test('Resource | only update and destroy', function() {
  api.resource('cat', { only: ['update','destroy'] });
  equal(typeof api.getCat, 'undefined', 'get exists');
  equal(typeof api.createCat, 'undefined', 'create exists');
  equal(typeof api.updateCat, 'function', 'update exists');
  equal(typeof api.destroyCat, 'function', 'delete exists');
});

test('Resource | only update and destroy CSV', function() {
  api.resource('cat', { only: 'update,destroy' });
  equal(typeof api.getCat, 'undefined', 'get exists');
  equal(typeof api.createCat, 'undefined', 'create exists');
  equal(typeof api.updateCat, 'function', 'update exists');
  equal(typeof api.destroyCat, 'function', 'delete exists');
});


test('Resource | except create', function() {
  api.resource('cat', { except: 'create' });
  equal(typeof api.getCat, 'function', 'get exists');
  equal(typeof api.createCat, 'undefined', 'create exists');
  equal(typeof api.updateCat, 'function', 'update exists');
  equal(typeof api.destroyCat, 'function', 'delete exists');
});

test('Resource | except update and destroy', function() {
  api.resource('cat', { except: ['update','destroy'] });
  equal(typeof api.getCat, 'function', 'get exists');
  equal(typeof api.createCat, 'function', 'create exists');
  equal(typeof api.updateCat, 'undefined', 'update exists');
  equal(typeof api.destroyCat, 'undefined', 'delete exists');
});

test('Resource | except update and destroy CSV', function() {
  api.resource('cat', { except: 'update,destroy' });
  equal(typeof api.getCat, 'function', 'get exists');
  equal(typeof api.createCat, 'function', 'create exists');
  equal(typeof api.updateCat, 'undefined', 'update exists');
  equal(typeof api.destroyCat, 'undefined', 'delete exists');
});

test('Resources | defaults', function() {
  api.resources('cat');
  equal(typeof api.getCats, 'function', 'get exists');
  equal(typeof api.createCat, 'function', 'create exists');
  equal(typeof api.updateCat, 'function', 'update exists');
  equal(typeof api.destroyCat, 'function', 'delete exists');
});






/*
var setup_methods = ['domain'], index = 0, method, name;

var api = new APIInterface();

while(index < setup_methods.length) {

  method = setup_methods[index];
  name = 'APIInterface#' + method;
  test(name, function() {
    ok(api[method], name + ' should exist');
    strictEqual(api[method]('test'), api, name + ' setting should return the instance');
    ok(api[method](), 'test', name + ' calling without arguments should return the field');
  });
  index++;
}

*/
