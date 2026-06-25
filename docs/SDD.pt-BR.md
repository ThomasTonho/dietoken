# Dietoken SDD

## Visao

Dietoken e uma CLI para reduzir contexto sempre carregado em agentes de codigo, com foco inicial em Codex e Claude Code.

O produto nao tenta "comprimir tudo". Ele diagnostica onde tokens sao gastos antes da tarefa comecar: arquivos de instrucao, regras, skills, hooks e configuracoes que entram no contexto de forma recorrente.

## Problema

Agentes como Codex e Claude Code funcionam melhor quando recebem contexto claro, curto e acionavel. Na pratica, muitos projetos acumulam instrucoes longas em `AGENTS.md`, `CLAUDE.md`, `.claude/rules`, skills e arquivos relacionados.

Esse contexto fica sempre ligado ou facil de carregar, mesmo quando a tarefa nao precisa dele. Resultado:

- mais tokens gastos no inicio da sessao;
- mais ruido antes da tarefa real;
- regras duplicadas ou contraditorias;
- workflows longos guardados no lugar errado;
- menor aderencia a instrucoes importantes.

## Objetivos

- Medir o custo aproximado de contexto de Codex e Claude Code.
- Encontrar arquivos e blocos que provavelmente desperdicam tokens.
- Sugerir onde cada instrucao deve viver: always-on, skill, regra por path, hook ou remocao.
- Gerar um plano de otimizacao sem alterar arquivos por padrao.
- Manter a ferramenta local-first, sem API key e sem enviar conteudo para terceiros.

## Nao objetivos

- Nao chamar LLM para resumir arquivos na versao inicial.
- Nao editar arquivos automaticamente sem `--apply`.
- Nao substituir Codex, Claude Code, RTK, Repomix ou linters de codigo.
- Nao fazer analise semantica perfeita. A primeira versao usa heuristicas transparentes.

## Usuarios

- Devs que usam Codex ou Claude Code diariamente.
- Times que mantem `AGENTS.md`, `CLAUDE.md`, skills ou rules.
- Criadores de repos que querem configurar agentes sem inflar contexto.

## Principios

1. Local-first: nenhuma rede para analisar o projeto.
2. Seguro por padrao: `scan` e `plan` nunca alteram arquivos.
3. Explicavel: cada alerta mostra arquivo, linha e motivo.
4. Multi-agent: Codex e Claude Code primeiro, outros agentes depois.
5. Pouca magia: heuristicas simples, configuraveis e testaveis.

## Superficies analisadas

### Codex

- `AGENTS.md`
- `AGENTS.override.md`
- `.agents/skills/**/SKILL.md`
- `.codex/hooks.json`
- `.codex/config.toml`
- `~/.codex/AGENTS.md`
- `~/.codex/hooks.json`
- `~/.codex/config.toml`

### Claude Code

- `CLAUDE.md`
- `CLAUDE.local.md`
- `.claude/CLAUDE.md`
- `.claude/rules/**/*.md`
- `.claude/skills/**/SKILL.md`
- `.claude/settings.json`
- `.claude/settings.local.json`
- `~/.claude/CLAUDE.md`
- `~/.claude/rules/**/*.md`
- `~/.claude/settings.json`

## Comandos

### `dietoken scan`

Le arquivos conhecidos, estima tokens e mostra diagnostico.

Exemplo:

```bash
dietoken scan
```

Saida esperada:

```txt
Dietoken scan

Always-on context
AGENTS.md       1,240 tokens
CLAUDE.md       2,880 tokens

Findings
warning CLAUDE.md:42 vague-rule
warning AGENTS.md:88 workflow-in-always-on

Estimated waste: 1,100 tokens
```

### `dietoken plan`

Gera plano em Markdown com sugestoes de reorganizacao.

```bash
dietoken plan
```

Saida:

```txt
Wrote .dietoken/plan.md
```

### `dietoken apply`

Futuro. Aplica mudancas propostas com backup e diff. Fora do MVP inicial.

### `dietoken hooks install`

Futuro. Instala hooks para evitar comandos ruidosos. Fora do MVP inicial.

## Heuristicas v0.1

### Token estimate

Estimativa local e deterministica:

- palavras e pontuacao contam como unidades;
- resultado aproximado, nao igual ao tokenizer do modelo;
- objetivo e comparar tamanho relativo e tendencia.

### Arquivo grande

Alerta quando arquivo always-on passa de limite configuravel.

Padroes iniciais:

- warning: acima de 1.500 tokens;
- error: acima de 4.000 tokens.

### Regra vaga

Alerta quando instrucao usa termos pouco verificaveis:

- "best practices"
- "clean code"
- "properly"
- "robust"
- "simple"
- "good"
- "adequate"
- "melhor pratica"
- "codigo limpo"
- "adequado"
- "bem feito"

### Workflow em always-on

Alerta quando bloco tem muitos passos ou palavras de processo:

- "step"
- "passo"
- "deploy"
- "release"
- "migration"
- "migracao"
- "procedure"
- "procedimento"
- listas numeradas longas

Sugestao: mover para skill.

### Regra por path

Alerta quando bloco menciona padroes de arquivo ou diretorio:

- `src/**`
- `*.tsx`
- `tests/`
- `api/`
- `frontend`
- `backend`

Sugestao: mover para regra com escopo por path quando o agente suportar.

### Hook candidato

Alerta quando instrucao tenta bloquear acao mecanica:

- "never run"
- "do not run"
- "nao rode"
- "nunca rode"
- "do not read"
- "nao leia"
- `node_modules`
- `dist`
- `coverage`
- `.next`

Sugestao: mover para hook, porque instrucao nao e enforcement.

### Duplicata simples

Normaliza linhas e detecta frases repetidas entre arquivos.

## Arquitetura

```txt
src/
  cli.ts
  commands/
    scan.ts
    plan.ts
  discover/
    codex.ts
    claude.ts
    files.ts
  analyze/
    tokenize.ts
    markdown.ts
    findings.ts
    classify.ts
  report/
    console.ts
    markdown.ts
  config.ts
  types.ts
```

## Modelo de dados

```ts
type AgentKind = "codex" | "claude";

type ContextFile = {
  agent: AgentKind;
  path: string;
  scope: "project" | "user";
  kind: "instructions" | "skill" | "rule" | "hook" | "config";
  alwaysOn: boolean;
  content: string;
  tokenEstimate: number;
};

type Finding = {
  severity: "info" | "warning" | "error";
  code: string;
  message: string;
  file: string;
  line?: number;
  suggestion?: string;
  estimatedWasteTokens?: number;
};
```

## Configuracao

Arquivo opcional:

```json
{
  "largeFileWarningTokens": 1500,
  "largeFileErrorTokens": 4000,
  "includeUserFiles": false,
  "ignore": ["node_modules/**", "dist/**"]
}
```

## Saidas

### Texto

Padrao para terminal.

### JSON

Para CI e ferramentas.

```bash
dietoken scan --json
```

### Markdown

Plano gerado por `dietoken plan`.

## MVP

### v0.1

- CLI `dietoken`.
- `scan`.
- descoberta de arquivos Codex e Claude no projeto atual.
- estimativa de tokens.
- findings: arquivo grande, regra vaga, workflow em always-on, candidato a hook, duplicata simples.
- saida texto e JSON.
- testes unitarios.

### v0.2

- `plan`.
- `.dietoken/plan.md`.
- sugestoes agrupadas por tipo.
- README em ingles e portugues.

### v0.3

- `apply --dry-run`.
- geracao de `AGENTS.md`, `CLAUDE.md`, rules e skills em `.dietoken/generated`.

### v0.4

- hooks para Codex e Claude.
- protecao contra comandos ruidosos.

## Criterios de aceite do MVP

- `npm test` passa.
- `npm run build` passa.
- `npx dietoken scan` funciona em um projeto com `AGENTS.md` ou `CLAUDE.md`.
- `dietoken scan --json` retorna JSON valido.
- `dietoken plan` escreve `.dietoken/plan.md`.
- README em portugues e ingles explicam problema, instalacao e uso.

## Riscos

- Token estimate nao sera identico ao modelo real. Mitigacao: comunicar como estimativa.
- Heuristicas podem gerar falso positivo. Mitigacao: severidade, explicacao e configuracao.
- Edicao automatica pode ser perigosa. Mitigacao: `apply` fora do MVP inicial e sempre com dry-run.

## Roadmap

- Suporte a Cursor, Gemini CLI e Aider.
- Tokenizer real por modelo quando disponivel localmente.
- Visual report HTML.
- Integracao opcional com hooks de Codex e Claude.
- Regras customizadas por projeto.
