import { useEffect, useState } from 'react';
import DocumentList from './components/DocumentList.jsx';
import UploadComponent from './components/UploadComponent.jsx';
import { listDocuments } from './services/documentApi.js';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isCurrent = true;

    setIsLoading(true);
    setLoadError('');

    listDocuments()
      .then((result) => {
        if (isCurrent) {
          setDocuments(result);
        }
      })
      .catch((error) => {
        if (isCurrent) {
          setLoadError(error.message);
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [reloadKey]);

  function handleUploaded(document) {
    setDocuments((currentDocuments) => [
      document,
      ...currentDocuments.filter((item) => item.id !== document.id),
    ]);
    setReloadKey((currentKey) => currentKey + 1);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="DMS, início">
          <span className="wordmark-mark" aria-hidden="true">D</span>
          <span>DMS</span>
        </a>
        <span className="topbar-label">ESPAÇO PESSOAL</span>
      </header>

      <main className="workspace">
        <section className="page-heading" aria-labelledby="page-title">
          <p className="eyebrow">ARQUIVO DIGITAL</p>
          <h1 id="page-title">Seus documentos</h1>
          <p className="page-description">
            Envie um arquivo ou acesse os documentos já armazenados.
          </p>
        </section>

        <UploadComponent onUploaded={handleUploaded} />

        <section className="documents-section" aria-labelledby="documents-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">BIBLIOTECA</p>
              <h2 id="documents-title">Documentos enviados</h2>
            </div>
            <span className="document-count" aria-label={`${documents.length} documentos`}>
              {documents.length}
            </span>
          </div>

          {loadError && (
            <div className="notice notice-error" role="alert">
              <span>{loadError}</span>
              <button
                className="text-button"
                type="button"
                onClick={() => setReloadKey((currentKey) => currentKey + 1)}
              >
                Tentar novamente
              </button>
            </div>
          )}

          <DocumentList documents={documents} isLoading={isLoading} />
        </section>
      </main>

      <footer className="page-footer">
        <span>Document Management System</span>
        <span>Armazenamento local</span>
      </footer>
    </div>
  );
}
