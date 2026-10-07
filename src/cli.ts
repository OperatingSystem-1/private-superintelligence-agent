#!/usr/bin/env node
// psi: command-line access to Private SuperIntelligence.
import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';
import { PrivateSuperIntelligence, PrivateSuperIntelligenceError, type RevenueBand } from './client.js';
import { runStdioBridge } from './mcp.js';

const HELP = `psi: Private SuperIntelligence from the command line

Usage
  psi about                 What Private SuperIntelligence is and how to join
  psi define                Definition of private superintelligence
  psi layers                The six privacy layers
  psi benchmarks            Published results
  psi faq                   Frequently asked questions
  psi search <words>        Search privatesuperintelligence.si
  psi bands                 Valid revenue bands
  psi register --email <e> --title <t> --revenue <band> [--dry-run] [--yes]
                            Join the waitlist (asks for confirmation unless --yes)
  psi mcp                   Run a stdio MCP server bridged to the remote one

Options
  --json                    Print raw JSON
  --base-url <url>          API base (default https://privatesuperintelligence.si/api/v1)
  -h, --help                Show this help

Docs: https://privatesuperintelligence.si/developers/`;

async function main(argv: string[]) {
  const { values, positionals } = parseArgs({ args: argv, allowPositionals: true, options: {
    json: { type: 'boolean' }, help: { type: 'boolean', short: 'h' }, 'base-url': { type: 'string' },
    email: { type: 'string' }, title: { type: 'string' }, revenue: { type: 'string' },
    'dry-run': { type: 'boolean' }, yes: { type: 'boolean', short: 'y' }, limit: { type: 'string' },
  } });
  const [command, ...rest] = positionals;
  if (values.help || !command) { console.log(HELP); return; }
  if (command === 'mcp') { await runStdioBridge(); return; }
  const client = new PrivateSuperIntelligence({ baseUrl: values['base-url'], userAgent: 'psi-cli' });
  const print = (data: unknown, text: () => string) => console.log(values.json ? JSON.stringify(data, null, 2) : text());

  switch (command) {
    case 'about': {
      const s = await client.service();
      return print(s, () => `${s.name}\n${s.summary}\n\nOperator: ${s.operator.name}, ${s.operator.location}\nAvailability: ${s.availability.detail}\nPricing: ${s.pricing}\n\n${s.url}`);
    }
    case 'define': {
      const d = await client.definition();
      return print(d, () => `${d.term}\n\n${d.text}\n${(d.related ?? []).map((r) => `\n- ${r.term}: ${r.note}`).join('')}\n\n${d.url}`);
    }
    case 'layers': {
      const l = await client.privacyLayers();
      return print(l, () => `${l.layers.map((x) => `${x.order}. ${x.name}: ${x.covers}`).join('\n')}\n\n${l.note}`);
    }
    case 'benchmarks': {
      const b = await client.benchmarks();
      return print(b, () => `${b.metrics.map((m) => `${m.label}: ${m.qualifier ? `${m.qualifier} ` : ''}${m.value}${m.unit}`).join('\n')}\n\nMethodology: ${b.methodology}`);
    }
    case 'faq': {
      const f = await client.faq();
      return print(f, () => f.questions.map((q) => `${q.question}\n${q.answer}`).join('\n\n'));
    }
    case 'bands': {
      const b = await client.revenueBands();
      return print(b, () => b.bands.map((x) => `${x.id.padEnd(24)}${x.label}${x.bookingEligible ? '  (can book a call)' : ''}`).join('\n'));
    }
    case 'search': {
      const query = rest.join(' ').trim();
      if (!query) throw new Error('Usage: psi search <words>');
      const r = await client.search(query, Number(values.limit) || 5);
      return print(r, () => r.results.length ? r.results.map((p) => `${p.title}: ${p.section}\n${p.url}\n${p.text.slice(0, 240)}`).join('\n\n') : 'No matches.');
    }
    case 'register': {
      const { email, title, revenue } = values;
      if (!email || !title || !revenue) throw new Error('Usage: psi register --email <email> --title <job title> --revenue <band>   (see psi bands)');
      const input = { email, jobTitle: title, annualRevenueBand: revenue as RevenueBand, userConfirmed: false, dryRun: values['dry-run'] === true };
      if (!input.dryRun && !values.yes) {
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        const answer = await rl.question(`Register interest in Private SuperIntelligence as\n  ${email}\n  ${title}\n  ${revenue}\nSend these details? [y/N] `);
        rl.close();
        if (!/^y(es)?$/i.test(answer.trim())) { console.log('Nothing sent.'); return; }
      }
      const r = await client.registerInterest({ ...input, userConfirmed: !input.dryRun });
      return print(r, () => `${r.message}${r.bookingUrl ? `\nBook a conversation with Alex: ${r.bookingUrl}` : ''}`);
    }
  }
  throw new Error(`Unknown command "${command}". Run psi --help.`);
}

main(process.argv.slice(2)).catch((error: unknown) => {
  if (error instanceof PrivateSuperIntelligenceError) {
    console.error(`${error.code}: ${error.message}${error.hint ? `\n${error.hint}` : ''}${error.errors ? `\n- ${error.errors.join('\n- ')}` : ''}`);
  } else console.error((error as Error).message);
  process.exitCode = 1;
});
