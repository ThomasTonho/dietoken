# Dietoken

**Pare de pagar por contexto que você nunca pediu.**

[![CI](https://github.com/ThomasTonho/dietoken/actions/workflows/ci.yml/badge.svg)](https://github.com/ThomasTonho/dietoken/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/dietoken.svg)](https://www.npmjs.com/package/dietoken)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-green.svg)](https://nodejs.org)

Dietoken audita o contexto always-on carregado por agentes de IA — `CLAUDE.md`, `AGENTS.md`, regras, skills, hooks e configs — e mostra exatamente o que está inflando suas sessões antes do primeiro prompt ser enviado.

## O problema

Seu `CLAUDE.md` começou com uma linha. Depois cresceu.

Agora toda sessão carrega 4.000 tokens de convenções, workflows velhos, lembretes vagos e regras que não importam há meses. O agente lê tudo. Você paga por tudo. E as instruções que realmente importam competem com o ruído.

Dietoken mostra esse custo e como corrigi-lo.

## Instalação

```sh
# One-liner (macOS / Linux)
curl -fsSL https://raw.githubusercontent.com/ThomasTonho/dietoken/main/install.sh | sh

# npm
npm install -g dietoken

# Sem instalar
npx dietoken scan
```

## Uso

```sh
dietoken gain                    # Relatório de desperdício de tokens
dietoken scan                    # Diagnóstico detalhado por arquivo
dietoken scan --include-user     # Inclui arquivos globais ~/.claude e ~/.codex
dietoken scan --json             # Saída em JSON
dietoken scan --cwd ../projeto   # Analisar outro diretório
dietoken plan                    # Gerar plano de otimização passo a passo
```

## Exemplo — dietoken gain

```
$ dietoken gain

  Dietoken — Token Waste Report
  ════════════════════════════════════════════════════════════

  Files analyzed    6
  Always-on tokens  3,820
  Wasted tokens     1,340  ████████░░░░░░░░░░░░░░░░  35.1%

  By Finding
  ────────────────────────────────────────────────────────────
    #  Finding                         Count   Wasted   Share
  ────────────────────────────────────────────────────────────
    1.  large-always-on-file               1    1,240   92.5%
    2.  vague-rule                         3       45    3.4%
    3.  workflow-in-always-on              2       30    2.2%
    4.  duplicate-guidance                 1       25    1.9%
  ────────────────────────────────────────────────────────────
```

## Exemplo — dietoken scan

```
$ dietoken scan

  Files analyzed: 6
  Total context estimate: 4210 tokens
  Always-on estimate: 3820 tokens
  Estimated waste: 1340 tokens

  Findings

  ● large-always-on-file  CLAUDE.md
    2,880 tokens loaded on every session.
    → Move long workflows to skills. Keep only session-critical rules here.

  ● workflow-in-always-on  AGENTS.md:42
    Repeatable procedure found in always-on context.
    → Convert to a skill so it loads only when invoked.

  ● vague-rule  CLAUDE.md:17
    "Write clean code and follow best practices."
    → Remove or replace with a concrete, enforceable rule.
```

## O que analisa

| Agente | Arquivos |
|---|---|
| **Claude Code** | `CLAUDE.md`, `CLAUDE.local.md`, `.claude/CLAUDE.md`, `.claude/rules/**`, `.claude/skills/**`, `.claude/settings.json` |
| **Codex** | `AGENTS.md`, `AGENTS.override.md`, `.agents/skills/**`, `.codex/hooks.json`, `.codex/config.toml` |

Use `--include-user` para incluir também os arquivos globais em `~/.claude` e `~/.codex`.

Dietoken resolve diretivas `@arquivo.md` automaticamente — se seu `CLAUDE.md` contém `@RTK.md`, o conteúdo do arquivo incluído é contado nos tokens.

## Alertas

| Alerta | O que significa |
|---|---|
| `large-always-on-file` | Arquivo excede o limite de tokens e carrega em toda sessão |
| `vague-rule` | Instrução como "use best practices" que o agente não consegue verificar |
| `workflow-in-always-on` | Procedimento passo a passo que pertence a uma skill, não ao contexto global |
| `path-specific-instruction` | Regra restrita a um diretório mas carregada em todo lugar |
| `prose-to-hook` | Regra que seria melhor aplicada como hook ou permissão |
| `duplicate-instruction` | Mesma instrução encontrada em múltiplos arquivos |

## Configuração

```json
// .dietokenrc.json
{
  "largeFileWarningTokens": 1500,
  "largeFileErrorTokens": 4000,
  "includeUserFiles": false,
  "ignore": ["node_modules/**", "dist/**", "coverage/**"]
}
```

## Desenvolvimento

```sh
npm install
npm test
```

## Roadmap

- [ ] `apply --dry-run` — gerar arquivos otimizados sem alterar os originais
- [ ] Instalador de hooks para Codex e Claude Code
- [ ] Suporte a Cursor, Gemini CLI e Aider
- [ ] Relatório HTML
- [ ] Tokenizers por modelo

## Design

Veja [SDD.pt-BR.md](SDD.pt-BR.md).

## Licença

MIT
