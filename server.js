var express = require('express');
var fs = require('fs');
// var passport = require('passport');
// var localStrategy = require('passport-local').Strategy;

var publicRoot = __dirname + '/'; // eslint-disable-line no-path-concat
var port = process.env.PORT || 8080;
var serverConfig = express();
var configurationFile = 'gatewayConfig.json';
var keysFile = 'keys.json';

function writeFile(type, incomingData, done) {
  fs.readFile(configurationFile, 'utf8', function onRead(err, data) {
    var localData;

    if (err) {
      done(err);
      return;
    }

    localData = JSON.parse(data);

    if (type === 'adm') {
      if (incomingData.password) {
        localData.administration.password = incomingData.password;
      }

      if (incomingData.firmware && incomingData.firmware.name && incomingData.firmware.base64) {
        localData.administration.firmware.name = incomingData.firmware.name;
        localData.administration.firmware.base64 = incomingData.firmware.base64;
      }

      localData.administration.remoteSshPort = incomingData.remoteSshPort;
      localData.administration.allowedPassword = incomingData.allowedPassword;
      localData.administration.sshKey = incomingData.sshKey;
    } else if (type === 'net') {
      localData.network.automaticIp = incomingData.automaticIp;

      if (!incomingData.automaticIp) {
        localData.network.ipaddress = incomingData.ipaddress;
        localData.network.defaultGateway = incomingData.defaultGateway;
        localData.network.networkMask = incomingData.networkMask;
      } else {
        localData.network.ipaddress = '';
        localData.network.defaultGateway = '';
        localData.network.networkMask = '';
      }
    }

    fs.writeFile(configurationFile, JSON.stringify(localData), 'utf8', done);
  });
}

function authenticate(incomingData, successCallback, errorCallback) {
  var obj;
  fs.readFile('gatewayConfig.json', 'utf8', function (err, data) {
    if (err) {
      errorCallback(500);
    }
    try {
      obj = JSON.parse(data);
      if (incomingData.username === obj.user.username &&
                                 incomingData.password === obj.user.password) {
        successCallback();
      } else {
        errorCallback('login error');
      }
    } catch (e) {
      errorCallback(e);
    }
  });
}

serverConfig.use(express.static(publicRoot));

/* serves main page */
serverConfig.get('/', function (req, res) {
  res.sendFile('signin.html', { root: publicRoot });
});

serverConfig.get('/main', function (req, res) {
  res.sendFile('main.html', { root: publicRoot });
});

serverConfig.post('/user/authentication', function (req, res) {
  var body = '';
  var reqObj;
  req.on('data', function (data) {
    body += data;
  });

  req.on('end', function () {
    try {
      reqObj = JSON.parse(body);
      authenticate(reqObj, function () {
        console.log('Authenticated');
        res.setHeader('Content-Type', 'application/json');
        res.send({ authenticated: true });
      }, function (err) {
        if (err === 'login error') {
          console.log('Failed');
          res.setHeader('Content-Type', 'application/json');
          res.send({ authenticated: false });
        } else if (err === 500) {
          res.sendStatus(500);
        } else {
          res.sendStatus(400);
        }
      });
    } catch (e) {
      res.sendStatus(400);
    }
  });
});

serverConfig.post('/administration/save', function (req, res) {
  var body = '';
  req.on('data', function (data) {
    body += data;
  });

  req.on('end', function () {
    var jsonObj = JSON.parse(body);
    writeFile('adm', jsonObj, function (err) {
      if (err) {
        console.log(err);
      }
    });

    res.end();
  });
});

serverConfig.get('/administration/info', function (req, res) {
  var obj;
  fs.readFile('gatewayConfig.json', 'utf8', function (err, data) {
    var admObject;

    if (err) {
      throw err;
    }

    obj = JSON.parse(data);

    admObject = {
      password: 'xxxxxxxxxx',
      remoteSshPort: obj.administration.remoteSshPort,
      allowedPassword: obj.administration.allowedPassword,
      sshKey: obj.administration.sshKey,
      firmware: obj.administration.firmware.name
    };
    res.setHeader('Content-Type', 'application/json');
    res.send(admObject);
  });
});

serverConfig.post('/network/save', function (req, res) {
  var body = '';
  req.on('data', function (data) {
    body += data;
  });

  req.on('end', function () {
    var jsonObj = JSON.parse(body);
    writeFile('net', jsonObj, function (err) {
      if (err) {
        console.log(err);
      }
    });

    res.end();
  });
});

serverConfig.get('/network/info', function (req, res) {
  var obj;
  fs.readFile('gatewayConfig.json', 'utf8', function (err, data) {
    if (err) {
      throw err;
    }

    obj = JSON.parse(data);
    res.setHeader('Content-Type', 'application/json');
    res.send(obj.network);
  });
});

serverConfig.post('/devices/save', function (req, res) {
  var body = '';
  var jsonObj;
  req.on('data', function (data) {
    body += data;
  });

  req.on('end', function () {
    try {
      jsonObj = JSON.parse(body);
      fs.writeFile(keysFile, JSON.stringify(jsonObj), 'utf8', function (err) {
        if (err) res.sendStatus(500);
      });
    } catch (e) {
      res.sendStatus(400);
    }
    res.end();
  });
});

serverConfig.get('/devices/info', function (req, res) {
  var obj;
  fs.readFile(keysFile, 'utf8', function (err, data) {
    if (err) res.sendStatus(500);

    try {
      obj = JSON.parse(data);
      res.setHeader('Content-Type', 'application/json');
      res.send(obj);
    } catch (e) {
      res.sendStatus(500);
    }
  });
});

serverConfig.listen(port, function () {
  console.log('Listening on ' + port);
});
