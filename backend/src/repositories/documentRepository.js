function createDocumentRepository() {
  const documents = new Map();

  return {
    async save(document) {
      documents.set(document.id, { ...document });
    },

    async findById(id) {
      const document = documents.get(id);
      return document ? { ...document } : null;
    },

    async findByOwner(owner) {
      return Array.from(documents.values())
        .filter((document) => document.owner === owner)
        .map((document) => ({ ...document }));
    },
  };
}

module.exports = createDocumentRepository;