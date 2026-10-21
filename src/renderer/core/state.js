// The single OmniYap namespace. Core modules attach themselves to this object; plugins import it
// (and the helpers they need) from here. Keeping one object makes the injected bundle inspectable
// from DevTools: window.OmniYap.plugins.list(), window.OmniYap.settings.data, ...
import { VERSION } from "../version.js";

export const OmniYap = {
    version: VERSION,
    startedAt: Date.now(),
    dev: typeof __OMNIYAP_DEV__ !== "undefined" ? __OMNIYAP_DEV__ : false,
    initial: /** @type {any} */ (null),
    inApp: false,
    errors: [],
};

// Handy for `window.OmniYap` in DevTools and for the settings UI.
if (typeof window !== "undefined") {
    window.OmniYap = OmniYap;
    window.OmniYapNative = window.OmniYapNative || null;
}

export default OmniYap;
