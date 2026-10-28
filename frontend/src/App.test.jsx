import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';

const api = vi.hoisted(() => ({
  listDocuments: vi.fn(),
  uploadDocument: vi.fn(),
  downloadDocument: vi.fn(),
}));

vi.mock('./services/documentApi.js', () => api);

describe('App', () => {
  beforeEach(() => {
    api.listDocuments.mockReset().mockResolvedValue([]);
    api.uploadDocument.mockReset();
    api.downloadDocument.mockReset();
  });

  it('carrega e apresenta os documentos ao montar', async () => {
    api.listDocuments.mockResolvedValue([
      {
        id: 'doc-1',
        originalName: 'relatorio.pdf',
        size: 1024,
        uploadedAt: '2026-01-15T12:00:00.000Z',
      },
    ]);

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'relatorio.pdf' })).toBeVisible();
    expect(api.listDocuments).toHaveBeenCalledOnce();
  });

  it('exibe erro de carregamento e permite tentar novamente', async () => {
    const user = userEvent.setup();
    api.listDocuments
      .mockRejectedValueOnce(new Error('API indisponível.'))
      .mockResolvedValueOnce([]);
    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'API indisponível.',
    );
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(
      await screen.findByText('Nenhum documento enviado ainda.'),
    ).toBeVisible();
    expect(api.listDocuments).toHaveBeenCalledTimes(2);
  });

  it('atualiza a lista após enviar um documento', async () => {
    const user = userEvent.setup();
    const uploadedDocument = {
      id: 'doc-2',
      originalName: 'contrato.pdf',
      size: 512,
      uploadedAt: '2026-01-16T12:00:00.000Z',
    };
    api.listDocuments
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([uploadedDocument]);
    api.uploadDocument.mockResolvedValue(uploadedDocument);
    render(<App />);

    await screen.findByText('Nenhum documento enviado ainda.');
    await user.upload(
      screen.getByLabelText('Selecionar documento para envio'),
      new File(['contrato'], 'contrato.pdf', { type: 'application/pdf' }),
    );
    await user.click(screen.getByRole('button', { name: 'Enviar documento' }));

    expect(
      await screen.findByRole('heading', { name: 'contrato.pdf' }),
    ).toBeVisible();
    await waitFor(() => expect(api.listDocuments).toHaveBeenCalledTimes(2));
  });
});