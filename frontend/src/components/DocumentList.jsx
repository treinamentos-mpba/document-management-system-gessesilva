import DownloadButton from './DownloadButton.jsx';

function formatFileSize(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUploadDate(value) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function DocumentList({ documents, isLoading }) {
  if (isLoading && documents.length === 0) {
    return <p className="list-state" role="status">Carregando documentos...</p>;
  }

  if (documents.length === 0) {
    return <p className="list-state">Nenhum documento enviado ainda.</p>;
  }

  return (
    <div className="document-list" aria-busy={isLoading}>
      {documents.map((document) => (
        <article className="document-row" key={document.id}>
          <div className="document-icon" aria-hidden="true">DOC</div>
          <div className="document-details">
            <h3 title={document.originalName}>{document.originalName}</h3>
            <p>
              {formatFileSize(document.size)}
              <span className="detail-separator" aria-hidden="true">/</span>
              {formatUploadDate(document.uploadedAt)}
            </p>
          </div>
          <DownloadButton
            documentId={document.id}
            originalName={document.originalName}
          />
        </article>
      ))}
    </div>
  );
}