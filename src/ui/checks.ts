// checks.ts — "Device checks" list on the placeholder page.
// Shows, with a ✓ or ✗, whether this phone/browser has what the app will need later
// (HTTPS, GPS, compass, background worker). Useful when testing on different phones.

type Check = { label: string; ok: boolean; note?: string };

export function renderChecks(list: HTMLElement, checks: Check[]): void {
  list.innerHTML = "";
  for (const c of checks) {
    const li = document.createElement("li");
    li.innerHTML =
      `<span class="${c.ok ? "ok" : "bad"}">${c.ok ? "✓" : "✗"}</span>` +
      `<span>${c.label}${c.note ? ` <span class="note">— ${c.note}</span>` : ""}</span>`;
    list.appendChild(li);
  }
}

// Gathers the checks that can be answered instantly (no permission prompts).
export function basicChecks(): Check[] {
  // iOS Safari has a special permission function for the compass; other browsers don't.
  const DOE = (window as any).DeviceOrientationEvent;
  const iosCompass = !!DOE && typeof DOE.requestPermission === "function";

  return [
    {
      label: "Secure connection (HTTPS)",
      ok: window.isSecureContext,
      note: window.isSecureContext ? undefined : "GPS and compass need HTTPS",
    },
    { label: "GPS available", ok: "geolocation" in navigator },
    {
      label: "Compass sensor API",
      ok: !!DOE,
      note: iosCompass
        ? "iPhone: will need an “Enable compass” tap (M4)"
        : "onabsolutedeviceorientation" in window
          ? "Android-style absolute compass"
          : undefined,
    },
    { label: "Canvas drawing", ok: !!document.createElement("canvas").getContext("2d") },
  ];
}
