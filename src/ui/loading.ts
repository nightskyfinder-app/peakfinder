// loading.ts — the "please wait" box shown over the panorama while
// elevation tiles download and the skyline is calculated.

export class LoadingIndicator {
  constructor(
    private box: HTMLElement,
    private text: HTMLElement,
    private bar: HTMLElement,
  ) {}

  /** Show a message; `fraction` (0–1) fills the progress bar, or omit it for a moving "busy" bar. */
  show(message: string, fraction?: number): void {
    this.box.hidden = false;
    this.text.textContent = message;
    if (fraction === undefined) {
      this.bar.classList.add("busy");
      this.bar.style.width = "";
    } else {
      this.bar.classList.remove("busy");
      this.bar.style.width = `${Math.round(fraction * 100)}%`;
    }
  }

  hide(): void {
    this.box.hidden = true;
  }
}
