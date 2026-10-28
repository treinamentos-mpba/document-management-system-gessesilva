import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DownloadButton from './DownloadButton.jsx';

const { downloadDocument } = vi.hoisted(() => ({
  downloadDocument: vi.fn(),
}));

vi.mock('../services/documentApi.js', () => ({ downloadDocument }));

describe('DownloadButton', () => {
  beforeEach(() => {
    downloadDocument.mockReset();
  });

  it('solicita o download com o identificador e nome do documento', async () => {
    const user = userEvent.setup();
    downloadDocument.mockResolvedValue();
    render(
      <DownloadButton documentId="doc-1" originalName="relatorio.pdf" />,
    );

    await user.click(screen.getByRole('button', { name: 'Baixar' }));

    expect(downloadDocument).toHaveBeenCalledWith('doc-1', 'relatorio.pdf');
  });

  it('mostra erro de download e ignora cancelamento do seletor', async () => {
    const user = userEvent.setup();
    downloadDocument.mockRejectedValueOnce(new Error('Download indisponível.'));
    render(
      <DownloadButton documentId="doc-1" originalName="relatorio.pdf" />,
    );

    await user.click(screen.getByRole('button', { name: 'Baixar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Download indisponível.',
    );

    const cancellation = new Error('Cancelado');
    cancellation.name = 'AbortError';
    downloadDocument.mockRejectedValueOnce(cancellation);
    await user.click(screen.getByRole('button', { name: 'Baixar' }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('desabilita o botão enquanto o download está pendente', async () => {
    const user = userEvent.setup();
    let resolveDownload;
    const downloadPending = new Promise((resolve) => {
      resolveDownload = resolve;
    });
    downloadDocument.mockReturnValue(downloadPending);
    render(
      <DownloadButton documentId="doc-1" originalName="relatorio.pdf" />,
    );

    await user.click(screen.getByRole('button', { name: 'Baixar' }));
    expect(screen.getByRole('button', { name: 'Baixando...' })).toBeDisabled();
    resolveDownload();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Baixar' })).toBeEnabled(),
    );
  });
});