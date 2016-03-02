import {isWsReq} from './utils.js';

export default function() {
  'ngInject';

  var API_ENDPOINT;

  this.setApiEndpoint = function setApiEndpoint(endpoint) {
    API_ENDPOINT = new URL(endpoint);
  };

  this.$get = cacheBuster;

  function cacheBuster() {
    'ngInject';

    return {
      request: request
    };

    function request(config) {
      if (isWsReq(API_ENDPOINT, config.url)) {
        if (!config.params) {
          config.params = {};
        }

        if (!config.params._t) {
          config.params._t = Date.now();
        }
      }

      return config;
    }
  }
}
