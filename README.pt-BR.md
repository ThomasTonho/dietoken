# Dietoken

Mate tokens desperdicados. Mantenha contexto melhor.

Dietoken e uma ferramenta de dieta de tokens para agentes de codigo como Codex e Claude Code. Ela analisa arquivos de instrucao, skills, regras, hooks e configuracoes para encontrar contexto sempre ligado, regras duplicadas, instrucoes vagas e workflows que deveriam virar skills ou regras com escopo.

## Por que existe

Agentes de codigo funcionam melhor com contexto curto, claro e relevante. Arquivos como `AGENTS.md`, `CLAUDE.md`, rules e skills frequentemente viram deposito de tudo: convencoes, workflows, avisos, preferencias e lembretes.

Isso cria dois problemas:

- tokens sao gastos antes da tarefa real comecar;
- instrucoes importantes competem com regras antigas, vagas ou duplicadas.

Dietoken mostra esse custo e ajuda a limpar.

## Instalacao

```bash
npm install -g dietoken
```

Ou rode sem instalar:

```bash
npx dietoken scan
```

## Uso

Analisar o projeto atual:

```bash
dietoken scan
```

Imprimir JSON:

```bash
dietoken scan --json
```

Gerar plano de otimizacao:

```bash
dietoken plan
```

Analisar outra pasta:

```bash
dietoken scan --cwd ../meu-projeto
```

Incluir arquivos globais de `~/.codex` e `~/.claude`:

```bash
dietoken scan --include-user
```

## O que o Dietoken analisa

Codex:

- `AGENTS.md`
- `AGENTS.override.md`
- `.agents/skills/**/SKILL.md`
- `.codex/hooks.json`
- `.codex/config.toml`
- arquivos opcionais em `~/.codex/*`

Claude Code:

- `CLAUDE.md`
- `CLAUDE.local.md`
- `.claude/CLAUDE.md`
- `.claude/rules/**/*.md`
- `.claude/skills/**/SKILL.md`
- `.claude/settings.json`
- arquivos opcionais em `~/.claude/*`

## Alertas

Dietoken reporta:

- arquivos always-on grandes;
- regras vagas como "use best practices" ou "codigo limpo";
- workflows longos que deveriam virar skills;
- instrucoes especificas de path que deveriam ficar perto dos arquivos certos;
- regras em texto que deveriam virar hooks ou politicas de permissao;
- instrucoes duplicadas entre arquivos.

## Exemplo

```txt
Dietoken scan

Files analyzed: 2
Total context estimate: 4210 tokens
Always-on estimate: 3820 tokens
Estimated waste: 1340 tokens

Findings
- warning large-always-on-file CLAUDE.md
  CLAUDE.md is always-on and has about 2880 tokens.
  Suggestion: Keep only rules needed in every session. Move long workflows to skills or scoped rules.
- warning workflow-in-always-on AGENTS.md:42
  Workflow-like instruction appears in always-on context.
  Suggestion: Move repeatable procedures to a skill so they load only when needed.
```

## Configuracao

Crie `.dietokenrc.json`:

```json
{
  "largeFileWarningTokens": 1500,
  "largeFileErrorTokens": 4000,
  "includeUserFiles": false,
  "ignore": ["node_modules/**", "dist/**", "coverage/**"]
}
```

## Roadmap

- `apply --dry-run` para arquivos otimizados gerados.
- Instalador de hooks para Codex e Claude.
- Suporte a Cursor, Gemini CLI e Aider.
- Relatorio HTML.
- Tokenizers especificos por modelo, opcionais.

## Design

Veja [docs/SDD.pt-BR.md](docs/SDD.pt-BR.md).

## Licenca

MIT
