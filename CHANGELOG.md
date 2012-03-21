
v0.6
======

- Released for npm.
- APIs on the same domain will not use JSONP.
- Constructor now accepts a single string as the domain (may include port).
- Params can be burned directly when connecting routes by adding ?key=value.
- Routes can accept a single function as a shortcut for a success callback.
- Data format can now differ from append format.
- Fix for POST being misinterpreted in "posts"


v0.5
======

- Adding the code, starting here.
- Allowed a callback in place of params/options if defined as a shortcut for .then().
- Allowed the domain to be set in the constructor via a single string.
- Allowed the burn in of params via normal syntax ?key=value, etc.
