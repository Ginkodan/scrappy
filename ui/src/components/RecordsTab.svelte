<script lang="ts">
  import { getRecords, mergeRows } from '../lib/api';
  import { buildDupGroups, groupMaxScore, dupScaleHtml } from '../lib/dedup';

  const { file, refreshTick }: { file: string | null; refreshTick: number } = $props();

  interface DisplayRow {
    origIdx: number;
    row: Record<string, string>;
    gid: number | null;
    rowScore: number;
    borderColor: string | null;
    mergeKeepId: number | null;
    mergeRemoveIds: number[];
    mergeConfidence: string;
    mergeBtnColor: string;
    mergeBtnBg: string;
    mergeBtnBorder: string;
    isFirstOfGroup: boolean;
  }

  let headers = $state<string[]>([]);
  let displayRows = $state<DisplayRow[]>([]);
  let rowCount = $state(0);
  let dupGroupCount = $state(0);
  let dupTotalRows = $state(0);
  let loading = $state(false);
  let error = $state<string | null>(null);

  const GROUP_BORDER_COLORS = ['#ffb74d', '#4fc3f7', '#81c784', '#f06292', '#ce93d8'];

  async function loadRecords() {
    if (!file) return;
    loading = true;
    error = null;
    try {
      const data = await getRecords(file);
      headers = data.headers;
      const rows = data.rows as Record<string, unknown>[];
      rowCount = rows.length;

      if (!headers.length) {
        displayRows = [];
        return;
      }

      const systemFields = ['_dataSource', '_lastUpdated', 'url'];
      const keyFields = ['kontoName', 'bankName'].filter(f => headers.includes(f));
      const useKeyFields = keyFields.length ? keyFields : headers.filter(h => !systemFields.includes(h));
      const rateFields = headers.filter(h => /zins|rate|rendite/i.test(h));

      const groups = buildDupGroups(rows as Record<string, unknown>[], useKeyFields, rateFields);

      const dupGroupsList = [...groups.values()].filter(g => g.length > 1);
      const singletons = [...groups.values()].filter(g => g.length === 1).map(g => g[0]);
      const displayOrder = [...dupGroupsList.flat(), ...singletons];

      const rowGroupId = new Map<number, number>();
      dupGroupsList.forEach((g, gi) => g.forEach(i => rowGroupId.set(i, gi)));

      dupGroupCount = dupGroupsList.length;
      dupTotalRows = dupGroupsList.reduce((s, g) => s + g.length, 0);

      let prevGroupId = -2;
      const built: DisplayRow[] = [];

      for (const origIdx of displayOrder) {
        const row = rows[origIdx] as Record<string, string>;
        const gid = rowGroupId.has(origIdx) ? rowGroupId.get(origIdx)! : null;
        const isInGroup = gid !== null;
        const groupIndices = isInGroup ? dupGroupsList[gid] : null;
        const borderColor = isInGroup ? GROUP_BORDER_COLORS[gid % GROUP_BORDER_COLORS.length] : null;
        const rowScore = isInGroup
          ? groupMaxScore(origIdx, groupIndices!, rows as Record<string, unknown>[], useKeyFields, rateFields)
          : 0;

        let mergeKeepId: number | null = null;
        let mergeRemoveIds: number[] = [];
        let mergeConfidence = '';
        let mergeBtnColor = '';
        let mergeBtnBg = '';
        let mergeBtnBorder = '';
        let isFirstOfGroup = false;

        if (isInGroup && prevGroupId !== gid) {
          isFirstOfGroup = true;
          const winnerIdx = groupIndices!.find(i => (rows[i] as Record<string, string>)['_dataSource'] === 'official') ?? groupIndices![0];
          const removeIdxs = groupIndices!.filter(i => i !== winnerIdx);
          mergeKeepId = Number((rows[winnerIdx] as Record<string, string>)['_id']);
          mergeRemoveIds = removeIdxs.map(i => Number((rows[i] as Record<string, string>)['_id']));
          mergeConfidence = rowScore >= 1 ? 'exact' : rowScore >= 0.75 ? 'likely' : 'possible';
          mergeBtnColor = rowScore >= 1 ? '#4caf50' : rowScore >= 0.75 ? '#ffb74d' : '#888';
          mergeBtnBg = rowScore >= 1 ? '#1a2a1a' : rowScore >= 0.75 ? '#2a1f0a' : '#1a1a1a';
          mergeBtnBorder = rowScore >= 1 ? '#2a4a2a' : rowScore >= 0.75 ? '#4a3a0a' : '#333';
        }

        prevGroupId = gid ?? -2;

        built.push({
          origIdx,
          row,
          gid,
          rowScore,
          borderColor,
          mergeKeepId,
          mergeRemoveIds,
          mergeConfidence,
          mergeBtnColor,
          mergeBtnBg,
          mergeBtnBorder,
          isFirstOfGroup,
        });
      }

      displayRows = built;
    } catch (e) {
      error = String(e);
    } finally {
      loading = false;
    }
  }

  async function handleMerge(keepId: number, removeIds: number[]) {
    if (!file) return;
    try {
      const res = await mergeRows(file, keepId, removeIds);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert('Merge failed: ' + ((err as { error?: string }).error || res.status));
        return;
      }
      await loadRecords();
    } catch (e) {
      alert('Merge error: ' + (e as Error).message);
    }
  }

  $effect(() => {
    // depend on refreshTick to trigger reload
    void refreshTick;
    if (file) loadRecords();
  });
</script>

{#if loading && displayRows.length === 0}
  <div class="dash-empty" style="height:200px">Loading records…</div>
{:else if error}
  <div class="dash-empty" style="height:200px;color:#f44336">{error}</div>
{:else if !file || headers.length === 0}
  <div class="dash-empty" style="height:200px">No records yet</div>
{:else}
  <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;flex-wrap:wrap">
    <span style="font-size:0.72rem;color:#444;font-family:monospace">{rowCount} records · {file}</span>
    {#if dupGroupCount > 0}
      <span style="color:#ffb74d;font-size:0.7rem;font-family:monospace">
        {dupGroupCount} dup group{dupGroupCount > 1 ? 's' : ''} · {dupTotalRows} rows
      </span>
    {/if}
    <a class="dl-link" href="/outputs/{file}" style="margin-left:auto">↓ Download CSV</a>
  </div>
  <div class="records-scroll records-wrap">
    <table class="records-table">
      <thead>
        <tr>
          <th>Dup</th>
          {#each headers as h}
            <th>{h}</th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each displayRows as dr (dr.origIdx)}
          <tr style={dr.borderColor ? `border-left:2px solid ${dr.borderColor};background:${dr.borderColor}0d` : ''}>
            <td style="text-align:center;white-space:nowrap;vertical-align:middle">
              {@html dupScaleHtml(dr.rowScore)}
              {#if dr.isFirstOfGroup && dr.mergeKeepId !== null}
                <div style="margin-top:0.2rem">
                  <button
                    onclick={() => handleMerge(dr.mergeKeepId!, dr.mergeRemoveIds)}
                    style="width:auto;padding:0.15rem 0.45rem;font-size:0.65rem;background:{dr.mergeBtnBg};color:{dr.mergeBtnColor};border:1px solid {dr.mergeBtnBorder};border-radius:3px;cursor:pointer;white-space:nowrap"
                    title="Confidence: {dr.mergeConfidence}."
                  >Merge ({dr.mergeConfidence})</button>
                </div>
              {/if}
            </td>
            {#each headers as h}
              <td
                class={h === '_dataSource' ? (dr.row[h] === 'official' ? 'source-official' : 'source-comparison') : ''}
                title={dr.row[h] ?? ''}
              >{dr.row[h] ?? ''}</td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
