# Changelog

## 1.0.0

Initial Cursor Marketplace release.

- Skills: `bx`, `llm-context`, `answers`, `news-search`, `images-search`, `videos-search`
- Commands: `/bx-setup`, `/bx-search`, `/bx-answers`, `/bx-research`, `/bx-news`, `/bx-debug`, `/bx-install`, `/bx-set-key`
- Auth: one env name, `BRAVE_API_KEY`, for MCP, `bx`, and curl (MCP via Configure; CLI via env or `bx config set-key`)
- MCP: stdio server via `npx -y @brave/brave-search-mcp-server` (`BRAVE_API_KEY` plugin variable)
- Rule: short always-on awareness nudge toward `bx` / Brave Search MCP (additive, not exclusive)
