// Generates CODE128 barcodes into an SVG element via JsBarcode (CDN global).

export function renderBarcode(svgEl, value) {
  if (!window.JsBarcode) {
    console.error('JsBarcode failed to load.');
    return;
  }
  window.JsBarcode(svgEl, value, {
    format:       'CODE128',
    width:        2.4,
    height:       110,
    margin:       8,
    fontSize:     16,
    font:         "'Inter', system-ui, sans-serif",
    background:   '#ffffff',
    lineColor:    '#0f172a',
    displayValue: true,
    textMargin:   6,
  });
}
