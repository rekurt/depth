/* global document */
// Run this expression in the demo's browser console after each resize has settled.
// Regression matrix: 320, 390, 768, 1280, then back to 320 pixels (900px height).
// Exercise toolbar controls and themes, then repeat the matrix without reloading.
(() => {
  const width = document.documentElement.clientWidth;
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  assert(document.documentElement.scrollWidth <= width, 'Page overflows horizontally');
  const controls = [...document.querySelectorAll('button, select, input')];
  assert(controls.length > 0, 'Toolbar controls are missing');
  for (const element of controls) {
    const rect = element.getBoundingClientRect();
    assert(rect.width > 0 && rect.height > 0, 'Control is hidden');
    assert(rect.left >= -1 && rect.right <= width + 1, 'Control escapes the viewport');
  }
  const canvases = [...document.querySelectorAll('canvas')];
  assert(canvases.length >= 2, 'Chart canvases are missing');
  for (const canvas of canvases) {
    const rect = canvas.getBoundingClientRect();
    assert(rect.width > 100 && rect.height > 100, 'Chart collapsed');
    assert(rect.left >= -1 && rect.right <= width + 1, 'Canvas escapes the viewport');
    assert(Math.abs(rect.width - canvas.parentElement.clientWidth) <= 1, 'Canvas did not resize with its container');
    assert(canvas.width > 0 && canvas.height > 0, 'Canvas bitmap is empty');
  }
  return { width, controls: controls.length, canvases: canvases.length, passed: true };
})();
