/* MGRS conversion runs locally; existing WGS84 strings remain valid. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./vendor/mgrs-2.2.0.min.js'));
  else root.MapCoordinates = factory(root.mgrs);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (mgrs) {
  'use strict';
  function normalize(value) {
    const text = String(value || '').toUpperCase().replace(/\s+/g, '');
    const match = text.match(/^([1-9]|[1-5]\d|60)([C-HJ-NP-X])([A-HJ-NP-Z])([A-HJ-NP-V])(\d{0,10})$/);
    if (!match || match[5].length % 2) throw new Error('Введіть повний код MGRS: зона, квадрат і парна кількість цифр.');
    const columns = ['ABCDEFGH','JKLMNPQR','STUVWXYZ'][(Number(match[1]) - 1) % 3];
    if (!columns.includes(match[3])) throw new Error('Квадрат MGRS не відповідає вказаній зоні.');
    return text;
  }
  function format(value) {
    const text = normalize(value);
    const match = text.match(/^(\d{1,2}[A-Z])([A-Z]{2})(\d*)$/);
    const half = match[3].length / 2;
    return [match[1], match[2], match[3].slice(0, half), match[3].slice(half)].filter(Boolean).join(' ');
  }
  function fromMGRS(value) {
    if (!mgrs) throw new Error('Модуль MGRS не завантажено. Оновіть сторінку.');
    const text = normalize(value);
    const [lon, lat] = mgrs.toPoint(text);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -80 || lat > 84 || Math.abs(lon) > 180) throw new Error('Координати MGRS поза підтримуваним діапазоном.');
    const band = text.match(/^\d+([A-Z])/)[1];
    const index = 'CDEFGHJKLMNPQRSTUVWX'.indexOf(band);
    const south = -80 + index * 8;
    // A coarse grid square may cross the nominal latitude band boundary.
    const margin = text.replace(/^\d+[A-Z]{3}/, '').length === 0 ? 1 : 0.1;
    if (lat < south - margin || lat > (band === 'X' ? 84 : south + 8) + margin) throw new Error('Квадрат MGRS не відповідає широтній зоні.');
    return [lat, lon];
  }
  function toMGRS(lat, lon) {
    if (!mgrs || !Number.isFinite(lat) || !Number.isFinite(lon) || lat < -80 || lat > 84 || Math.abs(lon) > 180) return null;
    try { return format(mgrs.forward([lon, lat], 5)); } catch (_) { return null; }
  }
  function parse(value) {
    const text = String(value || '').trim();
    const match = text.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    if (match) {
      const lat = Number(match[1]), lon = Number(match[2]);
      return Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? [lat, lon] : null;
    }
    try { return fromMGRS(text); } catch (_) { return null; }
  }
  return {normalize, format, fromMGRS, toMGRS, parse};
});
