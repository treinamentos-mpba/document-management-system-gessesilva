import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DocumentList from './DocumentList.jsx';

describe('DocumentList', () => {
  it('mostra o estado de carregamento sem documentos', () => {
    render(<DocumentList documents={[]} isLoading />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Carregando documentos...',
    );
  });

  it('mostra o estado vazio depois do carregamento', () => {
    render(<DocumentList documents={[]} isLoading={false} />);

    expect(screen.getByText('Nenhum documento enviado ainda.')).toBeVisible();
  });

  it('renderiza metadados e marca a lista ocupada durante a atualização', () => {
    const uploadedAt = '2026-01-15T12:00:00.000Z';
    const formattedDate = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(uploadedAt));

    render(
      <DocumentList
        documents={[
          {
            id: 'doc-1',
            originalName: 'relatorio.pdf',
            size: 2048,
            uploadedAt,
          },
        ]}
        isLoading
      />,
    );

    expect(screen.getByRole('heading', { name: 'relatorio.pdf' })).toBeVisible();
    expect(screen.getByText(/2\.0 KB/)).toBeVisible();
    expect(
      screen.getByText((_, element) =>
        element?.tagName === 'P' && element.textContent.includes(formattedDate),
      ),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Baixar' })).toBeVisible();
    expect(document.querySelector('.document-list')).toHaveAttribute(
      'aria-busy',
      'true',
    );
  });
});