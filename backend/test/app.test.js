const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const storageDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-test-'));
process.env.STORAGE_DIR = storageDirectory;
process.env.MAX_FILE_SIZE = '32';
const app = require('../src/app');

test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('upload, listagem e download respeitam o proprietário', async (t) => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    fs.rmSync(storageDirectory, { recursive: true, force: true });
  });

  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const missingOwnerResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: new FormData(),
  });
  assert.strictEqual(missingOwnerResponse.status, 400);

  const unexpectedFieldFormData = new FormData();
  unexpectedFieldFormData.append('description', 'campo não permitido');
  unexpectedFieldFormData.append(
    'file',
    new Blob(['conteudo']),
    'arquivo.txt',
  );
  const unexpectedFieldResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'user-1' },
    body: unexpectedFieldFormData,
  });
  assert.strictEqual(unexpectedFieldResponse.status, 400);

  const oversizedFormData = new FormData();
  oversizedFormData.append(
    'file',
    new Blob(['x'.repeat(33)]),
    'grande.txt',
  );
  const oversizedResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'user-1' },
    body: oversizedFormData,
  });
  assert.strictEqual(oversizedResponse.status, 413);

  const formData = new FormData();
  formData.append('file', new Blob(['conteudo de teste']), 'arquivo.txt');
  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'user-1' },
    body: formData,
  });
  assert.strictEqual(
    uploadResponse.status,
    201,
    await uploadResponse.clone().text(),
  );

  const uploadedDocument = await uploadResponse.json();
  assert.strictEqual(uploadedDocument.originalName, 'arquivo.txt');
  assert.strictEqual(uploadedDocument.owner, 'user-1');
  assert.strictEqual('storageName' in uploadedDocument, false);

  const listResponse = await fetch(`${baseUrl}/documents`, {
    headers: { 'X-User-Id': 'user-1' },
  });
  assert.deepStrictEqual(await listResponse.json(), [uploadedDocument]);

  const otherOwnerListResponse = await fetch(`${baseUrl}/documents`, {
    headers: { 'X-User-Id': 'user-2' },
  });
  assert.deepStrictEqual(await otherOwnerListResponse.json(), []);

  const forbiddenDownloadResponse = await fetch(
    `${baseUrl}/documents/${uploadedDocument.id}/download`,
    { headers: { 'X-User-Id': 'user-2' } },
  );
  assert.strictEqual(forbiddenDownloadResponse.status, 404);

  const downloadResponse = await fetch(
    `${baseUrl}/documents/${uploadedDocument.id}/download`,
    { headers: { 'X-User-Id': 'user-1' } },
  );
  assert.strictEqual(downloadResponse.status, 200);
  assert.strictEqual(await downloadResponse.text(), 'conteudo de teste');
});
