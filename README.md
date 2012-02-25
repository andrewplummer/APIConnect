# APIConnect

This class creates a very easy and intuitive way to interact with APIs,
most commonly those hosted on other domains.

Setup:

```
var twitter = new APIConnect();
twitter.domain('api.twitter.com');
twitter.get('statuses/home_timeline');
twitter.getHomeTimeline();

> GET http://api.twitter.com/statuses/home_timeline.json
```

The route `statuses/home_timeline` will be automatically set up and accessible through a camelized
method name in the api object. Calling the route is as simple as calling the method.

When making the call, the first object is `params`. This will most commonly be added to the end of
the query string, but in cases where the route contains params such as `tweets/:tweet_id`, it will
be placed here instead and removed from the query string.

The second object passed is an options hash. This will override any default params and also end up
being passed to the AJAX lib, in this case jQuery. Any valid option for `jQuery.ajax` is allowed here.
This means that all the standard callbacks will work:

```
twitter.getHomeTimeline({}, {
  success: function() {
    // Congratulations!
  },
  error: function() {
    // Oh noeee... failure!
  }
});
```

API calls will also pass back jQuery deferred objects, so these can be used as well:

```
twitter.getHomeTimeline().then(function() {
  // You're done!
});
```

Any route can be set up with any level of context. These contexts are always optional, and will only be
added if they exist when passed as params:

```
twitter.get(':user/:list_id/members');
twitter.getMembers({ user: 'bob', list_id: 5 });

> GET http://api.twitter.com/bob/5/members.json
```

To connect routes, the 4 main HTTP verbs, "GET", "POST", "PUT", and "DELETE" are supported, and map to
the method names "get", "create", "update", and "destroy", respectively (note "del", which is a reserved
keyword):

```
twitter.post(':user/:list_id/members');
twitter.del(':user/:list_id/members');

twitter.createMember({ user: 'bob', list_id: 5, member_name: 'harry' });

> POST http://api.twitter.com/bob/5/members.json?member_name=harry

twitter.destroyMember({ user: 'bob', list_id: 5 });

> DELETE http://api.twitter.com/bob/5/members.json
```

"resource" serves as a shortcut to all 4 HTTP verbs:


```
twitter.resource('member');

twitter.getMember();     > GET     http://api.twitter.com/member.json
twitter.createMember();  > POST    http://api.twitter.com/member.json
twitter.updateMember();  > PUT     http://api.twitter.com/member.json
twitter.destroyMember(); > DELETE  http://api.twitter.com/member.json
```

If a resource is a collection, passing `collection: true` in the options for "resource" will create standard
collection routes including an "index" method:


```
twitter.resource('status', { collection: true });

twitter.getStatus();              > GET     http://api.twitter.com/status.json
twitter.getStatus({ id: 3});      > GET     http://api.twitter.com/status/3.json
twitter.createStatus();           > POST    http://api.twitter.com/status.json
twitter.updateStatus({ id: 3 });  > PUT     http://api.twitter.com/status/3.json
twitter.destroyStatus({ id: 3 }); > DELETE  http://api.twitter.com/status/3.json
```

If a "collection" is omitted, it will attempt to be intelligently detected by the pluralization of the
resource passed. In this case, pluralization of the methods will also use intelligent detection:

```
twitter.resource('members');

twitter.getMembers();              > GET     http://api.twitter.com/members.json
twitter.getMembers({ id: 3});      > GET     http://api.twitter.com/members/3.json
twitter.createMembers();           > POST    http://api.twitter.com/members.json
twitter.updateMembers({ id: 3 });  > PUT     http://api.twitter.com/members/3.json
twitter.destroyMembers({ id: 3 }); > DELETE  http://api.twitter.com/members/3.json
```



... more docs to come!

