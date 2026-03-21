<script lang="ts">
  import { startIndexJob, dedupeOutput, getRecords } from '../../lib/api';
  import { jobsStore } from '../../stores/jobs.svelte';
  import { dashStore } from '../../stores/dashboard.svelte';

  const { schemas }: { schemas: Array<{ id: string; display_name: string }> } = $props();

  interface TestCase {
    id: string;
    name: string;
    topic: string;
    output: string;
    seedUrls?: string;
    checks: Array<{ label: string; fn: (rows: Record<string, string>[]) => boolean }>;
  }

  interface TestState {
    jobId: string | null;
    status: 'idle' | 'running' | 'pass' | 'fail';
    rows: Record<string, string>[];
    checkResults: Array<{ label: string; pass: boolean }>;
    error: string | null;
  }

  const TEST_CASES: TestCase[] = [
    {
      id: 'zkb',
      name: 'ZKB',
      topic: 'ZKB Sparen 3 Konto Fonds Säule 3a Zinssatz 2025 Schweiz',
      output: 'test-zkb.csv',
      seedUrls: 'https://www.zkb.ch/de/private/vorsorge/3saeule-freizuegigkeit/saeule-3a-konto.html,https://www.zkb.ch/de/private/vorsorge/3saeule-freizuegigkeit/saeule-3a-fonds.html',
      checks: [
        { label: '≥2 products (Konto + Fonds)', fn: rows => rows.length >= 2 },
        { label: 'No duplicate kontoName', fn: rows => new Set(rows.map(r => (r['kontoName'] ?? '').toLowerCase())).size === rows.length },
      ],
    },
    {
      id: 'neon',
      name: 'Neon',
      topic: 'Neon 3a Konto Zinssatz Säule 3a Schweiz 2025',
      output: 'test-neon.csv',
      seedUrls: 'https://www.neon-free.ch/saeule3a',
      checks: [
        { label: '≥1 product found', fn: rows => rows.length >= 1 },
        { label: 'No duplicate kontoName', fn: rows => new Set(rows.map(r => (r['kontoName'] ?? '').toLowerCase())).size === rows.length },
        { label: 'bankName has no legal suffix', fn: rows => rows.every(r => !/\b(ag|sa|gmbh)\b/i.test(r['bankName'] ?? '')) },
      ],
    },
    {
      id: 'valiant',
      name: 'Valiant',
      topic: 'Valiant Bank Säule 3a Konto Zinssatz Schweiz 2025',
      output: 'test-valiant.csv',
      seedUrls: 'https://www.valiant.ch/de/privatkunden/vorsorgen-versichern/saeule-3a',
      checks: [
        { label: '≥1 record', fn: rows => rows.length >= 1 },
        { label: 'bankName has no legal suffix', fn: rows => rows.every(r => !/\b(ag|sa|gmbh)\b/i.test(r['bankName'] ?? '')) },
        { label: 'No duplicate kontoName', fn: rows => new Set(rows.map(r => (r['kontoName'] ?? '').toLowerCase())).size === rows.length },
      ],
    },
    {
      id: 'tellco',
      name: 'Tellco',
      topic: 'Tellco Säule 3a Vorsorge Konto Zinssatz Schweiz 2025',
      output: 'test-tellco.csv',
      seedUrls: 'https://www.tellco.ch/de/saeule-3a',
      checks: [
        { label: '≥1 record', fn: rows => rows.length >= 1 },
        { label: 'bankName has no legal suffix', fn: rows => rows.every(r => !/\b(ag|sa|gmbh)\b/i.test(r['bankName'] ?? '')) },
        { label: 'No duplicate kontoName', fn: rows => new Set(rows.map(r => (r['kontoName'] ?? '').toLowerCase())).size === rows.length },
      ],
    },
  ];

  let testStates = $state<Record<string, TestState>>(
    Object.fromEntries(TEST_CASES.map(tc => [tc.id, { jobId: null, status: 'idle', rows: [], checkResults: [], error: null }]))
  );

  let selectedSchema = $state('');
  let maxIter = $state('20');

  $effect(() => {
    if (schemas.length && !selectedSchema) selectedSchema = schemas[0].id;
  });

  async function runTest(tcId: string) {
    const tc = TEST_CASES.find(t => t.id === tcId);
    if (!tc) return;
    if (!selectedSchema) { alert('No schema available'); return; }

    testStates = {
      ...testStates,
      [tcId]: { jobId: null, status: 'running', rows: [], checkResults: [], error: null },
    };

    const res = await startIndexJob({
      topic: tc.topic,
      schema: selectedSchema,
      output: tc.output,
      maxIterations: Number(maxIter.trim() || '20'),
      ...(tc.seedUrls ? { seedUrls: tc.seedUrls } : {}),
    });

    if (res.error || !res.id) {
      testStates = {
        ...testStates,
        [tcId]: { ...testStates[tcId], status: 'fail', error: res.error ?? 'Unknown error' },
      };
      return;
    }

    testStates = { ...testStates, [tcId]: { ...testStates[tcId], jobId: res.id } };
    await jobsStore.refresh();
    await dashStore.openJob(res.id);

    await new Promise<void>(resolve => {
      const es = new EventSource(`/jobs/${res.id}/stream`);
      es.onmessage = async (e) => {
        const { type, payload } = JSON.parse(e.data);
        if (type !== '__done__') return;
        es.close();
        if ((payload as { status: string }).status !== 'done') {
          testStates = {
            ...testStates,
            [tcId]: { ...testStates[tcId], status: 'fail', error: `Job ended with status: ${(payload as { status: string }).status}` },
          };
          resolve();
          return;
        }
        await dedupeOutput(tc.output);
        const { rows } = await getRecords(tc.output);
        const typedRows = rows as Record<string, string>[];
        const checkResults = tc.checks.map(c => ({ label: c.label, pass: c.fn(typedRows) }));
        testStates = {
          ...testStates,
          [tcId]: {
            ...testStates[tcId],
            status: checkResults.every(c => c.pass) ? 'pass' : 'fail',
            rows: typedRows,
            checkResults,
          },
        };
        resolve();
      };
      es.onerror = () => {
        es.close();
        testStates = {
          ...testStates,
          [tcId]: { ...testStates[tcId], status: 'fail', error: 'Stream error' },
        };
        resolve();
      };
    });
  }
</script>

<label>Schema</label>
<select bind:value={selectedSchema} style="margin-bottom:0.75rem">
  {#each schemas as s}
    <option value={s.id}>{s.display_name}</option>
  {/each}
</select>

<label>Max iterations <span>(default 15)</span></label>
<input type="number" bind:value={maxIter} placeholder="20" min="1" max="100" style="margin-bottom:0.75rem" />

<div>
  {#each TEST_CASES as tc}
    {@const ts = testStates[tc.id]}
    <div class="test-case" id="tc-{tc.id}">
      <div class="test-case-header">
        <span class="test-case-name">{tc.name}</span>
        {#if ts.status === 'running'}
          <span class="badge running">running</span>
        {:else if ts.status === 'pass'}
          <span class="badge pass">PASS</span>
        {:else if ts.status === 'fail'}
          <span class="badge failed">FAIL</span>
        {/if}
        {#if ts.jobId}
          <span
            style="font-size:0.68rem;color:#00bcd4;cursor:pointer"
            onclick={() => dashStore.openJob(ts.jobId!)}
          >view →</span>
        {/if}
        <button class="run-test-btn" disabled={ts.status === 'running'} onclick={() => runTest(tc.id)}>
          Run
        </button>
      </div>
      <div class="test-case-topic">{tc.topic}</div>
      {#each ts.checkResults as cr}
        <div class="check-item {cr.pass ? 'pass' : 'fail'}">
          <span>{cr.pass ? '✓' : '✗'}</span>
          <span>{cr.label}</span>
        </div>
      {/each}
      {#if ts.error}
        <div class="check-item fail">
          <span>✗</span>
          <span>{ts.error}</span>
        </div>
      {/if}
      {#if ts.rows.length > 0}
        <div style="font-size:0.68rem;color:#555;font-family:monospace;margin-top:0.25rem">
          {ts.rows.length} records after dedupe
        </div>
      {/if}
    </div>
  {/each}
</div>
