import angular from 'angular';

export default angular.module('or2.socket', [])
  .provider('socket', function() {
    var PUSHER_API_KEY;
    var WS_PREF;

    this.setPusherApiKey = setPusherApiKey;
    this.setApiEndpoint = setApiEndpoint;

    function setApiEndpoint(endpoint) {
      WS_PREF = endpoint;
    }

    function setPusherApiKey(key) {
      PUSHER_API_KEY = key;
    }

    this.$get = function socket($rootScope,
                                $log,
                                $location,
                                $http,
                                $q,
                                $window) {

      var allSockets = {};
      var pusherSupported = true;
      var socketId = null;

      var pusher;
      var Pusher = $window.Pusher;
      if (Pusher && PUSHER_API_KEY) {
        pusher = new Pusher(PUSHER_API_KEY, {
          encrypted: true
          // cluster: 'eu'
        });

        pusher.connection.bind('failed', function failed() {
          pusherSupported = false;
          SocketFactory.pushSupported = false;
        });

        pusher.connection.bind('connected', function connected() {
          socketId = SocketFactory.socketId = pusher.connection.socket_id;
          var channel = pusher.subscribe('or2-socket-' + socketId);

          // Start listening for events on the channel
          channel.bind('object updated', function(data) {
            runSocketHandler(data.model, 'modified get', function(handler) {
              handler(data._id);
            });
          });

          channel.bind('query updated', function(data) {
            runSocketHandler(data.model, 'modified query', function(handler) {
              handler(data.data.qryId, {
                ids: data.data.result,
                pagingOpts: data.data.pagingOpts
              });
            });
          });
        });
      } else {
        pusherSupported = false;
      }



      function runSocketHandler(model, eventName, callback) {
        var socket = allSockets[model];
        if (socket && socket.handlers[eventName]) {
          socket.handlers[eventName].forEach(function(handler) {
            callback(handler);
          });
        }
      }

      var handleErr = function handleErr(data) {
        var err = data && data.err;

        if (err) {
          return $log.error(err);
        }
      };

      var connectionEvents = ['initialized', 'connecting', 'connected', 'unavailable', 'failed',
      'disconnected'];

      function SocketDefer() {

        var deferred = $q.defer();
        var promise = deferred.promise;
        promise['catch'](handleErr);

        return deferred;
      }

      function Or2ComboSocket(namespace, rootKey, rootKeyPlural) {

        this.namespace = namespace;
        this.rootKey = rootKey;
        this.rootKeyPlural = rootKeyPlural;
        this.endpoint = WS_PREF + this.namespace;
        this.handlers = {};
        this.subscriptions = {};

        var self = this;

        this.query = function query(qryObj, replaces) {

          var deferred = SocketDefer();
          var params = {
            _idsonly: true,
            _spaging: true,
            _t: new Date().getTime()
          };

          if (socketId) {
            params._sid = socketId;
          }

          // Are we replacing an existing qryId?
          if (replaces) {
            params._replace = replaces;
          }

          // Explicityl stringify the queryObj here because we don't want angular removing
          // any of our keys (they're likely to have '$' in them)
          var req = $http.post(this.endpoint + '/query', JSON.stringify(qryObj), {
            params: params
          });

          req.success(function(data, statusCode) {

            // A statusCode of 0 means (essentially) we're offline. Resolve as successful
            // but with no data
            if (statusCode === 0) {
              deferred.resolve();
              return;
            } else if (statusCode !== 200) {
              deferred.reject(data);
              return;
            }

            var ids = data[self.rootKeyPlural];

            var pagingOpts = {
              next: data.next,
              prev: data.prev
            };

            var qryId = data.qryId;

            return deferred.resolve({
              qryId: qryId,
              data:  {
                ids: ids,
                pagingOpts: pagingOpts
              }
            });
          });

          req.error(function(err) {
            deferred.reject(err);
          });

          return deferred.promise;
        };

        this.get = function get(ids) {
          var params, req;

          var deferred = SocketDefer();

          if (Array.isArray(ids)) {
            params = {};

            if (socketId) {
              params._sid = socketId;
            }

            params._t = new Date().getTime();
            req = $http.post(this.endpoint + '/bulk', {
              ids: ids
            }, {
              params: params
            });

            req.success(function(resdata, statusCode) {

              // A statusCode of 0 means (essentially) we're offline. Resolve as successful
              // but with no data
              if (statusCode === 0) {
                deferred.resolve();
                return;
              } else if (statusCode !== 200) {
                deferred.reject(resdata);
                return;
              }

              var data = resdata[self.rootKeyPlural];
              deferred.resolve(data);
            });

            req.error(function(err) {
              deferred.reject(err);
            });
          } else {
            var id = ids;
            params = {};

            if (socketId) {
              params._sid = socketId;
            }

            params._t = new Date().getTime();
            req = $http.get(this.endpoint + '/' + id, {
              params: params
            });

            req.success(function success(resdata, statusCode) {

              // A statusCode of 0 means (essentially) we're offline. Resolve as successful
              // but with no data
              if (statusCode === 0) {
                deferred.resolve();
                return;
              } else if (statusCode !== 200) {
                deferred.reject(resdata);
                return;
              }

              var data = resdata[self.rootKey];
              deferred.resolve(data);
            });

            req.error(function(err) {
              deferred.reject(err);
            });
          }

          return deferred.promise;
        };

        this.create = function create(data) {

          var deferred = SocketDefer();
          var params = {};
          var payload = {};

          if (socketId) {
            params._sid = socketId;
          }

          params._t = new Date().getTime();
          payload[this.rootKey] = data;

          var req = $http.post(this.endpoint, payload, {
            params: params
          });

          req.success(function success(resdata, statusCode) {

            if (statusCode !== 200) {
              deferred.reject(resdata);
              return;
            }

            data = resdata[self.rootKey];
            deferred.resolve(data);
          });

          req.error(function(err) {
            deferred.reject(err);
          });

          return deferred.promise;
        };

        this.patch = function patch(id, patchData) {
          var deferred = SocketDefer();
          var payload = {};
          var params = {
            _t: new Date().getTime()
          };

          payload[this.rootKey] = patchData;

          if (socketId) {
            params._sid = socketId;
          }

          var req = $http.patch(this.endpoint + '/' + id, payload, {
            params: params
          });

          req.success(function(response, statusCode) {

            if (statusCode !== 200) {
              deferred.reject(response);
              return;
            }

            var data = response[self.rootKey];
            deferred.resolve(data);
          });

          req.error(function(err) {
            deferred.reject(err);
          });

          return deferred.promise;
        };

        this.update = function update(id, data) {

          var deferred = SocketDefer();
          var payload = {};
          var params = {
            _t: new Date().getTime()
          };

          payload[this.rootKey] = data;

          if (socketId) {
            params._sid = socketId;
          }

          var req = $http.post(this.endpoint + '/' + id, payload, {
            params: params
          });

          req.success(function(response, statusCode) {

            if (statusCode !== 200) {
              deferred.reject(response);
              return;
            }

            data = response[self.rootKey];
            deferred.resolve(data);
          });

          req.error(function(err) {
            deferred.reject(err);
          });

          return deferred.promise;
        };

        this.remove = function remove(id) {
          var deferred = SocketDefer();
          var params = {
            _t: new Date().getTime()
          };

          if (socketId) {
            params._sid = socketId;
          }

          var req = $http['delete'](this.endpoint + '/' + id, {
            params: params
          });

          req.success(function(data, statusCode) {

            if (statusCode !== 200) {
              deferred.reject(data);
              return;
            }

            deferred.resolve(data.success);
          });

          req.error(function(err) {
            deferred.reject(err);
          });

          return deferred.promise;
        };

        this.on = function on(eventName, callback) {

          if (!pusherSupported) {
            return;
          }

          if (~connectionEvents.indexOf(eventName)) {
            return pusher.connection.bind(eventName, callback);
          } else {
            var handlers;
            if(this.handlers[eventName]) {
              handlers = this.handlers[eventName];
            } else {
              handlers = this.handlers[eventName] = [];
            }

            handlers.push(callback);
          }
        };

        this.reset = function reset() {
          var handlers = this.handlers.reset;
          if (handlers) {
            handlers.forEach(function(handler) {
              handler();
            });
          }
        };
      }

      // Create the socket factory
      function SocketFactory(namespace, rootKey, rootKeyPlural) {
        // Have we already got one for this namespace?
        if (!allSockets[rootKey]) {
          allSockets[rootKey] = new Or2ComboSocket(namespace, rootKey, rootKeyPlural);
        }

        return allSockets[rootKey];
      }

      SocketFactory.pushSupported = pusherSupported;

      SocketFactory.resetAll = function resetAll() {
        allSockets.forEach(function(socket){
          socket.reset();
        });
      };

      return SocketFactory;

    };

  });
