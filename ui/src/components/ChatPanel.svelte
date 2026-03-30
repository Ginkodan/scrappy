<script lang="ts">
  import { sendChat } from '../lib/api';

  const { jobId, output }: { jobId?: string; output?: string } = $props();

  interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
  }

  let history = $state<ChatMessage[]>([]);
  let input = $state('');
  let loading = $state(false);
  let error = $state<string | null>(null);
  let messagesEl = $state<HTMLElement | null>(null);

  const quickPrompts = [
    { label: 'Summarize results', prompt: 'Summarize the extracted results so far.' },
    { label: 'Missing data?', prompt: 'Which records have missing or incomplete fields?' },
    { label: 'Find duplicates', prompt: 'Are there any duplicate entries in the dataset?' },
  ];

  async function send() {
    const msg = input.trim();
    if (!msg || loading) return;
    input = '';
    error = null;
    history = [...history, { role: 'user', content: msg }];
    loading = true;
    scrollToBottom();
    try {
      const res = await sendChat(msg, jobId, history.slice(0, -1));
      if (res.error) {
        error = res.error;
      } else {
        history = [...history, { role: 'assistant', content: res.reply ?? '' }];
      }
    } catch (e) {
      error = String(e);
    } finally {
      loading = false;
      scrollToBottom();
    }
  }

  function scrollToBottom() {
    setTimeout(() => {
      if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
    }, 20);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function usePrompt(prompt: string) {
    input = prompt;
  }

  function exportCsv() {
    if (!output) return;
    const a = document.createElement('a');
    a.href = `/outputs/${encodeURIComponent(output)}`;
    a.download = `${output}.csv`;
    a.click();
  }
</script>

<div class="chat-panel">
  <!-- Messages -->
  <div class="chat-messages" bind:this={messagesEl}>
    {#if history.length === 0 && !loading}
      <div class="chat-empty">
        <span class="msicon" style="font-size:2rem;color:var(--primary-container);opacity:0.4">auto_awesome</span>
        <div class="chat-empty-text">Ask me anything about this extraction, schemas, or data quality.</div>
      </div>
    {/if}

    {#each history as msg}
      {#if msg.role === 'user'}
        <div class="msg-row msg-row--user">
          <div class="bubble bubble--user">{msg.content}</div>
        </div>
      {:else}
        <div class="msg-row msg-row--assistant">
          <span class="msicon msg-icon">auto_awesome</span>
          <div class="bubble bubble--assistant">{msg.content}</div>
        </div>
      {/if}
    {/each}

    {#if loading}
      <div class="msg-row msg-row--assistant">
        <span class="msicon msg-icon">auto_awesome</span>
        <div class="bubble bubble--assistant bubble--thinking">
          <span></span><span></span><span></span>
        </div>
      </div>
    {/if}

    {#if error}
      <div class="msg-error">{error}</div>
    {/if}
  </div>

  <!-- Input area -->
  <div class="chat-input-area">
    <div class="input-wrap">
      <textarea
        class="chat-input"
        bind:value={input}
        onkeydown={handleKeydown}
        placeholder="Instruction prompt..."
        rows="3"
        disabled={loading}
      ></textarea>
      <button
        class="send-btn"
        aria-label="Send"
        onclick={send}
        disabled={loading || !input.trim()}
        title="Send (Enter)"
      >
        <span class="msicon" style="font-size:16px">send</span>
      </button>
    </div>

    <!-- Quick chips -->
    <div class="chips">
      {#each quickPrompts as qp}
        <button class="chip" onclick={() => usePrompt(qp.prompt)}>{qp.label}</button>
      {/each}
      {#if output}
        <button class="chip chip--action" onclick={exportCsv} title="Download CSV">
          <span class="msicon" style="font-size:11px;vertical-align:middle">download</span>
          Export CSV
        </button>
      {/if}
    </div>
  </div>
</div>

<style>
  .chat-panel {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    font-family: 'Space Grotesk', sans-serif;
  }

  /* Messages */
  .chat-messages {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.06) transparent;
  }

  .chat-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    height: 100%;
    min-height: 120px;
    padding: 2rem 1rem;
  }
  .chat-empty-text {
    font-size: 0.68rem;
    color: var(--on-surface-muted);
    text-align: center;
    line-height: 1.7;
    letter-spacing: 0.02em;
  }

  /* Message rows */
  .msg-row {
    display: flex;
    gap: 0.5rem;
    align-items: flex-start;
  }
  .msg-row--user { justify-content: flex-end; }
  .msg-row--assistant { justify-content: flex-start; }

  .msg-icon {
    font-size: 14px;
    color: var(--primary-container);
    flex-shrink: 0;
    margin-top: 0.2rem;
  }

  /* Bubbles */
  .bubble {
    font-size: 0.68rem;
    line-height: 1.7;
    padding: 0.65rem 0.85rem;
    white-space: pre-wrap;
    word-break: break-word;
    max-width: 90%;
  }
  .bubble--user {
    background: rgba(255,255,255,0.05);
    color: var(--on-surface);
    border-radius: 2px;
  }
  .bubble--assistant {
    background: var(--surface-container);
    border-left: 2px solid var(--primary-container);
    color: var(--on-surface-muted);
    flex: 1;
    min-width: 0;
    max-width: 100%;
  }

  /* Thinking dots */
  .bubble--thinking {
    display: flex;
    gap: 4px;
    align-items: center;
    padding: 0.65rem 0.85rem;
  }
  .bubble--thinking span {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--primary-container);
    opacity: 0.4;
    animation: dot-pulse 1.2s ease-in-out infinite;
  }
  .bubble--thinking span:nth-child(2) { animation-delay: 0.2s; }
  .bubble--thinking span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes dot-pulse {
    0%, 100% { opacity: 0.2; transform: scale(0.8); }
    50% { opacity: 1; transform: scale(1.1); }
  }

  .msg-error {
    font-size: 0.68rem;
    color: #ef4444;
    background: rgba(239,68,68,0.08);
    border: 1px solid rgba(239,68,68,0.2);
    padding: 0.5rem 0.75rem;
    border-radius: 2px;
  }

  /* Input area */
  .chat-input-area {
    flex-shrink: 0;
    padding: 0.75rem;
    background: var(--surface-container);
    border-top: 1px solid rgba(255,255,255,0.04);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .input-wrap {
    position: relative;
  }

  .chat-input {
    width: 100%;
    box-sizing: border-box;
    background: var(--surface-container-low);
    border: 1px solid rgba(255,255,255,0.08);
    outline: none;
    color: var(--on-surface);
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.68rem;
    line-height: 1.6;
    padding: 0.65rem 2.5rem 0.65rem 0.75rem;
    resize: none;
    transition: border-color 0.15s;
    display: block;
  }
  .chat-input::placeholder { color: var(--on-surface-muted); opacity: 0.5; }
  .chat-input:focus { border-color: rgba(255,89,10,0.4); }
  .chat-input:disabled { opacity: 0.4; }

  .send-btn {
    all: unset;
    cursor: pointer;
    position: absolute;
    bottom: 0.5rem;
    right: 0.5rem;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--primary-container);
    color: var(--on-primary-fixed);
    border-radius: 2px;
    transition: opacity 0.15s;
    flex-shrink: 0;
  }
  .send-btn:not(:disabled):hover { opacity: 0.85; }
  .send-btn:disabled { opacity: 0.3; cursor: not-allowed; }

  /* Chips */
  .chips {
    display: flex;
    gap: 0.35rem;
    flex-wrap: wrap;
  }
  .chip {
    all: unset;
    cursor: pointer;
    padding: 0.2rem 0.6rem;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.6rem;
    letter-spacing: 0.04em;
    color: var(--on-surface-muted);
    transition: color 0.15s, border-color 0.15s;
    white-space: nowrap;
  }
  .chip:hover { color: var(--on-surface); border-color: rgba(255,255,255,0.15); }
  .chip--action { color: var(--primary-container); border-color: rgba(255,89,10,0.2); }
  .chip--action:hover { border-color: rgba(255,89,10,0.4); opacity: 0.9; }
</style>
