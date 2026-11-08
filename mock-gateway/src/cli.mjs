#!/usr/bin/env node
// Picu webhook dari terminal.
//   node src/cli.mjs <event_type> <institution_code> <invoice_number> [amount] [--scenario=normal]
// Contoh:
//   node src/cli.mjs payment.success UCN UKT-20252-2023001 4500000
//   node src/cli.mjs payment.expired ITSB UKT-20252-2023002
//   node src/cli.mjs payment.success UCN UKT-20252-2023001 4500000 --scenario=concurrent_duplicate
import { loadConfig, runScenario, SCENARIOS } from './gateway.mjs';

const args = process.argv.slice(2);
const flags = Object.fromEntries(
  args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')),
);
const [event_type, institution_code, invoice_number, amount] = args.filter(
  (a) => !a.startsWith('--'),
);

if (!event_type || !institution_code || !invoice_number) {
  console.error(
    'Usage: node src/cli.mjs <payment.success|payment.expired> <INSTITUTION_CODE> <INVOICE_NUMBER> [amount] [--scenario=...]',
  );
  console.error('Skenario:', Object.keys(SCENARIOS).join(', '));
  process.exit(1);
}

const deliveries = await runScenario(loadConfig(), {
  event_type,
  institution_code,
  invoice_number,
  amount,
  scenario: flags.scenario,
});
for (const d of deliveries) {
  console.log(`\n→ ${d.payload.event_type} ${d.payload.event_id}`);
  console.log(`  X-Signature: ${d.signature}`);
  for (const a of d.attempts) {
    console.log(`  attempt ${a.attempt}: ${a.status ?? 'ERR'} ${JSON.stringify(a.response ?? a.error)}`);
  }
}
