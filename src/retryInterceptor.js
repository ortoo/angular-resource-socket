import Backoff from 'backo';

import {isWsReq} from './utils.js';

export default function() {
  'ngInject';

  var CONFIG_FIELD_NAME = '__arsRetry';

  var NUM_ATTEMPTS = 5;
  var API_ENDPOINT;

  this.setMaxNumAttempts = function(num) {
    NUM_ATTEMPTS = num;
  };

  this.setApiEndpoint = function(endpoint) {
    API_ENDPOINT = new URL(endpoint);
  };

  this.setConfigRetryName = function(name) {
    CONFIG_FIELD_NAME = name;
  };

  this.$get = retryInterceptor;

  function retryInterceptor($q, $injector, $timeout) {
    'ngInject';

    return {
      response: response
    };

    function response(response) {
      var code = response.status;

      // Retry on non-500, 5xx errors
      if (code > 500 && code < 600 && isWsReq(API_ENDPOINT, response.config.url)) {
        return maybeRetry(response);
      } else {
        return $q.resolve(response);
      }
    }

    function maybeRetry(response) {
      var config = response.config;
      var retry = config[CONFIG_FIELD_NAME];
      if (!retry) {
        retry = {
          count: 0,
          backo: new Backoff({ min: 1000, max: 20000 })
        };
        config[CONFIG_FIELD_NAME] = retry;
      }

      if (retry.count >= NUM_ATTEMPTS) {
        return $q.resolve(response);
      }

      retry.count++;
      return $timeout(() => resendRequest(config), retry.backo.duration());
    }

    function resendRequest(config) {
      var $http = $injector.get('$http');
      return $http(config);
    }
  }


}
