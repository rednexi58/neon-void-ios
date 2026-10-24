// AdMob v6's reward promise stays pending if a video closes without a reward.
// Dismissal events, not the presentation promise, end the game's ad pause.
async function presentAd({ sdk, events, show, rewarded }) {
  const listeners = [];
  let earned = false;
  let settle;
  const closed = new Promise(resolve => { settle = resolve; });
  try {
    if (rewarded) listeners.push(await sdk.addListener(events.Rewarded, reward => { earned = Number(reward?.amount) > 0; }));
    listeners.push(await sdk.addListener(events.Dismissed, () => settle(rewarded ? earned : true)));
    listeners.push(await sdk.addListener(events.FailedToShow, () => settle(false)));
    Promise.resolve().then(show).then(reward => {
      if (rewarded && Number(reward?.amount) > 0) earned = true;
    }).catch(() => settle(false));
    return await closed;
  } finally {
    await Promise.allSettled(listeners.map(listener => listener.remove()));
  }
}
module.exports = { presentAd };
