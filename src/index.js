import angular from 'angular';

import Socket from './socket.js';
import RetryInterceptor from './retryInterceptor';

export default angular.module('or2.socket', [])
  .provider('socketRetryInterceptor', RetryInterceptor)
  .provider('socket', Socket)
  .config(function($httpProvider) {
    $httpProvider.interceptors.push('socketRetryInterceptor');
  });
