var express = require('express');
var bodyParser = require('body-parser');
var dbus = require('dbus-native');

var config = require('./app/config');
var apiRoute = require('./app/routes/api');
var handlers = require('./app/helpers/handlers');

var publicRoot = __dirname + '/public/'; // eslint-disable-line no-path-concat
var serverConfig = express();
var sessionBus = dbus.sessionBus();

var targetServiceName = 'org.gtk.GDBus.TestServer';
var targetIfaceName = 'org.gtk.GDBus.TestInterface';
var targetObjectPath = '/org/gtk/GDBus/TestObject';

serverConfig.use(bodyParser.json());
serverConfig.use(bodyParser.urlencoded({ extended: true }));
serverConfig.use(express.static(publicRoot));

serverConfig.use('/api', apiRoute.router);
serverConfig.use('*', handlers.defaultHandler);
serverConfig.use(handlers.errorHandler);

var server = serverConfig.listen(config.PORT, function () {
  console.log('Listening on ' + config.PORT);
});

var io = require('socket.io').listen(server);

io.on('connection', function (socket) {
  console.log('connection established');
  if (!sessionBus) {
    throw new Error('Could not connect to the DBus session bus.');
  }

  sessionBus.getService(targetServiceName).getInterface(
  targetObjectPath, targetIfaceName, function (err, notifications) {
    if (err || !notifications) {
      console.error('Could not query interface \'' + targetIfaceName + '\', the error was: ' + err ? err : '(no error)');
      process.exit(1);
    }
    console.log('Listening to nrfd signals');
    notifications.on('InterfaceAdded', function () {
      socket.broadcast.emit('InterfaceAdded', arguments);
    });
    notifications.on('InterfaceRemoved', function () {
      socket.broadcast.emit('InterfaceRemoved', arguments);
    });
    notifications.on('PropertyChanged', function () {
      socket.broadcast.emit('PropertyChanged', arguments);
    });
    notifications.on('VelocityChanged', function () {
      socket.broadcast.emit('VelocityChanged', arguments);
    });
  });
});
