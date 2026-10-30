const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function setup() {
  const tables = new Map(); let nextId = 1, readCount = 0;
  const document = {
    createElement() {
      const field = { value: '' };
      return { id: '', style: {}, innerHTML: '', querySelector: () => field, _field: field,
        remove() { const m = /^#(.+)$/.exec(this._selector || ''); if (m) {} } };
    },
    body: { appendChild(form) { form._selector = '#' + form.id; forms.set(form.id, form); }, },
  };
  const forms = new Map();
  const KioStore = {
    async listRows(table) { readCount++; return (tables.get(table) || []).map(x => ({ ...x })); },
    invalidateTable() {},
  };
  let lockChain = Promise.resolve();
  const window = { Store: { mode: 'kio' }, navigator: { locks: { request: async (_name, work) => { const current = lockChain.catch(() => {}).then(work); lockChain = current.catch(() => {}); return current; } } }, KioStore };
  const ctx = {
    window, document, KioStore,
    sendFormDataKRUD: async (action, table, id, selector) => {
      const form = forms.get(selector.slice(1));
      const rows = tables.get(table) || [];
      const newId = nextId++;
      rows.push({ id: newId, payload: form._field.value }); tables.set(table, rows);
      return { success: true, id: newId };
    },
    krud: async (action, table, data, id) => {
      tables.set(table, (tables.get(table) || []).filter(x => String(x.id) !== String(id)));
      return { success: true };
    },
    Date, Map, Set, Promise, JSON, Error, String, Number, Object, Array, Math, RegExp,
    setTimeout,
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/common/hx-store.js'), 'utf8'), ctx);
  return { HX: window.HX, tables, reads: () => readCount };
}

test('HX KIO writes short payload chunks, reads, updates atomically and removes a record', async () => {
  const { HX, tables } = setup();
  const original = { id: 'company', name: 'Công ty thử nghiệm', address: 'Địa chỉ '.repeat(80), updated: '2026-10-29T01:00:00.000Z' };
  await HX.save('company', null, original);
  const physical = tables.get('hx_company');
  assert.ok(physical.length > 1, 'long record should be split into payload rows');
  assert.ok(physical.every(r => r.payload.length <= 255), 'payload rows should stay comfortably below VARCHAR(255)');
  assert.deepEqual(JSON.parse(JSON.stringify(await HX.load('company'))), [original]);

  const changed = { ...original, name: 'Tên mới', updated: '2026-10-29T02:00:00.000Z' };
  await HX.save('company', null, changed);
  assert.deepEqual(JSON.parse(JSON.stringify(await HX.load('company'))), [changed]);
  await HX.remove('company', null, 'company');
  assert.deepEqual(JSON.parse(JSON.stringify(await HX.load('company'))), []);
});

test('HX rejects stale optimistic update', async () => {
  const { HX } = setup();
  await HX.save('company', null, { id: 'company', name: 'A', updated: '2026-10-29T01:00:00.000Z' });
  await assert.rejects(
    HX.save('company', null, { id: 'company', name: 'B', updated: '2026-10-29T02:00:00.000Z' }, { expectedUpdated: 'old-version' }),
    /Xung đột dữ liệu/
  );
});

test('HX nextSeq allocates distinct values across 100 concurrent calls using Web Locks', async () => {
  const { HX } = setup();
  const values = await Promise.all(Array.from({ length: 100 }, () => HX.nextSeq('test-counter')));
  assert.equal(new Set(values).size, 100);
  assert.equal(Math.min(...values), 1);
  assert.equal(Math.max(...values), 100);
});

test('HX reuses KIO row index and avoids rescanning the whole table on consecutive saves', async () => {
  const { HX, reads } = setup();
  await HX.save('company', null, { id: 'company', name: 'Công ty A', updated: '2026-10-30T01:00:00.000Z' });
  const scansAfterCreate = reads();
  await HX.save('company', null, { id: 'company', name: 'Công ty B', updated: '2026-10-30T02:00:00.000Z' });
  assert.equal(reads(), scansAfterCreate, 'a consecutive update should reuse the cached physical-row index');
});
