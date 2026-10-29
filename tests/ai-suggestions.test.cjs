const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const sdkPath = require.resolve('../server/node_modules/openai');
let calls = [];
let response = { suggestion: 'Compare two fractions using paper strips.' };
let providerFailure;
let waitForAbort = false;
require.cache[sdkPath] = { id: sdkPath, filename: sdkPath, loaded: true, exports: class {
  constructor() { this.chat = { completions: { create: async (request, options) => {
    calls.push({ request, options });
    if (providerFailure) throw providerFailure;
    if (waitForAbort) return new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted'))));
    return { choices: [{ message: { content: JSON.stringify(response) } }] };
  } } }; }
} };
process.env.NVIDIA_API_KEY = 'test-only';
const service = require('../server/src/services/aiService');
const payload = { planType: 'Semi-Detailed', gradeLevel: 'Grade 4', subject: 'Mathematics', topic: 'Fractions', learningCompetencies: 'Compare fractions', objectives: ['Compare fractions'], activityTitles: ['Paper strips'] };

test('section requests ask for only one field, bound output and disable retries', async () => {
  calls = [];
  const signal = new AbortController().signal;
  assert.deepEqual(await service.generateLessonDraft({ ...payload, section: 'assessment' }, { signal }), response);
  assert.match(calls[0].request.messages[0].content, /ONLY the assessment section/);
  assert.match(calls[0].request.messages[0].content, /Schema: {"suggestion":""}/);
  assert.equal(calls[0].request.max_tokens, 650);
  assert.equal(calls[0].options.signal, signal);
  assert.equal(calls[0].options.timeout, 40000);
  assert.equal(calls[0].options.maxRetries, 0);
});

test('rejects unsupported sections and mismatched plan types before provider call', async () => {
  const before = calls.length;
  for (const section of ['reflection', 'ilaw.flow', '__proto__', '']) {
    assert.equal(service.isValidSection(section, payload.planType), false);
  }
  assert.equal(service.isValidSection('procedure', 'ILAW'), false);
  assert.equal(service.isValidSection('ilaw.flow', 'ILAW'), true);
  await assert.rejects(service.generateLessonDraft({ ...payload, section: 'reflection' }), /Invalid/);
  assert.equal(calls.length, before);
});

test('rejects empty provider suggestions and preserves legacy full-draft requests', async () => {
  response = { suggestion: '   ' };
  await assert.rejects(service.generateLessonDraft({ ...payload, section: 'assessment' }), /invalid section/);
  response = { assessment: 'Legacy assessment', procedure: 'Legacy procedure' };
  assert.deepEqual(await service.generateLessonDraft(payload), response);
});

function loadApi(fetchImpl, timers = {}) {
  const source = ts.transpileModule(fs.readFileSync('lib/api.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(source, {
    module, exports: module.exports, process: { env: {} }, AbortController,
    setTimeout: timers.setTimeout || setTimeout, clearTimeout: timers.clearTimeout || clearTimeout,
    fetch: fetchImpl,
    require: (name) => {
      if (name === 'expo-constants') return { default: {} };
      if (name === 'react-native') return { Platform: { OS: 'web' } };
      return {};
    },
  });
  return module.exports;
}

test('client sends selected section and returns only its suggestion', async () => {
  const api = loadApi(async (_url, options) => {
    assert.equal(JSON.parse(options.body).section, 'assessment');
    return { ok: true, json: async () => ({ suggestion: 'Exit ticket' }) };
  });
  assert.equal(await api.generateSectionSuggestion({ ...payload, section: 'assessment' }, new AbortController().signal), 'Exit ticket');
});

test('client cancellation aborts fetch and clears the timeout', async () => {
  let cleared = false;
  const api = loadApi((_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('aborted')));
  }), { setTimeout: () => 1, clearTimeout: () => { cleared = true; } });
  const controller = new AbortController();
  const pending = api.generateSectionSuggestion({ ...payload, section: 'assessment' }, controller.signal);
  await new Promise(setImmediate);
  controller.abort();
  await assert.rejects(pending, /aborted/);
  assert.equal(cleared, true);
});

test('client stops at 45 seconds and exposes a readable timeout error', async () => {
  let expire;
  const api = loadApi((_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('aborted')));
  }), { setTimeout: (callback, delay) => { assert.equal(delay, 45000); expire = callback; return 1; }, clearTimeout: () => {} });
  const pending = api.generateSectionSuggestion({ ...payload, section: 'assessment' }, new AbortController().signal);
  await new Promise(setImmediate);
  expire();
  await assert.rejects(pending, (err) => err.status === 408 && /took too long/.test(err.message));
});

const { EventEmitter } = require('node:events');
const router = require('../server/src/routes/generate');
const handle = router.stack.find((layer) => layer.route?.path === '/').route.stack[0].handle;
function fakeResponse() {
  const res = new EventEmitter();
  res.statusCode = 200;
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (data) => { res.data = data; res.writableEnded = true; return res; };
  return res;
}
test('route rejects invalid sections without calling AI', async () => {
  const before = calls.length;
  const res = fakeResponse();
  await handle({ body: { ...payload, section: 'reflection' } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(calls.length, before);
});

test('route propagates disconnect cancellation and removes its close listener', async () => {
  waitForAbort = true;
  const res = fakeResponse();
  const pending = handle({ body: { ...payload, section: 'assessment' } }, res);
  const signal = calls.at(-1).options.signal;
  res.emit('close');
  await pending;
  assert.equal(signal.aborted, true);
  assert.equal(res.data, undefined);
  assert.equal(res.listenerCount('close'), 0);
  waitForAbort = false;
});

test('route reports provider timeout as 504 with a safe retry message', async () => {
  providerFailure = Object.assign(new Error('provider timeout'), { name: 'APIConnectionTimeoutError' });
  const res = fakeResponse();
  await handle({ body: { ...payload, section: 'assessment' } }, res);
  assert.equal(res.statusCode, 504);
  assert.match(res.data.error, /took too long/);
  providerFailure = undefined;
});
