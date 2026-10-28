const { randomUUID } = require('node:crypto');

function createDocumentService(documentRepository, localFileRepository) {
  return {
    async createDocument(owner, file) {
      const document = {
        id: randomUUID(),
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        uploadedAt: new Date().toISOString(),
        owner,
        storageName: file.filename,
      };

      try {
        await documentRepository.save(document);
      } catch (error) {
        await localFileRepository.removeFile(file.filename).catch(() => {});
        throw error;
      }

      return document;
    },

    async listDocuments(owner) {
      const documents = await documentRepository.findByOwner(owner);
      return documents.sort((first, second) =>
        second.uploadedAt.localeCompare(first.uploadedAt),
      );
    },

    async getDocumentForDownload(id, owner) {
      const document = await documentRepository.findById(id);

      if (!document || document.owner !== owner) {
        throw Object.assign(new Error('Documento não encontrado.'), {
          code: 'DOCUMENT_NOT_FOUND',
          statusCode: 404,
        });
      }

      const filePath = await localFileRepository.getExistingFilePath(
        document.storageName,
      );

      if (!filePath) {
        throw Object.assign(new Error('Documento não encontrado.'), {
          code: 'DOCUMENT_NOT_FOUND',
          statusCode: 404,
        });
      }

      return { document, filePath };
    },
  };
}

module.exports = createDocumentService;