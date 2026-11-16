/**
 * GET /api/files/view/<private key> streams the document same-origin.
 *
 * With S3 enabled it used to 302 to a presigned bucket URL. The admin panel
 * reads certificates with XMLHttpRequest (it must send the bearer token), so
 * the redirect went cross-origin and the browser blocked it: "SEBI Doc"
 * opened nothing. These run on local storage (helpers clears the AWS env);
 * the S3 branch uses the same streamObject headers.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { app, USERS, bearer, stubUserLookup } = require('./helpers');
const storage = require('../src/services/StorageService');

const owner = USERS.user.id;
const dir = `private/${owner}/sebi-certificates`;
const PDF_KEY = `${dir}/0b6f2c1e-1111-4111-8111-111111111111-test-cert.pdf`;
const DOCX_KEY = `${dir}/0b6f2c1e-1111-4111-8111-111111111111-test-cert.docx`;
const written = [];

before(() => {
  stubUserLookup({ '44444444-4444-4444-8444-444444444444': { id: '44444444-4444-4444-8444-444444444444', app_role: 'user', role: 'user', status: 'active' } });
  for (const [key, body] of [[PDF_KEY, '%PDF-1.7 test'], [DOCX_KEY, 'PK docx']]) {
    const file = storage.localPathForKey(key);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, body);
    written.push(file);
  }
});

after(() => {
  for (const f of written) fs.rmSync(f, { force: true });
});

test('an admin reads a private PDF inline, same-origin, not cached, not sniffed', async () => {
  const res = await request(app).get(`/api/files/view/${PDF_KEY}`).set('Authorization', bearer(USERS.admin));
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /^application\/pdf/);
  assert.match(res.headers['content-disposition'], /^inline; filename="/);
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
  assert.match(res.headers['cache-control'], /no-store/);
  assert.equal(res.headers.location, undefined);
});

test('the owner can read it too', async () => {
  const res = await request(app).get(`/api/files/view/${PDF_KEY}`).set('Authorization', bearer(USERS.user));
  assert.equal(res.status, 200);
});

test('types that could render as a page are served as downloads', async () => {
  const res = await request(app).get(`/api/files/view/${DOCX_KEY}`).set('Authorization', bearer(USERS.admin));
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /^application\/octet-stream/);
  assert.match(res.headers['content-disposition'], /^attachment;/);
});

test('another member and an anonymous caller get 404', async () => {
  const other = await request(app).get(`/api/files/view/${PDF_KEY}`).set('Authorization', bearer({ id: '44444444-4444-4444-8444-444444444444' }));
  assert.equal(other.status, 404);
  const anon = await request(app).get(`/api/files/view/${PDF_KEY}`);
  assert.equal(anon.status, 404);
});

test('inlineTypeForKey only allows PDF and raster images', () => {
  assert.equal(storage.inlineTypeForKey('a/b.pdf'), 'application/pdf');
  assert.equal(storage.inlineTypeForKey('a/b.JPG'), 'image/jpeg');
  for (const k of ['a/b.svg', 'a/b.html', 'a/b.docx', 'a/b', 'a/b.csv']) assert.equal(storage.inlineTypeForKey(k), null, k);
});

test('an aborted download destroys the source stream (no S3 socket left open)', async () => {
  const http = require('http');
  const { Readable } = require('stream');
  let source;
  const server = http.createServer((req, res) => {
    let n = 0;
    source = new Readable({ read() { setTimeout(() => this.push(n++ < 1000 ? Buffer.alloc(64 * 1024, 1) : null), 5); } });
    storage.sendBody(source, res).catch(() => {});
  });
  await new Promise((r) => server.listen(0, r));
  await new Promise((resolve) => {
    const req = http.get({ port: server.address().port }, (res) => {
      res.once('data', () => { req.destroy(); resolve(); });
    });
    req.on('error', () => {});
  });
  for (let i = 0; i < 50 && !source.destroyed; i++) await new Promise((r) => setTimeout(r, 20));
  server.close();
  assert.equal(source.destroyed, true);
});

test('a failed read before any bytes still answers JSON, not a typed document', async () => {
  const missing = `${dir}/0b6f2c1e-1111-4111-8111-111111111111-gone.pdf`;
  const res = { headers: {}, set(k, v) { this.headers[k] = v; } };
  await assert.rejects(storage.streamObject(missing, res));
  assert.deepEqual(res.headers, {});
});
