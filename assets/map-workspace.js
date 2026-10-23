/* Map presentation controls, independent of record persistence. */
(() => {
  'use strict';
  const el = id => document.getElementById(id);
  let map;
  const notice = text => { el('mapNotice').hidden = false; el('mapNotice').textContent = text; };
  function selected(lat, lon) {
    const text = window.MapCoordinates.toMGRS(lat, lon);
    el('locationMGRS').value = text || '';
    el('copyCoordinatesBtn').disabled = !text;
    el('locationMGRS').placeholder = text ? '' : 'MGRS підтримується від 80° пд. до 84° пн.';
    el('mapSelectedLabel').textContent = text || 'Полярна область · WGS84';
    el('locationWGS84').textContent = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  }
  function clear() {
    el('locationMGRS').value = '';
    el('copyCoordinatesBtn').disabled = true;
    el('locationMGRS').placeholder = 'Оберіть точку на карті';
    el('locationWGS84').textContent = '—';
    el('mapSelectedLabel').textContent = 'Точку не вибрано';
  }
  function initialize(instance) {
    map = instance;
    function theme() {
      if (el('mapStyleSelect').value !== 'dark' || !map.getStyle) return;
      for (const layer of map.getStyle().layers || []) {
        if (layer.type === 'background') map.setPaintProperty(layer.id, 'background-color', '#0d1716');
        if (layer.type === 'symbol' && layer.layout?.['text-field']) {
          map.setPaintProperty(layer.id, 'text-color', '#9ab9ab');
          map.setPaintProperty(layer.id, 'text-halo-color', '#0d1b15');
          map.setPaintProperty(layer.id, 'text-halo-width', 1.2);
        }
        if (layer.type === 'fill') {
          if (layer.id === 'water') map.setPaintProperty(layer.id, 'fill-color', '#153d37');
          else if (/landcover|landuse/.test(layer.id)) map.setPaintProperty(layer.id, 'fill-color', '#193328');
          else if (layer.id === 'building') map.setPaintProperty(layer.id, 'fill-color', '#213b30');
        }
        if (layer.type === 'line') {
          if (/waterway/.test(layer.id)) map.setPaintProperty(layer.id, 'line-color', '#265f4f');
          else if (/highway|road/.test(layer.id)) map.setPaintProperty(layer.id, 'line-color', /casing/.test(layer.id) ? '#182b22' : '#39574a');
          else if (/boundary/.test(layer.id)) map.setPaintProperty(layer.id, 'line-color', '#567565');
        }
      }
    }
    map.on('style.load', theme);
    if (map.isStyleLoaded?.()) theme();
    map.on('mousemove', event => {
      el('mapCursor').textContent = window.MapCoordinates.toMGRS(event.lngLat.lat, event.lngLat.lng) || 'MGRS: поза діапазоном UTM';
    });
    map.on('zoomend', () => { el('mapZoom').textContent = map.getZoom().toFixed(1); });
  }
  el('mgrsSearchForm').addEventListener('submit', event => {
    event.preventDefault();
    if (!map) { notice('Карта ще не готова. Перевірте підключення.'); return; }
    try {
      const [lat, lon] = window.MapCoordinates.fromMGRS(el('mgrsSearch').value);
      selectAgroLocation(lat, lon, 'Точка MGRS');
      el('mapNotice').hidden = true;
    } catch (error) { notice(error.message || 'Не вдалося прочитати MGRS.'); }
  });
  el('savedPointsLayer').addEventListener('change', () => renderWorkMarkers());
  el('weatherPanelLayer').addEventListener('change', () => { el('mapWeatherPanel').hidden = !el('weatherPanelLayer').checked; });
  el('mapFullscreen').addEventListener('click', async () => {
    const panel = el('agroMapSection');
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (panel.requestFullscreen) await panel.requestFullscreen();
      else { panel.classList.toggle('map-expanded'); resize(); }
    } catch (_) { panel.classList.toggle('map-expanded'); resize(); }
  });
  function resize() {
    const active = !!document.fullscreenElement || el('agroMapSection').classList.contains('map-expanded');
    el('mapFullscreen').textContent = active ? '↙ Згорнути' : '⛶ На весь екран';
    el('mapFullscreen').setAttribute('aria-pressed', String(active));
    requestAnimationFrame(() => map?.resize());
  }
  document.addEventListener('fullscreenchange', resize);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && el('agroMapSection').classList.contains('map-expanded')) {
      el('agroMapSection').classList.remove('map-expanded'); resize();
    }
  });
  window.JournalMap = {initialize, selected, clear};
  if (typeof agroMap !== 'undefined' && agroMap) initialize(agroMap);
})();
