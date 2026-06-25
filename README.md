# Dietoken

Audite contexto de agentes de IA e corte desperdício de tokens.

Dietoken é uma CLI para projetos que usam agentes de código como Codex e Claude Code. Ela analisa arquivos de instrução, skills, regras, hooks e configurações para encontrar contexto sempre ligado grande demais, instruções duplicadas, regras vagas e workflows que deveriam ficar em skills ou regras com escopo.

## Por que existe

Agentes de código funcionam melhor com contexto curto, claro e relevante. Arquivos como `AGENTS.md`, `CLAUDE.md`, regras e skills podem virar depósito de convenções, workflows, avisos e preferências antigas.

Isso cria dois problemas:

- tokens são gastos antes da tarefa real começar;
- instruções importantes competem com regras vagas, duplicadas ou desatualizadas.

Dietoken mostra esse custo e ajuda a limpar o contexto.

## Instalação

```bash
npm install -g dietoken
```

Ou rode sem instalar:

```bash
npx dietoken scan
```

## Uso rápido

Analisar o projeto atual:

```bash
dietoken scan
```

Imprimir JSON:

```bash
dietoken scan --json
```

Gerar um plano de otimização:

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
- regras vagas como "use best practices" ou "código limpo";
- workflows longos que deveriam virar skills;
- instruções específicas de path que deveriam ficar perto dos arquivos certos;
- regras em texto que deveriam virar hooks ou políticas de permissão;
- instruções duplicadas entre arquivos.

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

## Configuração

Crie `.dietokenrc.json`:

```json
{
  "largeFileWarningTokens": 1500,
  "largeFileErrorTokens": 4000,
  "includeUserFiles": false,
  "ignore": ["node_modules/**", "dist/**", "coverage/**"]
}
```

## Desenvolvimento

```bash
npm install
npm test
```

## Tags

`ai-agents` `cli` `claude-code` `codex` `context-engineering` `developer-tools` `llm` `prompt-engineering` `token-optimization` `tokens` `typescript`

## Roadmap

- `apply --dry-run` para arquivos otimizados gerados.
- Instalador de hooks para Codex e Claude.
- Suporte a Cursor, Gemini CLI e Aider.
- Relatório HTML.
- Tokenizers específicos por modelo, opcionais.

## Design

Veja [docs/SDD.pt-BR.md](docs/SDD.pt-BR.md).

## Licença

MIT
