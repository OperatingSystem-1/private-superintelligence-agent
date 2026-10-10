# Private SuperIntelligence for agents

Official SDK, CLI, MCP bridge, skills and plugin for [Private SuperIntelligence](https://privatesuperintelligence.si), the private AI concierge from [Mitosis Labs](https://mitosislabs.ai) for enterprises, family offices and private clients.

**Private superintelligence** is superintelligent AI you can trust with everything: your work, your data and the questions you'd ask no one else. It knows your whole world, keeps it yours, and puts the full reach of the most capable AI behind you. [Read the full definition](https://privatesuperintelligence.si/what-is-private-superintelligence/).

Every surface is free and needs no API key.

## Connect an agent

Remote MCP server (Streamable HTTP):

```bash
claude mcp add --transport http private-superintelligence https://privatesuperintelligence.si/mcp
```

Clients that only launch local servers can use the stdio bridge:

```json
{ "mcpServers": { "private-superintelligence": { "command": "npx", "args": ["-y", "private-superintelligence", "mcp"] } } }
```

Tools: `get_service_overview`, `get_privacy_layers`, `get_benchmarks`, `search_site`, `read_page`, `register_interest`.

## CLI

```bash
npx private-superintelligence define       # or install globally and run `psi define`
psi about
psi layers
psi search "zero retention"
psi register --email cio@example.com --title "Chief Investment Officer" --revenue 250m-1b --dry-run
```

`psi register` shows the details and asks before it sends anything. `--dry-run` validates without sending.

## SDK

```bash
npm install private-superintelligence
```

```ts
import { PrivateSuperIntelligence } from 'private-superintelligence';

const psi = new PrivateSuperIntelligence();
const { text } = await psi.definition();
const { results } = await psi.search('air-gapped deployment');

// Only after the person has approved these exact details:
await psi.registerInterest(
  { email: 'cio@example.com', jobTitle: 'Chief Investment Officer', annualRevenueBand: '250m-1b', userConfirmed: true },
  { idempotencyKey: crypto.randomUUID() },
);
```

Errors throw `PrivateSuperIntelligenceError` with the API's `code`, `hint` and field `errors`.

## Skills and plugin

- [`skills/explain-private-superintelligence`](skills/explain-private-superintelligence/SKILL.md)
- [`skills/register-interest`](skills/register-interest/SKILL.md)
- [`plugin.json`](plugin.json) ([Agent Plugins](https://agent-plugins.org/specification)), [`.claude-plugin/plugin.json`](.claude-plugin/plugin.json) (Claude Code), [`mcp.json`](mcp.json)

Install the skills with `npx skills add OperatingSystem-1/private-superintelligence-agent`.

Claude Code: `/plugin marketplace add OperatingSystem-1/private-superintelligence-agent`, then `/plugin install private-superintelligence@private-superintelligence`.

Gemini CLI: `gemini extensions install https://github.com/OperatingSystem-1/private-superintelligence-agent`.

## Links

- Site: https://privatesuperintelligence.si
- Developer guide: https://privatesuperintelligence.si/developers/
- OpenAPI: https://privatesuperintelligence.si/openapi.json
- llms.txt: https://privatesuperintelligence.si/llms.txt
- Contact: hello@mitosislabs.ai

MIT licensed.
