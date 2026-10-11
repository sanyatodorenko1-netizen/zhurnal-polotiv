(() => {
  'use strict';

  const catalog = {
    'НРК': [
      {
        id: 'gulliver', name: 'Гулівер',
        description: 'Універсальна наземна колісна платформа з електроприводом.',
        facts: [
          ['Виробник', 'ТОВ «ВІКТОРІСОФТ»'],
          ['Шасі', 'Повний привід 4×4'],
          ['Вантажопідйомність', 'До 320 кг'],
          ['Маса платформи', 'Не більше 325 кг'],
          ['Розміри (Ш×В×Д)', '1250 × 1400 × 1350 мм'],
          ['Кліренс', '180 мм'],
          ['Акумулятор', 'Li-Ion, 48 В, ємність не менше 120 А·год'],
          ['Заряджання', '6 год — штатне; 4 год — швидке']
        ],
        note: 'Показники з відкритого опису виробника. Комплектація конкретного виробу може відрізнятися.',
        sources: [{label: 'VictorySoft · сторінка «Гулівер»', url: 'https://victorysoft.com.ua/gulliver/'}]
      },
      {
        id: 'targan-200', name: 'Тарган 200',
        description: 'Наземна колісна платформа з електричною силовою установкою.',
        facts: [
          ['Бренд', 'TarGun'],
          ['Конструкція', 'Колісна платформа'],
          ['Силова установка', 'Електрична'],
          ['Вантажопідйомність', '200 кг'],
          ['Габарити', '1440 × 1120 × 1170 мм'],
          ['Максимальна швидкість', '10 км/год — тверде покриття; 8 км/год — бездоріжжя'],
          ['Маса', 'Потребує уточнення'],
          ['Автономність', 'Потребує уточнення']
        ],
        note: 'На сторінці «ТАРГАН 200» також зазначено назву «Тарган 3К». Значення маси й автономності в різних частинах опису розходяться; для них потрібен паспорт конкретної модифікації.',
        sources: [{label: 'TarGun · сторінка «ТАРГАН 200»', url: 'https://www.targun.com.ua/targan3k'}]
      }
    ],
    'Вампір': [
      {
        id: 'vampire', name: 'Вампір · Vampire',
        description: 'Мультироторна повітряна платформа українського виробництва.',
        facts: [
          ['Виробник', 'SKYFALL'],
          ['Конструкція', 'Гексакоптер — 6 роторів'],
          ['Вантажопідйомність', 'До 15 кг'],
          ['Заявлена відстань польоту', 'До 20 км'],
          ['Камера', 'Біспектральна']
        ],
        note: 'Основні показники з публікації Міністерства оборони від 24.04.2025. Модифікація та комплектація конкретного борта можуть відрізнятися.',
        sources: [
          {label: 'Міністерство оборони України · Vampire', url: 'https://mod.gov.ua/news/vampire-dron-shho-zhahaye-vorogiv-ta-dopomagaye-ukrayinczyam'},
          {label: 'SKYFALL / Calian · виробник і продукт', url: 'https://www.calian.com/resources/news-media/calian-and-skyfall-sign-strategic-agreement-to-advance-drone-enabled-defence-training-and-operational-readiness/'}
        ]
      }
    ],
    'HEAVY SHOT': [
      {
        id: 'heavy-shot', name: 'HEAVY SHOT',
        description: 'Модульна повітряна платформа з електричною силовою установкою.',
        facts: [
          ['Виробник', 'Gurzuf Defence'],
          ['Силова установка', 'Електрична'],
          ['Корисне навантаження', 'До 30 кг, залежно від модифікації'],
          ['Максимальна злітна маса', 'Не більше 85 кг'],
          ['Політ без навантаження', 'До 40 хв'],
          ['Політ із навантаженням', 'До 30 хв'],
          ['Ширина / довжина', '1385 ± 15 мм'],
          ['Висота', '920 ± 10 мм']
        ],
        note: 'Показники зі сторінки HEAVY SHOT виробника. Параметри залежать від модифікації та умов вимірювання.',
        sources: [{label: 'Gurzuf Defence · HEAVY SHOT', url: 'https://www.gurzufdefence.com.ua/products/heavy-shot'}]
      }
    ]
  };

  const dialog = document.getElementById('equipmentSpecsDialog');
  if (!dialog) return;
  const title = document.getElementById('equipmentSpecsTitle');
  const pickerWrap = document.getElementById('equipmentSpecsPicker');
  const picker = document.getElementById('equipmentSpecsModel');
  const modelTitle = document.getElementById('equipmentSpecsModelTitle');
  const description = document.getElementById('equipmentSpecsDescription');
  const facts = document.getElementById('equipmentSpecsFacts');
  const note = document.getElementById('equipmentSpecsNote');
  const sources = document.getElementById('equipmentSpecsSources');
  const selectedModels = new Map();
  let activeKind = null;
  let openerSectionId = null;

  function renderModel() {
    const model = catalog[activeKind]?.find(item => item.id === picker.value);
    if (!model) return;
    selectedModels.set(activeKind, model.id);
    modelTitle.textContent = model.name;
    description.textContent = model.description;
    note.textContent = model.note;
    facts.replaceChildren();
    for (const [label, value] of model.facts) {
      const field = document.createElement('div');
      field.className = 'detail-field';
      const term = document.createElement('dt');
      term.textContent = label;
      const definition = document.createElement('dd');
      definition.textContent = value;
      field.append(term, definition);
      facts.append(field);
    }
    sources.replaceChildren();
    for (const source of model.sources) {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = source.url;
      link.textContent = source.label;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      item.append(link);
      sources.append(item);
    }
  }

  document.addEventListener('click', event => {
    const button = event.target.closest?.('[data-equipment-spec]');
    if (!button) return;
    const kind = button.dataset.equipmentSpec;
    if (!Object.prototype.hasOwnProperty.call(catalog, kind)) return;
    activeKind = kind;
    openerSectionId = button.closest('.stats')?.id || null;
    title.textContent = 'ТТХ · ' + kind;
    picker.replaceChildren();
    for (const model of catalog[kind]) {
      const option = document.createElement('option');
      option.value = model.id;
      option.textContent = model.name;
      picker.append(option);
    }
    picker.value = selectedModels.get(kind) || catalog[kind][0].id;
    pickerWrap.hidden = catalog[kind].length === 1;
    renderModel();
    if (!dialog.open) dialog.showModal();
  });

  picker.addEventListener('change', renderModel);
  document.getElementById('closeEquipmentSpecs').addEventListener('click', () => dialog.close());
  document.getElementById('equipmentSpecsDone').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    // The inventory refresh can replace the original opener while the dialog is open.
    const section = openerSectionId && document.getElementById(openerSectionId);
    section?.querySelector('[data-equipment-spec="' + activeKind + '"]')?.focus();
  });
})();
