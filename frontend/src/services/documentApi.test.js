import { beforeEach, describe, expect, it, vi } from 'vitest';

const OWNER_STORAGE_KEY = 'dms-owner-id';

function createJsonResponse(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
  };
}

describe('documentApi', () => {
  beforeEach(() => {
    vi.resetModules();
    window.localStorage.clear();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('lista documentos pelo prefixo /api e envia o ID persistido', async () => {
    const documents = [{ id: 'doc-1', originalName: 'arquivo.pdf' }];
    window.localStorage.setItem(OWNER_STORAGE_KEY, 'browser-user-1');
    fetch.mockResolvedValue(createJsonResponse(documents));
    const { listDocuments } = await import('./documentApi.js');

    await expect(listDocuments()).resolves.toEqual(documents);

    expect(fetch).toHaveBeenCalledWith('/api/documents', {
      headers: { 'X-User-Id': 'browser-user-1' },
    });
  });

  it('envia o arquivo em FormData sem definir manualmente Content-Type', async () => {
    const file = new File(['conteudo'], 'arquivo.pdf', {
      type: 'application/pdf',
    });
    window.localStorage.setItem(OWNER_STORAGE_KEY, 'browser-user-2');
    fetch.mockResolvedValue(createJsonResponse({ id: 'doc-2' }));
    const { uploadDocument } = await import('./documentApi.js');

    await uploadDocument(file);

    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('/api/upload');
    expect(options.method).toBe('POST');
    expect(options.headers).toEqual({ 'X-User-Id': 'browser-user-2' });
    expect(options.body).toBeInstanceOf(FormData);
    expect(options.body.get('file')).toBe(file);
  });

  it('usa a mensagem retornada pela API em respostas de erro', async () => {
    fetch.mockResolvedValue(
      createJsonResponse(
        { error: { message: 'Arquivo acima do limite.' } },
        { ok: false, status: 413 },
      ),
    );
    const { listDocuments } = await import('./documentApi.js');

    await expect(listDocuments()).rejects.toThrow('Arquivo acima do limite.');
  });

  it('usa mensagem genérica quando a resposta de erro não contém JSON', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockRejectedValue(new SyntaxError('JSON inválido.')),
    });
    const { listDocuments } = await import('./documentApi.js');

    await expect(listDocuments()).rejects.toThrow(
      'A solicitação falhou (500).',
    );
  });

  it('mantém um ID temporário se localStorage não estiver disponível', async () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('Storage indisponível.');
    });
    fetch.mockResolvedValue(createJsonResponse([]));
    const { listDocuments } = await import('./documentApi.js');

    await listDocuments();
    await listDocuments();

    const firstOwnerId = fetch.mock.calls[0][1].headers['X-User-Id'];
    const secondOwnerId = fetch.mock.calls[1][1].headers['X-User-Id'];
    expect(firstOwnerId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(secondOwnerId).toBe(firstOwnerId);
  });

  it('usa getRandomValues quando randomUUID não existe', async () => {
    const getRandomValues = vi.fn((bytes) => {
      bytes.fill(0);
      return bytes;
    });
    vi.stubGlobal('crypto', { getRandomValues });
    fetch.mockResolvedValue(createJsonResponse([]));
    const { listDocuments } = await import('./documentApi.js');

    await listDocuments();

    expect(getRandomValues).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0][1].headers['X-User-Id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('faz download via Blob e revoga a URL temporária', async () => {
    const NativeURL = globalThis.URL;
    const createObjectURL = vi.fn(() => 'blob:documento');
    const revokeObjectURL = vi.fn();
    class URLStub extends NativeURL {}
    URLStub.createObjectURL = createObjectURL;
    URLStub.revokeObjectURL = revokeObjectURL;
    vi.stubGlobal('URL', URLStub);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(new Blob(['conteudo'])),
    }));
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function clickAnchor() {
        expect(this.download).toBe('relatorio_.pdf');
      });
    vi.useFakeTimers();
    const { downloadDocument } = await import('./documentApi.js');

    await downloadDocument('doc/1', 'relatorio?.pdf');

    expect(fetch).toHaveBeenCalledWith(
      '/api/documents/doc%2F1/download',
      { headers: { 'X-User-Id': expect.any(String) } },
    );
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1000);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:documento');
  });

  it('transmite o download pelo file picker quando disponível', async () => {
    const pipeTo = vi.fn().mockResolvedValue();
    const writable = {};
    const createWritable = vi.fn().mockResolvedValue(writable);
    const showSaveFilePicker = vi.fn().mockResolvedValue({ createWritable });
    vi.stubGlobal('isSecureContext', true);
    vi.stubGlobal('showSaveFilePicker', showSaveFilePicker);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      body: { pipeTo },
    }));
    const { downloadDocument } = await import('./documentApi.js');

    await downloadDocument('doc-3', 'contrato.pdf');

    expect(showSaveFilePicker).toHaveBeenCalledWith({
      suggestedName: 'contrato.pdf',
    });
    expect(createWritable).toHaveBeenCalledOnce();
    expect(pipeTo).toHaveBeenCalledWith(writable);
  });
});