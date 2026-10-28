// Seed do servidor backend do Document Management System.
//
// Este arquivo é apenas um ponto de partida mínimo. Ao longo do workshop você
// vai usar o Agent Mode do GitHub Copilot para construir as camadas:
//   - routes/       (definição das rotas)
//   - controllers/  (entrada HTTP e validação)
//   - services/     (regras de negócio)
//   - repositories/ (persistência: arquivos locais + metadados em memória)
//
// Restrição do projeto: uploads são gravados no filesystem local da aplicação
// usando multer com diskStorage. Não utilize provedores externos.

const express = require('express');
const documentRoutes = require('./routes/documentRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Endpoint de verificação de saúde. As demais rotas (/upload, /documents,
// /documents/:id/download) serão implementadas durante o Passo 2.
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/', documentRoutes);

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof require('multer').MulterError) {
    const isFileTooLarge = error.code === 'LIMIT_FILE_SIZE';
    const statusCode = isFileTooLarge ? 413 : 400;

    return res.status(statusCode).json({
      error: {
        code: isFileTooLarge ? 'FILE_TOO_LARGE' : 'INVALID_UPLOAD',
        message: isFileTooLarge
          ? 'O arquivo excede o limite permitido.'
          : 'A requisição de upload é inválida.',
      },
    });
  }

  const statusCode = error.statusCode || 500;
  const isInternalError = statusCode >= 500;
  return res.status(statusCode).json({
    error: {
      code: isInternalError ? 'INTERNAL_ERROR' : error.code || 'REQUEST_ERROR',
      message: isInternalError
        ? 'Ocorreu um erro interno.'
        : error.message || 'A requisição não pôde ser processada.',
    },
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`DMS backend ouvindo na porta ${PORT}`);
  });
}

module.exports = app;
