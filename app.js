var express = require('express')
  , request = require('request')
  , passport = require('passport')
  , util = require('util')
  , AttAlphaStrategy = require('passport-att-alpha').Strategy;

var mongoStore = require('session-mongoose');

var express = require('express');
var app = module.exports = express.createServer();

var mongoUri = process.env.MONGOHQ_URL || 'mongodb://localhost/users';

var mongooseSessionStore = new mongoStore({
  url: mongoUri,
  interval: 3600000
});


var clientId = process.env.ATT_CLIENT_ID;
var clientSecret = process.env.ATT_CLIENT_SECRET;
var callbackUrl = process.env.CALLBACK_URL;
console.log("clientId=" + clientId);
console.log("clientSecret=" + clientSecret);
console.log("callbackUrl=" + callbackUrl);

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete AT&T Alpha profile is serialized
//   and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});


// Use the AttAlphaStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and AttAlpha
//   profile), and invoke a callback with a user object.
passport.use(new AttAlphaStrategy({
    clientID: clientId,
    clientSecret: clientSecret,
    callbackURL: callbackUrl,
    passReqToCallback: true
  },
  function(req, accessToken, refreshToken, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      
      // save accessToken
      req.session.alphaAccessToken = accessToken;
      // To keep the example simple, the user's apimatrix profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the apimatrix account with a user record in your database,
      // and return that user instead.
      return done(null, profile);
    });
  }
));


// Configuration

// configure Express
app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.logger());
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.session({ 
    secret: 'tulips in sheffield',
    cookie: {maxAge: 3600000},
    store: mongooseSessionStore
  }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});


// Routes

app.get('/', function(req, res) {
  console.log("root page");
  var version = req.param("version");
  if(version) {
    req.session.version = version;
  }
  res.render('login');
});

function generateUI(req, res, ui) {

  var version = req.param("version");
  if(version) {
    req.session.currentVersion = version;
  } else {
    version = "a1";
  }

  if(!req.session.currentVersion) {
    req.session.currentVersion = version;
  }

  console.log("version=" + version);
  if(!req.session.selfNumber) {
    var url = 'https://auth.tfoundry.com/me.json?access_token=' + req.session.alphaAccessToken;
    request(url, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var obj = JSON.parse(body);
        req.session.selfNumber = obj.phone_number
        console.log(body);
        console.log(obj);
        console.log(req.session.selfNumber);
        res.render(ui, { version : version, accessToken: req.session.alphaAccessToken, selfNumber: req.session.selfNumber });
      } else {
        console.error(ui + ' me.json error');
        res.render('login');
        return;
      }
    });
  } else {
    console.log("session version=" + req.session.currentVersion);
    res.render(ui, { version : req.session.currentVersion, accessToken: req.session.alphaAccessToken, selfNumber: req.session.selfNumber });
  }
}

app.get('/basic', function(req, res) {
  console.log("main basic page");
  if(req.user){
    generateUI(req, res, "basic");
  } else {
    res.render('login');
  }
});

app.get('/pages', function(req, res) {
  console.log("main pages page");
  if(req.user){
    generateUI(req, res, "pages");
  } else {
    res.render('login');
  }
});

app.get('/cbar', function(req, res) {
  console.log("main cbar page");
  if(req.user){
    generateUI(req, res, "cbar");
  } else {
    res.render('login');
  }
});

// GET /auth
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in AT&T Alpha authentication will involve
//   redirecting the user to apimatrix.tfoundry.com.  After authorization, apimatrix will
//   redirect the user back to this application at /users/auth/att/callback
app.get('/auth', 
  passport.authenticate('att-alpha', { scope: ['webrtc'] }));

// GET /users/auth/att/callback
// Callback for main app
app.get('/users/auth/att/callback', 
  passport.authenticate('att-alpha'), 
  function(req, res){
    var versionTxt = req.session.version;
    if(versionTxt) {
      versionTxt = '?version=' + versionTxt;
      req.session.version = null;
    } else {
      versionTxt = '';
    }
    res.redirect('/basic' + versionTxt );
  });

app.get('/logout', function(req, res){
  console.log("logout");
  req.logout();
  res.redirect('/');
});

app.get('/login-failed', function (req, res) {
    res.send('<h1>Login failed</h1>');
});

var port = process.env.PORT || 5000;
app.listen(port);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
