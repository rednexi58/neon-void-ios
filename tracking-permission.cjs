// App Tracking Transparency gate.
// Apple requires the ATT system prompt to appear before any data that could be used for
// tracking is collected. The ad flow awaits ensure() before UMP consent and SDK start.
// The native side (ios_config/patch-admob.cjs) waits until the app is active and returns
// the final status, so this module only decides *whether* to ask and remembers the result.
const STATUS = Object.freeze({
  AUTHORIZED: 'authorized',
  DENIED: 'denied',
  RESTRICTED: 'restricted',
  NOT_DETERMINED: 'notDetermined',
  UNAVAILABLE: 'unavailable'
});
const KNOWN = new Set([STATUS.AUTHORIZED, STATUS.DENIED, STATUS.RESTRICTED, STATUS.NOT_DETERMINED]);

function normalize(value) {
  const status = value && typeof value === 'object' ? value.status : value;
  return KNOWN.has(status) ? status : STATUS.UNAVAILABLE;
}

function createTrackingGate({ sdk, isIOS, onStatus = () => {}, onError = () => {} }) {
  let settled = null;
  let inFlight = null;

  async function readStatus() {
    return normalize(await sdk.trackingAuthorizationStatus());
  }

  async function run() {
    let status = await readStatus();
    if (status === STATUS.NOT_DETERMINED) {
      const answer = await sdk.requestTrackingAuthorization();
      status = normalize(answer);
      if (status === STATUS.UNAVAILABLE || status === STATUS.NOT_DETERMINED) status = await readStatus();
    }
    return status;
  }

  function ensure() {
    if (!isIOS) return Promise.resolve(STATUS.UNAVAILABLE);
    if (settled) return Promise.resolve(settled);
    if (!inFlight) {
      inFlight = run()
        .catch(error => { onError(error); return STATUS.UNAVAILABLE; })
        .then(status => {
          // Only a user decision (or a device restriction) is final; anything else may be retried.
          if (status !== STATUS.NOT_DETERMINED && status !== STATUS.UNAVAILABLE) settled = status;
          onStatus(status);
          return status;
        })
        .finally(() => { inFlight = null; });
    }
    return inFlight;
  }

  return {
    ensure,
    get status() { return settled; }
  };
}

module.exports = { createTrackingGate, STATUS };
