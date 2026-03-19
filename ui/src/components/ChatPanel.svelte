<script lang="ts">
  import { sendChat } from '../lib/api';

  const { jobId }: { jobId?: string } = $props();

  interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
  }

  let history = $state<ChatMessage[]>([]);
  let input = $state('');
  let loading = $state(false);
  let error = $state<string | null>(null);
  let messagesEl = $state<HTMLElement | null>(null);

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
</script>

<div class="chat-panel">
  {#if history.length > 0}
    <div class="chat-messages" bind:this={messagesEl}>
      {#each history as msg}
        <div class="chat-msg {msg.role}">
          <span class="chat-role">{msg.role === 'user' ? 'you' : 'scrappy'}</span>
          <span class="chat-content">{msg.content}</span>
        </div>
      {/each}
      {#if loading}
        <div class="chat-msg assistant loading">
          <span class="chat-role">scrappy</span>
          <span class="chat-thinking"><span></span><span></span><span></span></span>
        </div>
      {/if}
      {#if error}
        <div class="chat-error">{error}</div>
      {/if}
    </div>
  {/if}

  <div class="chat-input-row">
    <textarea
      class="chat-input"
      bind:value={input}
      onkeydown={handleKeydown}
      placeholder="Ask about jobs, schemas, datasets, errors…"
      rows="1"
      disabled={loading}
    ></textarea>
    <button class="chat-send" onclick={send} disabled={loading || !input.trim()}>↵</button>
  </div>
</div>

<style>
  .chat-panel {
    border: 1px solid #1a1a1a;
    border-left: 2px solid #22d3ee;
    border-radius: 4px;
    background: #090909;
    display: flex;
    flex-direction: column;
    font-family: "IBM Plex Mono", monospace;
    overflow: hidden;
  }

  .chat-messages {
    max-height: 260px;
    overflow-y: auto;
    padding: 0.6rem 0.75rem 0.4rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    scrollbar-width: thin;
    scrollbar-color: #222 transparent;
  }

  .chat-msg {
    display: flex;
    gap: 0.55rem;
    align-items: flex-start;
    font-size: 0.72rem;
    line-height: 1.6;
  }

  .chat-role {
    flex-shrink: 0;
    font-size: 0.58rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding-top: 0.18rem;
    width: 3.2rem;
  }
  .chat-msg.user .chat-role    { color: #555; }
  .chat-msg.assistant .chat-role { color: #22d3ee; opacity: 0.7; }

  .chat-content {
    color: #bbb;
    white-space: pre-wrap;
    word-break: break-word;
    flex: 1;
    min-width: 0;
  }
  .chat-msg.user .chat-content { color: #888; }

  /* Thinking dots */
  .chat-thinking {
    display: flex;
    gap: 3px;
    align-items: center;
    padding-top: 0.3rem;
  }
  .chat-thinking span {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: #22d3ee;
    opacity: 0.4;
    animation: dot-pulse 1.2s ease-in-out infinite;
  }
  .chat-thinking span:nth-child(2) { animation-delay: 0.2s; }
  .chat-thinking span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes dot-pulse {
    0%, 100% { opacity: 0.2; transform: scale(0.8); }
    50% { opacity: 1; transform: scale(1); }
  }

  .chat-error {
    font-size: 0.68rem;
    color: #f87171;
    padding: 0.2rem 0;
  }

  /* Input row */
  .chat-input-row {
    display: flex;
    align-items: flex-end;
    border-top: 1px solid #161616;
    background: #0b0b0b;
  }

  .chat-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: #ccc;
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.72rem;
    line-height: 1.5;
    padding: 0.55rem 0.75rem;
    resize: none;
    margin: 0;
    min-height: unset;
    max-height: 120px;
    overflow-y: auto;
    scrollbar-width: none;
  }
  .chat-input::placeholder { color: #333; }
  .chat-input:disabled { opacity: 0.5; }

  .chat-send {
    all: unset;
    cursor: pointer;
    color: #22d3ee;
    font-size: 1rem;
    padding: 0.45rem 0.75rem 0.45rem 0.5rem;
    opacity: 0.5;
    transition: opacity 0.15s;
    flex-shrink: 0;
    line-height: 1;
  }
  .chat-send:not(:disabled):hover { opacity: 1; }
  .chat-send:disabled { cursor: not-allowed; color: #333; opacity: 1; }
</style>
