# NotebookLM as Content Pipeline Knowledge Source

Use NotebookLM notebooks as structured knowledge bases for automated content generation pipelines. The MCP integration gives you programmatic access to query notebooks, extract prompts, and retrieve research — which feeds directly into image generation, social media posting, or cron-driven workflows.

## Overview

NotebookLM → (MCP query) → extracted prompts/strategies → image_gen tool / n8n / cron → social media post

This lets you:
- Store brand guidelines, visual identities, and prompt libraries in NotebookLM notebooks
- Query them programmatically via `mcp_notebooklm_notebook_query` or `mcp_notebooklm_notebook_get`
- Extract reusable artifacts: structured prompts, SEO keywords, post templates
- Feed extracted content into Hermes cron jobs or n8n workflows for scheduled execution

## Common Operations

| Operation | Tool | 
|---|---|
| List notebooks | `mcp_notebooklm_notebook_list` |
| Get notebook + sources | `mcp_notebooklm_notebook_get` |
| AI query against sources | `mcp_notebooklm_notebook_query` |
| Read full source text | `mcp_notebooklm_source_get_content` |
| Manage notes | `mcp_notebooklm_note` (create/list/update/delete) |
| Generate studio artifacts | `mcp_notebooklm_studio_create` (audio, video, infographics, slides) |

## Pinterest Content Workflow (Example)

This pattern emerged from the "Pinterest" notebook (39 sources) which contains GPT Image 2 prompts, Midjourney SREF codes, Seedance 2.0 video prompts, Clean Girl aesthetic guides, and Pinterest SEO tools:

1. **Query the notebook** for prompts relevant to today's content theme
2. **Extract the prompt text** from the response
3. **Generate the image** using the `image_gen` tool (requires FAL_KEY configured, models available via FAL.ai)
4. **Post to Pinterest** via Pinterest API v5 (requires Pinterest Business account + OAuth token)
5. **Schedule daily** via Hermes cron jobs (`cronjob` tool)

## Writing Notes in NotebookLM

You can add notes to notebooks that persist prompts, strategies, and workflow metadata:

```
mcp_notebooklm_note(action="create", notebook_id="...", 
  title="Studio by Margarita: Brand Prompts",
  content="...detailed prompts...")
```

Next time you query the notebook, the notes are included as queryable sources.

## Auth Status

Check with: `mcp_notebooklm_server_info` — returns `auth_status: configured` when tokens are valid.
If stale: run `nlm login` in terminal, or use `mcp_notebooklm_refresh_auth`.
