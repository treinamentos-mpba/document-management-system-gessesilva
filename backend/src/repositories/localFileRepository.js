const fs = require('node:fs/promises');
const path = require('node:path');

function getStorageDirectory() {
  const configuredDirectory = process.env.STORAGE_DIR;
  return path.resolve(
    configuredDirectory || path.join(__dirname, '../../storage'),
  );
}

function createLocalFileRepository(storageDirectory = getStorageDirectory()) {
  function getSafeFilePath(storageName) {
    if (!/^[a-f0-9-]{36}$/i.test(storageName)) {
      throw new Error('Nome interno de arquivo inválido.');
    }

    return path.join(storageDirectory, storageName);
  }

  return {
    async getExistingFilePath(storageName) {
      const filePath = getSafeFilePath(storageName);

      try {
        const stats = await fs.stat(filePath);
        return stats.isFile() ? filePath : null;
      } catch (error) {
        if (error.code === 'ENOENT') {
          return null;
        }

        throw error;
      }
    },

    async removeFile(storageName) {
      try {
        await fs.unlink(getSafeFilePath(storageName));
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
    },
  };
}

module.exports = {
  createLocalFileRepository,
  getStorageDirectory,
};