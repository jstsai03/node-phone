# Passport-Att-Alpha

[Passport](http://passportjs.org/) strategy for authenticating with [AT&T Alpha Platform](http://www.apimatrix.tfoundry.com/)
using the OAuth 2.0 API.

This module lets you authenticate using apimatrix in your Node.js applications.
By plugging into Passport, apimatrix authentication can be easily and
unobtrusively integrated into any application or framework that supports
[Connect](http://www.senchalabs.org/connect/)-style middleware, including
[Express](http://expressjs.com/).

## Installation

    $ npm install passport-att-alpha

## Usage

#### Configure Strategy

The apimatrix authentication strategy authenticates users using a apimatrix
account and OAuth 2.0 tokens.  The strategy requires a `verify` callback, which
accepts these credentials and calls `done` providing a user, as well as
`options` specifying a app ID, app secret, and callback URL.

    passport.use(new AttApiAlphaStrategy({
        clientID: CLIENT_ID
        clientSecret: CLIENT_SECRET,
        callbackURL: "http://localhost:5000/users/auth/callback"
      }));

#### Authenticate Requests

Use `passport.authenticate()`, specifying the `'att-alpha'` strategy, to
authenticate requests.

For example, as route middleware in an [Express](http://expressjs.com/)
application:

    app.get('/', function (req, res) {
      if(req.user){
        res.send('<h1>AT&T Alpha OAuth2 Example - Logout</h1><a href="/logout">Logout</a>');
        console.log(req.user);
      } else {
        res.send('<h1>AT&T Alpha OAuth2 Example - Please login</h1><a href="/auth">login</a>');
      }
    });

    // GET /auth
    //   Use passport.authenticate() as route middleware to authenticate the
    //   request.  The first step in AT&T Alpha authentication will involve
    //   redirecting the user to apimatrix.tfoundry.com.  After authorization, apimatrix will
    //   redirect the user back to this application at /users/auth/att/callback
    app.get('/auth',
      passport.authenticate('att-alpha', { scope: ['profile', 'addressbook'] }));

    // GET /users/auth/att/callback
    //   Use passport.authenticate() as route middleware to authenticate the
    //   request.  If authentication fails, the user will be redirected back to the
    //   login page.  Otherwise, the primary route function function will be called,
    //   which, in this example, will redirect the user to the home page.
    app.get('/users/auth/att/callback', 
      passport.authenticate('att-alpha', { successRedirect: '/',
                                         failureRedirect: '/' }));

#### Extended Permissions

If you need extended permissions from the user, the permissions can be requested
via the `scope` option to `passport.authenticate()`. See above

## Examples

For a complete, working example, refer to the [login example](./examples/login).

## Credits

  - [Geoff Hollingworth](http://github.com/eusholli)

## License

(The MIT License)

Copyright (c) 2011 Jared Hanson

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
