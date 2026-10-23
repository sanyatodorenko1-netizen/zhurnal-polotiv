/* Meteorological bearing: degrees clockwise from north, where wind comes FROM. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.WeatherWind = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const origins = ['З півночі','З північного сходу','Зі сходу','З південного сходу','З півдня','З південного заходу','Із заходу','З північного заходу'];
  function describe(speed, bearing, unit = 'm/s') {
    let ms = typeof speed === 'number' && Number.isFinite(speed) && speed >= 0 ? speed : null;
    if (unit === 'km/h' && ms !== null) ms /= 3.6;
    else if (unit !== 'm/s') ms = null;
    const speedText = ms === null ? '—' : ms.toLocaleString('uk-UA', {minimumFractionDigits:1, maximumFractionDigits:1}) + ' м/с';
    if (ms === 0) return {speedText, directionText:'Штиль', angle:null};
    if (ms === null || typeof bearing !== 'number' || !Number.isFinite(bearing) || bearing < 0 || bearing > 360) {
      return {speedText, directionText:'Напрямок недоступний', angle:null};
    }
    const angle = bearing % 360;
    return {speedText, directionText:`${origins[Math.round(angle / 45) % 8]} · ${Math.round(angle) % 360}°`, angle};
  }
  function render(current, units) {
    const wind = describe(current?.wind_speed_10m, current?.wind_direction_10m, units?.wind_speed_10m);
    document.getElementById('weatherWind').textContent = wind.speedText;
    document.getElementById('weatherWindDirection').textContent = wind.directionText;
    const arrow = document.getElementById('weatherWindArrow');
    arrow.hidden = wind.angle === null;
    arrow.style.transform = wind.angle === null ? '' : `rotate(${wind.angle}deg)`;
  }
  return {describe, render};
});
