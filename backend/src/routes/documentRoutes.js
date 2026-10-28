const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const multer = require('multer');
const express = require('express');
const createDocumentController = require('../controllers/documentController');
const createDocumentRepository = require('../repositories/documentRepository');
const {
  createLocalFileRepository,
  getStorageDirectory,
} = require('../repositories/localFileRepository');
const createDocumentService = require('../services/documentService');

const storageDirectory = getStorageDirectory();
const maximumFileSize = Number.parseInt(process.env.MAX_FILE_SIZE, 10) ||
  10 * 1024 * 1024;
const storage = multer.diskStorage({
  destination(req, file, callback) {
    fs.mkdir(storageDirectory, { recursive: true }, (error) => {
      callback(error, storageDirectory);
    });
  },
  filename(req, file, callback) {
    callback(null, randomUUID());
  },
});
const upload = multer({
  storage,
  limits: {
    fileSize: maximumFileSize,
    fields: 0,
    parts: 2,
  },
});

const documentRepository = createDocumentRepository();
const localFileRepository = createLocalFileRepository(storageDirectory);
const documentService = createDocumentService(
  documentRepository,
  localFileRepository,
);
const documentController = createDocumentController(documentService);
const router = express.Router();

router.post(
  '/upload',
  documentController.validateOwner,
  upload.single('file'),
  documentController.upload,
);
router.get('/documents', documentController.validateOwner, documentController.list);
router.get(
  '/documents/:id/download',
  documentController.validateOwner,
  documentController.download,
);

module.exports = router;