# Dietoken SDD

## Visão

Dietoken é uma CLI para reduzir contexto sempre carregado em agentes de código, com foco inicial em Codex e Claude Code.

O produto não tenta "comprimir tudo". Ele diagnostica onde tokens são gastos antes da tarefa começar: arquivos de instrução, regras, skills, hooks e configurações que entram no contexto de forma recorrente.

## Problema

Agentes como Codex e Claude Code funcionam melhor quando recebem contexto claro, curto e acionável. Na prática, muitos projetos acumulam instruções longas em `AGENTS.md`, `CLAUDE.md`, `.claude/rules`, skills e arquivos relacionados.

Esse contexto fica sempre ligado ou fácil de carregar, mesmo quando a tarefa não precisa dele. Resultado:

- mais tokens gastos no início da sessão;
- mais ruído antes da tarefa real;
- regras duplicadas ou contraditórias;
- workflows longos guardados no lugar errado;
- menor aderência a instruções importantes.

## Objetivos

- Medir o custo aproximado de contexto de Codex e Claude Code.
- Encontrar arquivos e blocos que provavelmente desperdiçam tokens.
- Sugerir onde cada instrução deve viver: always-on, skill, regra por path, hook ou remoção.
- Gerar um plano de otimização sem alterar arquivos por padrão.
- Manter a ferramenta local-first, sem API key e sem enviar conteúdo para terceiros.

## Não objetivos

- Não chamar LLM para resumir arquivos na versão inicial.
- Não editar arquivos automaticamente sem `--apply`.
- Não substituir Codex, Claude Code, RTK, Repomix ou linters de código.
- Não fazer análise semântica perfeita. A primeira versão usa heurísticas transparentes.

## Usuários

- Devs que usam Codex ou Claude Code diariamente.
- Times que mantêm `AGENTS.md`, `CLAUDE.md`, skills ou rules.
- Criadores de repos que querem configurar agentes sem inflar contexto.

## Princípios

1. Local-first: nenhuma rede para analisar o projeto.
2. Seguro por padrão: `scan` e `plan` nunca alteram arquivos.
3. Explicável: cada alerta mostra arquivo, linha e motivo.
4. Multi-agent: Codex e Claude Code primeiro, outros agentes depois.
5. Pouca magia: heurísticas simples, configuráveis e testáveis.

## Superfícies analisadas

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

### `dietoken gain`

Mostra um relatório consolidado de desperdício de tokens: medidor visual, breakdown por tipo de finding e ranking dos arquivos always-on mais pesados.

```bash
dietoken gain
```

Saída esperada:

```txt
Dietoken — Token Waste Report
════════════════════════════════════════════════════════════

  Files analyzed    4
  Always-on tokens  5,200
  Wasted tokens     1,800 (34.6%)
  Waste meter       ████████░░░░░░░░░░░░░░░░  34.6%

By Finding
────────────────────────────────────────────────────────────
  #  Finding                              Count   Wasted   Share
────────────────────────────────────────────────────────────
  1.  workflow-in-always-on                   2    1,100   61.1%
  2.  vague-rule                              3      700   38.9%
────────────────────────────────────────────────────────────

Top always-on files
────────────────────────────────────────────────────────────
  1.  CLAUDE.md                        2,880 tokens  ██████░░░░░░
  2.  AGENTS.md                        1,240 tokens  ███░░░░░░░░░
────────────────────────────────────────────────────────────

  Run "dietoken scan" for per-finding details.
  Run "dietoken plan" for a step-by-step optimization plan.
```

### `dietoken scan`

Lê arquivos conhecidos, estima tokens e mostra diagnóstico detalhado por arquivo e finding.

```bash
dietoken scan
```

Saída esperada:

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

Gera plano em Markdown com sugestões de reorganização.

```bash
dietoken plan
```

Saída:

```txt
Wrote .dietoken/plan.md
```

### `dietoken apply`

Futuro. Aplica mudanças propostas com backup e diff. Fora do MVP inicial.

### `dietoken hooks install`

Futuro. Instala hooks para evitar comandos ruidosos. Fora do MVP inicial.

## Heurísticas v0.1

### Token estimate

Estimativa local e determinística:

- palavras e pontuação contam como unidades;
- resultado aproximado, não igual ao tokenizer do modelo;
- objetivo é comparar tamanho relativo e tendência.

### Arquivo grande

Alerta quando arquivo always-on passa de limite configurável.

Padrões iniciais:

- warning: acima de 1.500 tokens;
- error: acima de 4.000 tokens.

### Regra vaga

Alerta quando instrução usa termos pouco verificáveis:

- "best practices"
- "clean code"
- "properly"
- "robust"
- "simple"
- "good"
- "adequate"
- "melhor prática"
- "código limpo"
- "adequado"
- "bem feito"

### Workflow em always-on

Alerta quando bloco tem muitos passos ou palavras de processo:

- "step"
- "passo"
- "deploy"
- "release"
- "migration"
- "migração"
- "procedure"
- "procedimento"
- listas numeradas longas

Sugestão: mover para skill.

### Regra por path

Alerta quando bloco menciona padrões de arquivo ou diretório:

- `src/**`
- `*.tsx`
- `tests/`
- `api/`
- `frontend`
- `backend`

Sugestão: mover para regra com escopo por path quando o agente suportar.

### Hook candidato

Alerta quando instrução tenta bloquear ação mecânica:

- "never run"
- "do not run"
- "não rode"
- "nunca rode"
- "do not read"
- "não leia"
- `node_modules`
- `dist`
- `coverage`
- `.next`

Sugestão: mover para hook, porque instrução não é enforcement.

### Duplicata simples

Normaliza linhas e detecta frases repetidas entre arquivos.

## Resolução de `@include`

Dietoken resolve automaticamente referências do tipo `@filename.md` em arquivos Markdown. Quando uma linha contém apenas `@algum-arquivo.md`, o conteúdo do arquivo referenciado é carregado e substituído no lugar antes de estimar os tokens.

Comportamento:

- resolução recursiva com profundidade máxima de 3 níveis;
- o caminho é relativo ao arquivo que contém o `@include`;
- se o arquivo referenciado não existir, a linha original é mantida sem erro;
- a estimativa de tokens reflete o conteúdo resolvido, não a linha bruta.

Isso garante que instruções modulares — como `CLAUDE.md` que inclui `@RTK.md` — sejam contadas pelo tamanho real que chegam ao agente, não pelo tamanho nominal do arquivo de entrada.

## Arquitetura

```txt
src/
  cli.ts
  commands/
    scan.ts
    plan.ts
  discover/
    files.ts
  analyze/
    tokenize.ts
    classify.ts
  report/
    console.ts
    gain.ts
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

## Configuração

Arquivo opcional:

```json
{
  "largeFileWarningTokens": 1500,
  "largeFileErrorTokens": 4000,
  "includeUserFiles": false,
  "ignore": ["node_modules/**", "dist/**"]
}
```

## Saídas

### Texto

Padrão para terminal.

### JSON

Para CI e ferramentas.

```bash
dietoken scan --json
```

### Markdown

Plano gerado por `dietoken plan`.

## MVP

### v0.1 ✓

- CLI `dietoken`.
- `scan`.
- Descoberta de arquivos Codex e Claude no projeto atual.
- Estimativa de tokens.
- Findings: arquivo grande, regra vaga, workflow em always-on, candidato a hook, duplicata simples.
- Saída texto e JSON.
- Testes unitários.

### v0.2 ✓

- `plan`.
- `.dietoken/plan.md`.
- Sugestões agrupadas por tipo.
- README em inglês e português.

### v0.3

- `apply --dry-run`.
- Geração de `AGENTS.md`, `CLAUDE.md`, rules e skills em `.dietoken/generated`.

### v0.4

- Hooks para Codex e Claude.
- Proteção contra comandos ruidosos.

## Critérios de aceite do MVP

- `npm test` passa.
- `npm run build` passa.
- `npx dietoken scan` funciona em um projeto com `AGENTS.md` ou `CLAUDE.md`.
- `dietoken scan --json` retorna JSON válido.
- `dietoken plan` escreve `.dietoken/plan.md`.
- README em português e inglês explicam problema, instalação e uso.

## Riscos

- Token estimate não será idêntico ao modelo real. Mitigação: comunicar como estimativa.
- Heurísticas podem gerar falso positivo. Mitigação: severidade, explicação e configuração.
- Edição automática pode ser perigosa. Mitigação: `apply` fora do MVP inicial e sempre com dry-run.

## Roadmap

- Suporte a Cursor, Gemini CLI e Aider.
- Tokenizer real por modelo quando disponível localmente.
- Visual report HTML.
- Integração opcional com hooks de Codex e Claude.
- Regras customizadas por projeto.
