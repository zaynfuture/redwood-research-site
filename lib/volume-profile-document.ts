/// <reference types="vite/client" />

import template from '@/assets/volume-profile/index.html?raw';
import headerStyles from '@/assets/volume-profile/site-header.css?raw';
import stylesheet from '@/assets/volume-profile/style.css?raw';
import model from '@/assets/volume-profile/model.js?raw';
import chart from '@/assets/volume-profile/chart.js?raw';
import controller from '@/assets/volume-profile/app.js?raw';
import demo from '@/assets/volume-profile/demo.json?raw';
import symbols from '@/assets/volume-profile/symbols.json?raw';

const safeDemo = demo
  .replaceAll('<', '\\u003c')
  .replaceAll('>', '\\u003e')
  .replaceAll('&', '\\u0026');

const safeSymbols = symbols
  .replaceAll('<', '\\u003c')
  .replaceAll('>', '\\u003e')
  .replaceAll('&', '\\u0026');

const slots: Record<string, string> = {
  PROFILE_STYLE: `<style>\n${stylesheet}\n${headerStyles}\n</style>`,
  PROFILE_INITIAL: `<script id="profile-initial" type="application/json">${safeDemo}</script>`,
  SYMBOL_DIRECTORY: `<script id="symbol-directory" type="application/json">${safeSymbols}</script>`,
  PROFILE_SCRIPTS: [model, chart, controller]
    .map((source) => `<script>\n${source}\n</script>`)
    .join('\n'),
};

// Keeping CSS imports outside the route prevents RSC from wrapping its GET export as a component.
export function renderVolumeProfile(locale: string): string {
  return template
    .replace('<body>', '<body data-default-symbol="NVR">')
    .replace(/(<html\b[^>]*?\blang=")[^"]*(")/, (_, prefix, suffix) => prefix + locale + suffix)
    .replace(/<!-- (PROFILE_STYLE|PROFILE_INITIAL|SYMBOL_DIRECTORY|PROFILE_SCRIPTS) -->/g, (_, marker: string) => slots[marker]);
}
