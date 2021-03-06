var connect = require('connect');
var passport = require('passport');
var LocalStrategy = require('passport-local');
var jwt = require('jsonwebtoken');
var expressJwt = require('express-jwt');
var users = require('../models/users');

var TOKEN_SECRET = require('../config').TOKEN_SECRET;
var TOKEN_EXPIRATION = require('../config').TOKEN_EXPIRATION;

var initialize = function initialize() {
  return passport.initialize();
};

var createToken = function createToken(req, res, next) {
  req.token = jwt.sign(req.user, TOKEN_SECRET, { expiresIn: TOKEN_EXPIRATION });
  next();
};

var respond = function respond(req, res) {
  res.json({
    user: req.user,
    token: req.token
  });
};

var authenticate = function authenticate() {
  var chain = connect();
  chain.use(passport.authenticate('local', { session: false }));
  chain.use(createToken);
  chain.use(respond);
  return chain;
};

var authorize = function authorize() {
  return expressJwt({ secret: TOKEN_SECRET });
};

// Configure passport
passport.use(new LocalStrategy(
  function (username, password, done) {
    users.get(function onUserReturned(err, user) {
      if (err) {
        return done(err);
      } else if (username !== user.username || password !== user.password) {
        return done(null, false);
      }

      // Currently there is only the admin user
      return done(null, { role: 'admin' });
    });
  }
));

module.exports = {
  initialize: initialize,
  authenticate: authenticate,
  authorize: authorize
};
