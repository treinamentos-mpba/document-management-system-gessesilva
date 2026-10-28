---
description: Verifica cobertura de testes do backend, frontend ou projeto inteiro e resume métricas, lacunas e próximos testes prioritários.
name: verificar-cobertura
argument-hint: escopo opcional (backend, frontend ou projeto inteiro)
agent: agent
---

# Verificar cobertura de testes

Verifique a cobertura de testes para `${input:escopo:projeto inteiro}`.

Instruções:

- Inspecione os `package.json` e as configurações de teste do escopo solicitado antes de executar comandos.
- Execute os testes com cobertura disponíveis para cada pacote, no diretório correto. Neste projeto, use `npm test -- --experimental-test-coverage` em `backend/` e `npm run test:coverage` em `frontend/`.
- Não instale dependências, não altere arquivos e não crie testes durante esta verificação.
- Informe separadamente por pacote: comando executado, testes aprovados/falhos e cobertura de linhas, branches, funções e statements quando disponível.
- Destaque módulos com menor cobertura e linhas ou branches descobertos, priorizando lacunas que representem caminhos críticos ou tratamento de erros.
- Se a ferramenta, script ou relatório de cobertura não estiver disponível, explique a limitação e indique a configuração necessária sem aplicá-la.
- Não calcule uma média entre backend e frontend nem trate percentual alto como garantia de qualidade. Não imponha um threshold sem solicitação explícita.

## Formato da resposta

1. **Resumo:** situação geral da execução e cobertura por pacote.
2. **Resultados:** tabela com pacote, testes aprovados/falhos e métricas disponíveis.
3. **Lacunas prioritárias:** módulos ou ramos descobertos e uma sugestão objetiva de teste para cada um.
4. **Limitações:** comandos não executados, cobertura indisponível ou falhas encontradas.