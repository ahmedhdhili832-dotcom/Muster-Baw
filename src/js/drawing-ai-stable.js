/* MUSTER BAW — Stable Drawing bridge
   The reliable scanner now owns the upload input. This bridge only exists for older deployments. */
"use strict";
(() => {
  function mount() {
    const page = document.querySelector("#page-drawing-scanner");
    if (!page) return;
    // New scanner: do not clone/replace its input or start legacy OCR.
    if (page.dataset.reliableScanner === "1") return;
  }
  document.addEventListener("DOMContentLoaded", mount);
  new MutationObserver(mount).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  window.MusterStableDrawing = { mount };
})();