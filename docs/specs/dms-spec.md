# Especificação - Document Management System

## 1. Objetivo

Permitir que usuários enviem, listem e baixem seus documentos, armazenando os arquivos no filesystem local e mantendo seus metadados em memória.

## 2. Escopo

### Dentro do escopo

- Upload de um documento por requisição.
- Listagem dos documentos associados a um usuário.
- Download de um documento pelo identificador, validando o proprietário.
- Armazenamento de arquivos em `backend/storage`, usando `multer` com `diskStorage`.
- Armazenamento volátil dos metadados em memória.

### Fora do escopo

- Autenticação, autorização robusta e cadastro de usuários.
- Armazenamento externo, banco de dados ou persistência dos metadados após reinício.
- Versionamento, exclusão, busca, paginação e compartilhamento de documentos.
- Upload de múltiplos arquivos em uma única requisição.

## 3. Requisitos funcionais

| ID | Requisito |
|---|---|
| RF-01 | O sistema deve aceitar um arquivo no campo `file` de uma requisição `multipart/form-data`. |
| RF-02 | O upload deve exigir o identificador do proprietário no cabeçalho `X-User-Id`. |
| RF-03 | O sistema deve gerar um identificador único para cada documento e registrar nome original, tamanho, tipo MIME, data/hora e proprietário. |
| RF-04 | O sistema deve gravar o conteúdo do arquivo localmente, com nome interno gerado pelo sistema, sem usar o nome enviado pelo usuário como caminho de armazenamento. |
| RF-05 | O sistema deve listar somente documentos pertencentes ao `X-User-Id` informado, ordenados do mais recente para o mais antigo. |
| RF-06 | O sistema deve permitir baixar um documento pelo identificador somente quando ele pertencer ao `X-User-Id` informado. |
| RF-07 | O sistema deve retornar erro compreensível quando faltarem arquivo ou proprietário, o documento não existir, o arquivo exceder o limite ou ocorrer falha de armazenamento. |
| RF-08 | O sistema não deve expor ao cliente o caminho local nem o nome interno usado no filesystem. |

## 4. Requisitos não funcionais

| ID | Requisito |
|---|---|
| RNF-01 | Os arquivos devem ser armazenados exclusivamente no filesystem local com `multer` e `diskStorage`. |
| RNF-02 | Os metadados devem permanecer em memória; reiniciar o processo os remove. |
| RNF-03 | O diretório de armazenamento e a porta devem ser configuráveis por variáveis de ambiente. |
| RNF-04 | O limite padrão de upload deve ser 10 MiB e configurável por variável de ambiente. |
| RNF-05 | O backend deve manter o fluxo `routes -> controllers -> services -> repositories`; camadas internas não devem depender do Express. |
| RNF-06 | O download deve ser transmitido como conteúdo binário, sem carregar o arquivo inteiro na memória da aplicação. |
| RNF-07 | O nome original deve ser tratado como dado não confiável e sanitizado ao compor o cabeçalho de download. |
| RNF-08 | As regras de negócio e os contratos HTTP devem ter testes automatizados usando `node:test`. |
| RNF-09 | O frontend deve acessar a API pelo prefixo `/api`, conforme o proxy de desenvolvimento existente. |

## 5. Modelo de dados

### Documento

| Campo | Tipo | Exposição | Descrição |
|---|---|---|---|
| `id` | string | Público | UUID gerado pelo sistema. |
| `originalName` | string | Público | Nome original fornecido no upload. |
| `size` | number | Público | Tamanho do arquivo em bytes. |
| `mimeType` | string | Público | Tipo MIME informado/detectado no upload, quando disponível. |
| `uploadedAt` | string | Público | Data/hora UTC em formato ISO 8601. |
| `owner` | string | Público | Identificador recebido em `X-User-Id`. |
| `storageName` | string | Interno | Nome gerado para localizar o arquivo no diretório local; nunca enviado pela API. |

O caminho do arquivo é derivado internamente do diretório configurado e de `storageName`. O identificador do documento não deve ser concatenado diretamente como caminho fornecido pelo cliente.

## 6. Contratos de API

As rotas públicas do frontend usam `/api`; o proxy Vite remove esse prefixo antes de encaminhar ao backend. Assim, `/api/upload` chega ao backend como `/upload`.

### `POST /api/upload`

- Cabeçalho obrigatório: `X-User-Id`.
- Corpo: `multipart/form-data`, campo obrigatório `file`.
- Sucesso: `201 Created`, corpo JSON com os metadados públicos do documento.
- Erros: `400` para arquivo ou proprietário ausente; `413` para arquivo acima do limite; `500` para falha inesperada de gravação.
- Se o arquivo for gravado, mas o registro dos metadados falhar, o arquivo recém-gravado deve ser removido.

### `GET /api/documents`

- Cabeçalho obrigatório: `X-User-Id`.
- Sucesso: `200 OK`, array JSON de metadados públicos; lista vazia quando o usuário ainda não tiver documentos.
- Ordenação: `uploadedAt` decrescente.
- Erro: `400` quando o proprietário não for informado.

### `GET /api/documents/:id/download`

- Cabeçalho obrigatório: `X-User-Id`.
- Sucesso: `200 OK`, conteúdo binário com `Content-Disposition: attachment` e nome de download sanitizado.
- Erro: `400` para identificador inválido ou proprietário ausente; `404` se o documento não existir, pertencer a outro usuário ou o arquivo não estiver disponível; `500` para falha inesperada de leitura.

### Formato de erro

```json
{
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "Documento não encontrado."
  }
}
```

Os códigos e mensagens devem ser estáveis o suficiente para o frontend distinguir erros esperados. Respostas de erro não devem conter stack trace nem caminhos locais.

### Identidade e isolamento

`X-User-Id` é um identificador de conveniência para a fase inicial, não uma credencial. Como autenticação está fora do escopo, esse mecanismo não oferece segurança contra falsificação de identidade e não deve ser tratado como autorização em produção.

## 7. Decisões arquiteturais

- **Rotas:** mapeiam os endpoints e delegam aos controllers.
- **Controllers:** validam entrada HTTP, chamam serviços e traduzem resultados para status e respostas HTTP.
- **Services:** aplicam as regras de upload, listagem, propriedade e download.
- **Repositories:** coordenam metadados em memória e acesso aos arquivos locais, sem dependência de HTTP.
- **Upload:** `multer` com `diskStorage`; nome interno gerado pelo sistema e diretório local configurável, com padrão `backend/storage`.
- **Frontend:** React com componentes funcionais e Hooks; chamadas `fetch` pelo prefixo `/api`.
- **Falha/reinício:** metadados desaparecem quando o processo reinicia; arquivos locais podem permanecer sem referência. Recuperação de órfãos não faz parte desta versão.

## 8. Plano de execução

As etapas abaixo descrevem trabalho futuro. Esta especificação não inicia nem detalha a execução de alterações em arquivos de backend ou frontend.

1. **Preparar configuração e limites do domínio.** Definir porta, diretório local e limite máximo por variáveis de ambiente; critérios de aceite: valores padrão documentados e restrições de upload acordadas.
2. **Implementar o fluxo de upload.** Validar entrada, gravar localmente, registrar metadados e tratar falhas; aceite: upload válido retorna `201` e falhas não deixam gravações parciais conhecidas.
3. **Implementar listagem e download com isolamento por proprietário.** Aceite: a listagem é estável e ordenada; download de documento alheio ou inexistente retorna `404`.
4. **Integrar a experiência web.** Permitir selecionar/enviar arquivo, visualizar a lista do usuário e iniciar download; aceite: estados de carregamento, sucesso e erro são comunicados pela interface.
5. **Verificar integração e critérios de qualidade.** Cobrir contratos e regras com testes, validar build do frontend e conferir o fluxo via proxy `/api`; aceite: testes e build passam e os arquivos permanecem exclusivamente no armazenamento local.

## 9. Critérios gerais de aceite

- Upload, listagem e download seguem os contratos desta especificação.
- Um usuário não recebe documentos associados a outro identificador `X-User-Id`.
- O caminho e o nome interno do arquivo não são expostos nas respostas.
- Arquivos são armazenados somente no filesystem local; metadados permanecem em memória.
- O plano permanece como orientação futura, sem execução de arquivos de backend ou frontend.