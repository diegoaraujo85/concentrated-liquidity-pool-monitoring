// Debounce utility — delays function execution to avoid excessive API calls
export function debounce(func, wait) {
  let timeoutId;
  let lastArgs;
  let lastThis;

  function later() {
    func.apply(lastThis, lastArgs);
    timeoutId = null;
    lastArgs = null;
    lastThis = null;
  }

  function debounced(...args) {
    lastArgs = args;
    lastThis = this;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(later, wait);
  }

  debounced.cancel = function () {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
      lastArgs = null;
      lastThis = null;
    }
  };

  debounced.flush = function () {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
      func.apply(lastThis, lastArgs);
      lastArgs = null;
      lastThis = null;
    }
  };

  return debounced;
}
