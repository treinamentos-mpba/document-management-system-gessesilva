const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toPublicDocument(document) {
  const { storageName, ...publicDocument } = document;
  return publicDocument;
}

function getOwner(req) {
  return req.get('X-User-Id')?.trim();
}

function createDocumentController(documentService) {
  function validateOwner(req, res, next) {
    if (!getOwner(req)) {
      return res.status(400).json({
        error: {
          code: 'OWNER_REQUIRED',
          message: 'Informe o proprietário no cabeçalho X-User-Id.',
        },
      });
    }

    return next();
  }

  return {
    validateOwner,

    async upload(req, res, next) {
      if (!req.file) {
        return res.status(400).json({
          error: {
            code: 'FILE_REQUIRED',
            message: 'Envie um arquivo no campo "file".',
          },
        });
      }

      try {
        const document = await documentService.createDocument(
          getOwner(req),
          req.file,
        );
        return res.status(201).json(toPublicDocument(document));
      } catch (error) {
        return next(error);
      }
    },

    async list(req, res, next) {
      try {
        const documents = await documentService.listDocuments(getOwner(req));
        return res.json(documents.map(toPublicDocument));
      } catch (error) {
        return next(error);
      }
    },

    async download(req, res, next) {
      if (!UUID_PATTERN.test(req.params.id)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_DOCUMENT_ID',
            message: 'O identificador do documento é inválido.',
          },
        });
      }

      try {
        const { document, filePath } =
          await documentService.getDocumentForDownload(
            req.params.id,
            getOwner(req),
          );
        const downloadName = document.originalName
          .replace(/\\/g, '/')
          .split('/')
          .pop()
          .replace(/[\u0000-\u001f\u007f]/g, '_') || 'document';

        return res.download(filePath, downloadName, (error) => {
          if (!error) {
            return;
          }

          if (res.headersSent) {
            return res.destroy(error);
          }

          if (error.code === 'ENOENT') {
            return res.status(404).json({
              error: {
                code: 'DOCUMENT_NOT_FOUND',
                message: 'Documento não encontrado.',
              },
            });
          }

          return next(error);
        });
      } catch (error) {
        return next(error);
      }
    },
  };
}

module.exports = createDocumentController;