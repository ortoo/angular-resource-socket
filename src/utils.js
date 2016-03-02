export function isWsReq(endpoint, url) {

  if (!endpoint) {
    return false;
  }

  // Is the url for the api? - We check by running the url through an a element (nice...)
  try {
    var urlObj = new URL(url);
  } catch (err) {
    // Problem parsing this URL - its definitely not a WS one
    return false;
  }

  var urlHost = urlObj.host;
  var urlPath = urlObj.pathname;
  var wsHost = endpoint.host;
  var wsPath = endpoint.pathname;
  return ((urlHost === wsHost) && (urlPath.indexOf(wsPath) === 0));
}
