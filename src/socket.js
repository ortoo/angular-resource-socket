export default function(socketRetryInterceptorProvider) {
  'ngInject';
  var WS_PREF;

  this.setApiEndpoint = setApiEndpoint;

  function setApiEndpoint(endpoint) {
    WS_PREF = endpoint;
    socketRetryInterceptorProvider.setApiEndpoint(endpoint);
  }

  this.$get = function socket($rootScope,
                              $log,
                              $location,
                              $http,
                              $q) {
    'ngInject';

    var allSockets = {};

    var handleErr = function handleErr(data) {
      var err = data && data.err;

      if (err) {
        return $log.error(err);
      }
    };

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

      var self = this;

      this.query = function query(qryObj) {

        var deferred = SocketDefer();
        var params = {
          _idsonly: true,
          _spaging: true
        };

        // Explicitly stringify the queryObj here because we don't want angular removing
        // any of our keys (they're likely to have '$' in them)
        var req = $http.post(this.endpoint + '/query', JSON.stringify(qryObj), {
          params: params
        });

        req.then(function({data, status: statusCode}) {

          // A statusCode of 0 or lower means (essentially) we're offline. Resolve as successful
          // but with no data
          if (statusCode <= 0) {
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

          return deferred.resolve({
            data:  {
              ids: ids,
              pagingOpts: pagingOpts
            }
          });
        }).catch(function(err) {
          deferred.reject(err);
        });

        return deferred.promise;
      };

      this.get = function get(ids) {
        var params, req;

        var deferred = SocketDefer();

        if (Array.isArray(ids)) {
          params = {};

          req = $http.post(this.endpoint + '/bulk', {
            ids: ids
          }, {
            params: params
          });

          req.then(function({data: resdata, status: statusCode}) {

            // A statusCode of 0 or lower means (essentially) we're offline. Resolve as successful
            // but with no data
            if (statusCode <= 0) {
              deferred.resolve();
              return;
            } else if (statusCode !== 200) {
              deferred.reject(resdata);
              return;
            }

            var data = resdata[self.rootKeyPlural];
            deferred.resolve(data);
          }).catch(function(err) {
            deferred.reject(err);
          });
        } else {
          var id = ids;
          params = {};

          req = $http.get(this.endpoint + '/' + id, {
            params: params
          });

          req.then(function success({data: resdata, status: statusCode}) {

            // A statusCode of 0 or lower means (essentially) we're offline. Resolve as successful
            // but with no data
            if (statusCode <= 0) {
              deferred.resolve();
              return;
            } else if (statusCode !== 200) {
              deferred.reject(resdata);
              return;
            }

            var data = resdata[self.rootKey];
            deferred.resolve(data);
          }).catch(function(err) {
            deferred.reject(err);
          });
        }

        return deferred.promise;
      };

      this.create = function create(data) {

        var deferred = SocketDefer();
        var params = {};
        var payload = {};

        payload[this.rootKey] = data;

        var req = $http.post(this.endpoint, payload, {
          params: params
        });

        req.then(function success({data: resdata, status: statusCode}) {

          if (statusCode !== 200) {
            deferred.reject(resdata);
            return;
          }

          data = resdata[self.rootKey];
          deferred.resolve(data);
        }).catch(function(err) {
          deferred.reject(err);
        });

        return deferred.promise;
      };

      this.patch = function patch(id, patchData) {
        var deferred = SocketDefer();
        var payload = {};
        var params = {};

        payload[this.rootKey] = patchData;

        var req = $http.patch(this.endpoint + '/' + id, payload, {
          params: params
        });

        req.then(function({data: response, status: statusCode}) {

          if (statusCode !== 200) {
            deferred.reject(response);
            return;
          }

          var data = response[self.rootKey];
          deferred.resolve(data);
        }).catch(function(err) {
          deferred.reject(err);
        });

        return deferred.promise;
      };

      this.update = function update(id, data) {

        var deferred = SocketDefer();
        var payload = {};
        var params = {};

        payload[this.rootKey] = data;

        var req = $http.post(this.endpoint + '/' + id, payload, {
          params: params
        });

        req.then(function({data: response, status: statusCode}) {

          if (statusCode !== 200) {
            deferred.reject(response);
            return;
          }

          data = response[self.rootKey];
          deferred.resolve(data);
        }).catch(function(err) {
          deferred.reject(err);
        });

        return deferred.promise;
      };

      this.remove = function remove(id) {
        var deferred = SocketDefer();
        var params = {};

        var req = $http['delete'](this.endpoint + '/' + id, {
          params: params
        });

        req.then(function({data, status: statusCode}) {

          if (statusCode !== 200) {
            deferred.reject(data);
            return;
          }

          deferred.resolve(data.success);
        }).catch(function(err) {
          deferred.reject(err);
        });

        return deferred.promise;
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

    return SocketFactory;

  };

}
