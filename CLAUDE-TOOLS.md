# Claude Code Tools

This project is configured for Claude Code with a project-scoped plugin marketplace.

## Included

- `claude-code-setup` — official Anthropic Claude Code setup assistant.
- `claude-mem` — persistent memory plugin. The upstream project requires its own runtime/dependencies; the marketplace entry points to the upstream plugin directory.
- `task-observer` — lightweight project skill at `.claude/skills/task-observer/`, based on the upstream One Skill to Rule Them All methodology.

## External tools from the shared list

### OmniRoute

OmniRoute is an AI gateway rather than a Claude Code plugin. Install it on the development machine, not inside the web app repository:

```powershell
npm install -g omniroute
omniroute
```

The default dashboard is `http://localhost:20128`. Configure providers and an endpoint/API key in the OmniRoute dashboard before pointing a coding tool at it.

### Headroom

Headroom is a context/tool-output compression layer rather than a repository plugin. Install it as a local CLI:

```powershell
python -m pip install "headroom-ai[all]"
headroom doctor
headroom wrap claude
```

Do not commit API keys, OAuth tokens, `.env` files, or local credentials to this repository.

## Activate the project configuration

From this repository in Claude Code:

```text
/plugin marketplace add datta5566/cl-new-
/plugin install claude-code-setup@knest-ai-tools --scope project
/plugin install claude-mem@knest-ai-tools --scope project
/reload-plugins
```

Project-scoped installation is represented by `.claude/settings.json` and is intended to be shared through Git.

## Safety note

Only install third-party tools after reviewing their source and permissions. Claude Code's plugin documentation specifically recommends trusting and reviewing plugin sources before installation.
