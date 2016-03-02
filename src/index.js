import angular from 'angular';

import Socket from './socket.js';
import RetryInterceptor from './retryInterceptor.js';
import CacheBuster from './cacheBuster.js';

export default angular.module('or2.socket', [])
  .provider('socketRetryInterceptor', RetryInterceptor)
  .provider('socketCacheBuster', CacheBuster)
  .provider('socket', Socket)
  .config(function($httpProvider) {
    $httpProvider.interceptors.push('socketRetryInterceptor', 'socketCacheBuster');
  });
