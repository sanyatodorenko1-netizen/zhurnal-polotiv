(function (global) {
  'use strict';

  const EXCELJS_URL = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
  const IMPACT_LABELS = ['Пошкоджено', 'Знищено', 'Уражено', 'Подавлено'];

  function text(value) {
    return value == null ? '' : String(value).trim();
  }

  function numberOrNull(value) {
    if (value == null || text(value) === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function classify(record) {
    const platform = text(record.platformKind).toLocaleLowerCase('uk-UA');
    const task = text(record.task).toLocaleLowerCase('uk-UA');
    const aircraft = text(record.aircraft).toLocaleLowerCase('uk-UA');
    if (platform.includes('vamp') || platform.includes('вамп') || task.includes('вамп') || aircraft.includes('vamp') || aircraft.includes('вамп')) return 'VAMPIRE';
    if (platform === 'нрк' || task.includes('місія нрк')) return 'НРК';
    return '';
  }

  function parseDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text(value));
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (date.getFullYear() !== Number(match[1]) || date.getMonth() !== Number(match[2]) - 1 || date.getDate() !== Number(match[3])) return null;
    return date;
  }

  function dateLabel(date) {
    return date ? date.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
  }

  function knownSum(records, field) {
    const values = records.map(record => numberOrNull(record[field])).filter(value => value !== null);
    return { value: values.length ? values.reduce((sum, value) => sum + value, 0) : null, known: values.length, total: records.length };
  }

  function statusText(value) {
    if (value === true || value === 'true') return 'Так';
    if (value === false || value === 'false') return 'Ні';
    return '';
  }

  function sortByDate(records) {
    return [...records].sort((a, b) => text(a.date).localeCompare(text(b.date)) || text(a.startTime).localeCompare(text(b.startTime)));
  }

  function styleCell(cell, fill, fontColor, bold) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
    cell.font = { name: 'Aptos', size: 10, bold: !!bold, color: { argb: fontColor } };
    cell.alignment = { vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD8E0D9' } },
      left: { style: 'thin', color: { argb: 'FFD8E0D9' } },
      bottom: { style: 'thin', color: { argb: 'FFD8E0D9' } },
      right: { style: 'thin', color: { argb: 'FFD8E0D9' } },
    };
  }

  function addSectionTitle(sheet, row, title, lastColumn) {
    sheet.mergeCells(row, 1, row, lastColumn);
    const cell = sheet.getCell(row, 1);
    cell.value = title;
    cell.font = { name: 'Aptos Display', size: 11, bold: true, color: { argb: 'FF172014' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC7F36B' } };
    cell.alignment = { vertical: 'middle' };
    sheet.getRow(row).height = 22;
  }

  function addSummary(sheet, rows, startRow) {
    const header = sheet.getRow(startRow);
    header.values = ['Показник', 'Значення', 'Заповненість джерела'];
    header.height = 30;
    header.eachCell(cell => styleCell(cell, 'FF26382B', 'FFFFFFFF', true));
    rows.forEach((values, index) => {
      const row = sheet.getRow(startRow + index + 1);
      row.values = values;
      row.height = 28;
      row.eachCell({ includeEmpty: true }, cell => styleCell(cell, index % 2 ? 'FFF6F8F5' : 'FFFFFFFF', 'FF1D2821', false));
      if (typeof values[1] === 'number') row.getCell(2).numFmt = '#,##0.##';
    });
    return startRow + rows.length + 1;
  }

  function prepareSheet(sheet, title, period, columnCount) {
    sheet.properties.defaultRowHeight = 21;
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
    sheet.mergeCells(1, 1, 1, columnCount);
    sheet.getCell('A1').value = `ЗВІТ РЕЙСІВ — ${title}`;
    sheet.getCell('A1').font = { name: 'Aptos Display', size: 16, bold: true, color: { argb: 'FF172014' } };
    sheet.getCell('A1').alignment = { vertical: 'middle' };
    sheet.getRow(1).height = 32;
    sheet.mergeCells(2, 1, 2, columnCount);
    sheet.getCell('A2').value = `Звітний період за записами журналу: ${period}`;
    sheet.getCell('A2').font = { name: 'Aptos', size: 10, italic: true, color: { argb: 'FF526158' } };
    sheet.getRow(2).height = 24;
    sheet.mergeCells(3, 1, 3, columnCount);
    sheet.getCell('A3').value = 'У звіті лише НРК і VAMPIRE. Порожні та відсутні значення не замінено нулями.';
    sheet.getCell('A3').font = { name: 'Aptos', size: 9, color: { argb: 'FF526158' } };
    sheet.getCell('A3').alignment = { wrapText: true, vertical: 'middle' };
    sheet.getRow(3).height = 28;
    sheet.getColumn(1).width = 34;
    sheet.getColumn(2).width = 24;
    sheet.getColumn(3).width = 48;
  }

  function addDetails(sheet, headers, rows, startRow) {
    addSectionTitle(sheet, startRow, 'ЗАПИСИ ЖУРНАЛУ', headers.length);
    const headingRow = startRow + 1;
    const header = sheet.getRow(headingRow);
    header.values = headers;
    header.height = 38;
    header.eachCell(cell => styleCell(cell, 'FF26382B', 'FFFFFFFF', true));
    rows.forEach((values, index) => {
      const row = sheet.getRow(headingRow + index + 1);
      row.values = values;
      row.height = 27;
      row.eachCell({ includeEmpty: true }, cell => styleCell(cell, index % 2 ? 'FFF6F8F5' : 'FFFFFFFF', 'FF1D2821', false));
      if (row.getCell(2).value instanceof Date) row.getCell(2).numFmt = 'dd.mm.yyyy';
    });
    sheet.autoFilter = { from: { row: headingRow, column: 1 }, to: { row: headingRow + rows.length, column: headers.length } };
    sheet.views = [{ state: 'frozen', ySplit: headingRow }];
    return headingRow + rows.length + 2;
  }

  function addUnavailable(sheet, items, row, lastColumn) {
    if (!items.length) return;
    addSectionTitle(sheet, row, 'ПОКАЗНИКИ ЗІ ЗРАЗКА, ЯКІ НЕ МОЖНА ДОСТОВІРНО СФОРМУВАТИ', lastColumn);
    items.forEach((item, index) => {
      const target = sheet.getRow(row + index + 1);
      sheet.mergeCells(row + index + 1, 1, row + index + 1, lastColumn);
      target.getCell(1).value = `• ${item}`;
      target.height = 32;
      target.getCell(1).font = { name: 'Aptos', size: 10, color: { argb: 'FF5C4A1E' } };
      target.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF5D9' } };
      target.getCell(1).alignment = { vertical: 'middle', wrapText: true };
    });
  }

  function buildNrkSheet(workbook, records, period, uncategorized) {
    const sheet = workbook.addWorksheet('НРК');
    const detailHeaders = ['Час', 'Дата', 'Тип завдання', 'Тип / модель', 'Номер борта / НРК', 'Пункт відправлення', 'Пункт доставки', 'Виїздів', 'Успішні місії', 'Неуспішні місії', 'Тип вантажу', 'Маса вантажу, кг', 'Доставлено', 'Повернувся на базу', 'Втрачено бортів', 'Виконавець', 'Є-бали', 'Примітки'];
    prepareSheet(sheet, 'НРК', period, detailHeaders.length);
    const trips = knownSum(records, 'nrkTrips');
    const successful = knownSum(records, 'nrkSuccessfulMissions');
    const failed = knownSum(records, 'nrkFailedMissions');
    const losses = knownSum(records, 'incidents');
    const deliveredEntries = records.filter(record => statusText(record.cargoDelivered) === 'Так');
    const deliveredWeight = knownSum(deliveredEntries, 'weight');
    const summaryRows = [
      ['Записи журналу', records.length, `${records.length} записів у цьому періоді`],
      ['Загальна кількість виїздів', trips.value, trips.value === null ? 'Поле «Кількість виїздів» не заповнено' : `${trips.known} із ${trips.total} записів мають кількість виїздів`],
      ['Успішні місії', successful.value, successful.value === null ? 'Поле ще не заповнено в записах' : `${successful.known} із ${successful.total} записів мають значення`],
      ['Неуспішні місії', failed.value, failed.value === null ? 'Поле ще не заповнено в записах' : `${failed.known} із ${failed.total} записів мають значення`],
      ['Записи доставки з позначкою «Так»', deliveredEntries.length, `${deliveredEntries.length} із ${records.length} записів`],
      ['Маса вантажу в позначених доставленими записах, кг', deliveredWeight.value, deliveredWeight.value === null ? 'Немає заповненої маси серед позначених доставленими' : `${deliveredWeight.known} із ${deliveredWeight.total} позначених доставленими записів мають масу`],
      ['Втрачені борти', losses.value, losses.value === null ? 'Поле «Втрачено бортів» не заповнено' : `${losses.known} із ${losses.total} записів мають значення`],
    ];
    let row = addSummary(sheet, summaryRows, 5);
    row += 1;
    const details = sortByDate(records).map(record => [
      record.startTime || '', parseDate(record.date), text(record.task), text(record.aircraft), text(record.platformNumber),
      text(record.position), text(record.destination), numberOrNull(record.nrkTrips), numberOrNull(record.nrkSuccessfulMissions),
      numberOrNull(record.nrkFailedMissions), text(record.cargoType), numberOrNull(record.weight), statusText(record.cargoDelivered),
      statusText(record.returnedToBase), numberOrNull(record.incidents), text(record.executor), numberOrNull(record.ePoints), text(record.notes),
    ]);
    const notesRow = addDetails(sheet, detailHeaders, details, row);
    const missing = [];
    if (successful.known < successful.total || failed.known < failed.total) missing.push('У старих записах кількість успішних і неуспішних місій не збережена. Заповніть нові поля під час додавання або редагування запису, якщо дані відомі.');
    if (uncategorized) missing.push(`${uncategorized} записів без визначеної платформи не включено до аркушів НРК і VAMPIRE.`);
    addUnavailable(sheet, missing, notesRow, detailHeaders.length);
    [12, 13, 18, 20, 20, 22, 22, 14, 15, 17, 18, 15, 14, 18, 17, 22, 12, 36].forEach((width, index) => { sheet.getColumn(index + 1).width = width; });
    return sheet;
  }

  function buildVampireSheet(workbook, records, period, uncategorized) {
    const sheet = workbook.addWorksheet('VAMPIRE');
    const detailHeaders = ['Час', 'Дата', 'Тип завдання', 'Тип / модель', 'Номер борта', 'Позиція / відправлення', 'Пункт доставки', 'Вильотів', 'Бортів у записі', 'Тип вантажу', 'Доставлено посилок', 'Маса вантажу, кг', 'Доставлено', 'Тип БК', 'Підвішено бомб, шт.', 'Витрачено БК, шт.', 'Не розірвалося, шт.', 'Вага БК, кг', 'Уражено цілей', 'Позначки результату', 'Втрачено бортів', 'Виконавець', 'Примітки'];
    prepareSheet(sheet, 'VAMPIRE', period, detailHeaders.length);
    const deliveries = records.filter(record => text(record.task).toLocaleLowerCase('uk-UA') === 'доставка');
    const deliveredEntries = deliveries.filter(record => statusText(record.cargoDelivered) === 'Так');
    const deliveredWeight = knownSum(deliveredEntries, 'weight');
    const packages = knownSum(deliveries, 'packagesDelivered');
    const bombing = records.filter(record => text(record.task).toLocaleLowerCase('uk-UA') === 'бомбардування');
    const bombCount = knownSum(bombing, 'bombCount');
    const bombWeight = knownSum(bombing, 'bombWeight');
    const flights = knownSum(records, 'vampireFlights');
    const bombsUsed = knownSum(bombing, 'bombsUsed');
    const bombsFailed = knownSum(bombing, 'bombsFailed');
    const targets = knownSum(bombing, 'targetsHit');
    const losses = knownSum(records, 'incidents');
    const resultRows = IMPACT_LABELS.map(label => [label, bombing.filter(record => Array.isArray(record.impactResults) && record.impactResults.includes(label)).length, 'Кількість записів із цією позначкою; це не кількість цілей']);
    const summaryRows = [
      ['Записи журналу', records.length, `${records.length} записів у цьому періоді`],
      ['Кількість вильотів', flights.value, flights.value === null ? 'Поле ще не заповнено в записах' : `${flights.known} із ${flights.total} записів мають значення`],
      ['Записи доставки з позначкою «Так»', deliveredEntries.length, `${deliveredEntries.length} із ${deliveries.length} записів доставки`],
      ['Доставлено посилок', packages.value, packages.value === null ? 'Поле ще не заповнено в записах доставки' : `${packages.known} із ${packages.total} записів доставки мають значення`],
      ['Маса вантажу в позначених доставленими записах, кг', deliveredWeight.value, deliveredWeight.value === null ? 'Немає заповненої маси серед позначених доставленими' : `${deliveredWeight.known} із ${deliveredWeight.total} позначених доставленими записів мають масу`],
      ['Підвішено бомб, шт. (сума записаних значень)', bombCount.value, bombCount.value === null ? 'Поле «Кількість підвішених бомб» не заповнено' : `${bombCount.known} із ${bombCount.total} записів бомбардування мають значення`],
      ['Витрачено БК, шт.', bombsUsed.value, bombsUsed.value === null ? 'Поле ще не заповнено в записах бомбардування' : `${bombsUsed.known} із ${bombsUsed.total} записів бомбардування мають значення`],
      ['З них не розірвалося, шт.', bombsFailed.value, bombsFailed.value === null ? 'Поле ще не заповнено в записах бомбардування' : `${bombsFailed.known} із ${bombsFailed.total} записів бомбардування мають значення`],
      ['Записана вага БК, кг (сума)', bombWeight.value, bombWeight.value === null ? 'Поле «Вага БК» не заповнено' : `${bombWeight.known} із ${bombWeight.total} записів бомбардування мають значення; не є підтвердженою витратою`],
      ['Уражено цілей', targets.value, targets.value === null ? 'Поле ще не заповнено в записах бомбардування' : `${targets.known} із ${targets.total} записів бомбардування мають значення`],
      ['Втрачені борти', losses.value, losses.value === null ? 'Поле «Втрачено бортів» не заповнено' : `${losses.known} із ${losses.total} записів мають значення`],
      ...resultRows,
    ];
    let row = addSummary(sheet, summaryRows, 5);
    row += 1;
    const details = sortByDate(records).map(record => [
      record.startTime || '', parseDate(record.date), text(record.task), text(record.aircraft), text(record.platformNumber),
      text(record.position), text(record.destination), numberOrNull(record.vampireFlights), numberOrNull(record.aircraftCount),
      text(record.cargoType), numberOrNull(record.packagesDelivered), numberOrNull(record.weight), statusText(record.cargoDelivered),
      text(record.bombType), numberOrNull(record.bombCount), numberOrNull(record.bombsUsed), numberOrNull(record.bombsFailed),
      numberOrNull(record.bombWeight), numberOrNull(record.targetsHit), Array.isArray(record.impactResults) ? record.impactResults.join(', ') : '',
      numberOrNull(record.incidents), text(record.executor), text(record.notes),
    ]);
    const notesRow = addDetails(sheet, detailHeaders, details, row);
    const missing = [];
    if (flights.known < flights.total) missing.push('У старих записах кількість вильотів не збережена. Заповніть нове поле під час редагування, якщо дані відомі.');
    if (packages.known < packages.total) missing.push('У старих записах кількість посилок не збережена. Заповніть нове поле в записах доставки, якщо дані відомі.');
    if (bombsUsed.known < bombsUsed.total || bombsFailed.known < bombsFailed.total) missing.push('У старих записах фактична витрата БК та кількість боєприпасів, що не розірвалися, не збережені. Заповніть нові поля в записах бомбардування, якщо дані відомі.');
    if (targets.known < targets.total) missing.push('У старих записах кількість уражених цілей не збережена. Заповніть нове поле в записах бомбардування, якщо дані відомі.');
    if (uncategorized) missing.push(`${uncategorized} записів без визначеної платформи не включено до аркушів НРК і VAMPIRE.`);
    addUnavailable(sheet, missing, notesRow, detailHeaders.length);
    [12, 13, 18, 20, 17, 18, 20, 14, 16, 18, 18, 15, 14, 18, 17, 17, 17, 15, 16, 28, 15, 22, 36].forEach((width, index) => { sheet.getColumn(index + 1).width = width; });
    return sheet;
  }

  function createWorkbook(ExcelJS, flights) {
    const records = Array.isArray(flights) ? flights : [];
    const platformRecords = { 'НРК': [], VAMPIRE: [] };
    let uncategorized = 0;
    records.forEach(record => {
      const platform = classify(record);
      if (platform) platformRecords[platform].push(record);
      else uncategorized += 1;
    });
    const dates = records.map(record => parseDate(record.date)).filter(Boolean).sort((a, b) => a - b);
    const period = dates.length ? `${dateLabel(dates[0])} — ${dateLabel(dates[dates.length - 1])}` : 'не визначено: у журналі немає дат';
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Журнал польотів';
    workbook.subject = `Звітний період ${period}`;
    workbook.created = new Date();
    buildNrkSheet(workbook, platformRecords['НРК'], period, uncategorized);
    buildVampireSheet(workbook, platformRecords.VAMPIRE, period, uncategorized);
    return workbook;
  }

  function loadExcelJS() {
    if (global.ExcelJS) return Promise.resolve(global.ExcelJS);
    if (global.__flightExcelJsPromise) return global.__flightExcelJsPromise;
    global.__flightExcelJsPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = EXCELJS_URL;
      script.async = true;
      script.onload = () => global.ExcelJS ? resolve(global.ExcelJS) : reject(new Error('Бібліотека Excel не завантажилась.'));
      script.onerror = () => reject(new Error('Не вдалося завантажити компонент експорту Excel. Перевірте підключення до інтернету та повторіть спробу.'));
      document.head.appendChild(script);
    });
    return global.__flightExcelJsPromise;
  }

  global.exportFlightReport = async function (flights) {
    const ExcelJS = await loadExcelJS();
    const workbook = createWorkbook(ExcelJS, flights);
    const buffer = await workbook.xlsx.writeBuffer();
    const dates = (Array.isArray(flights) ? flights : []).map(record => parseDate(record.date)).filter(Boolean).sort((a, b) => a - b);
    const fileDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const start = dates.length ? fileDate(dates[0]) : 'no-dates';
    const end = dates.length ? fileDate(dates[dates.length - 1]) : 'no-dates';
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zvit-reisiv_${start}_${end}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
})(window);
