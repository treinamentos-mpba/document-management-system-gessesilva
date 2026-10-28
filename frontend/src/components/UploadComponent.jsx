import { useRef, useState } from 'react';
import { uploadDocument } from '../services/documentApi.js';

export default function UploadComponent({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file || isUploading) return;

    setIsUploading(true);
    setError('');

    try {
      const uploadedDocument = await uploadDocument(file);
      onUploaded(uploadedDocument);
      setFile(null);
      inputRef.current.value = '';
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="upload-section" aria-labelledby="upload-title">
      <div className="upload-copy">
        <p className="eyebrow">NOVO ARQUIVO</p>
        <h2 id="upload-title">Adicionar documento</h2>
        <p>Selecione um arquivo para armazená-lo localmente.</p>
      </div>

      <form className="upload-form" onSubmit={handleSubmit}>
        <label className="file-picker">
          <span className="file-picker-label">
            {file ? file.name : 'Escolher arquivo'}
          </span>
          <input
            ref={inputRef}
            type="file"
            onChange={(event) => {
              setFile(event.target.files?.[0] || null);
              setError('');
            }}
            aria-label="Selecionar documento para envio"
          />
        </label>
        <button className="button button-primary" type="submit" disabled={!file || isUploading}>
          {isUploading ? 'Enviando...' : 'Enviar documento'}
        </button>
        {error && <p className="form-error" role="alert">{error}</p>}
      </form>
    </section>
  );
}