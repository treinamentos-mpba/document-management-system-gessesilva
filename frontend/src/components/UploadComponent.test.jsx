import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UploadComponent from './UploadComponent.jsx';

const { uploadDocument } = vi.hoisted(() => ({
  uploadDocument: vi.fn(),
}));

vi.mock('../services/documentApi.js', () => ({ uploadDocument }));

describe('UploadComponent', () => {
  beforeEach(() => {
    uploadDocument.mockReset();
  });

  it('mantém o envio desabilitado até selecionar um arquivo', () => {
    render(<UploadComponent onUploaded={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Enviar documento' })).toBeDisabled();
  });

  it('envia o arquivo, comunica sucesso e limpa a seleção', async () => {
    const user = userEvent.setup();
    const onUploaded = vi.fn();
    const uploadedDocument = { id: 'doc-1', originalName: 'relatorio.pdf' };
    uploadDocument.mockResolvedValue(uploadedDocument);
    render(<UploadComponent onUploaded={onUploaded} />);

    const file = new File(['conteudo'], 'relatorio.pdf', {
      type: 'application/pdf',
    });
    const input = screen.getByLabelText('Selecionar documento para envio');
    await user.upload(input, file);
    await user.click(screen.getByRole('button', { name: 'Enviar documento' }));

    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith(uploadedDocument));
    expect(uploadDocument).toHaveBeenCalledWith(file);
    expect(input.files).toHaveLength(0);
  });

  it('mostra erro da API quando o envio falha', async () => {
    const user = userEvent.setup();
    uploadDocument.mockRejectedValue(new Error('Falha ao enviar.'));
    render(<UploadComponent onUploaded={vi.fn()} />);

    await user.upload(
      screen.getByLabelText('Selecionar documento para envio'),
      new File(['conteudo'], 'arquivo.txt', { type: 'text/plain' }),
    );
    await user.click(screen.getByRole('button', { name: 'Enviar documento' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao enviar.');
  });

  it('desabilita o botão durante o envio', async () => {
    const user = userEvent.setup();
    const onUploaded = vi.fn();
    let resolveUpload;
    uploadDocument.mockReturnValue(
      new Promise((resolve) => {
        resolveUpload = resolve;
      }),
    );
    render(<UploadComponent onUploaded={onUploaded} />);

    await user.upload(
      screen.getByLabelText('Selecionar documento para envio'),
      new File(['conteudo'], 'arquivo.txt', { type: 'text/plain' }),
    );
    await user.click(screen.getByRole('button', { name: 'Enviar documento' }));

    expect(screen.getByRole('button', { name: 'Enviando...' })).toBeDisabled();
    resolveUpload({ id: 'doc-2', originalName: 'arquivo.txt' });
    await waitFor(() => expect(onUploaded).toHaveBeenCalledOnce());
  });
});