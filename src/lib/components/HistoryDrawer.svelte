<script lang="ts">
  let { events = [], isOpen = false, close } = $props();
</script>

{#if isOpen}
  <div class="backdrop animate-fade-in" onclick={close}></div>
  <div class="drawer animate-fade-in">
    <div class="header">
      <h2>Game History</h2>
      <button onclick={close} class="close-btn">&times;</button>
    </div>
    
    <div class="momentum-strip">
      {#each [...events].reverse().filter(e => e.type === 'point' && Boolean(e.side)) as ev}
        <div class="block {ev.side} {ev.delta < 0 ? 'negative' : ''}" title="{ev.side} {ev.delta}"></div>
      {/each}
    </div>

    <div class="timeline">
      {#each events as ev}
        <div class="event-card">
          <div class="time">{new Date(ev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
          <div class="desc">
            {#if ev.type === 'point'}
              <span class="side {ev.side}">{ev.side === 'left' ? 'Left' : 'Right'}</span>
              <span class="delta">{ev.delta > 0 ? '+1' : '-1'} Point</span>
            {:else if ev.type === 'set'}
              <span class="side {ev.side}">{ev.side === 'left' ? 'Left' : 'Right'}</span>
              <span class="delta">{ev.delta > 0 ? '+1' : '-1'} Set</span>
            {:else if ev.type === 'rename'}
              <span>Team Rename</span>
            {:else if ev.type === 'end'}
              <span>Game Ended</span>
            {:else if ev.type === 'reopen'}
              <span>Game Reopened</span>
            {/if}
            {#if ev._id === 'pending'}
               <span class="pending-badge">(Pending)</span>
            {/if}
          </div>
          <div class="score-snapshot">
            <span class="red">{ev.leftScoreAfter}</span>
            <span class="sep">-</span>
            <span class="blue">{ev.rightScoreAfter}</span>
          </div>
        </div>
      {/each}
      {#if events.length === 0}
        <div class="empty">No events yet.</div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    z-index: 100;
  }
  .drawer {
    position: fixed;
    top: 0; right: 0; bottom: 0;
    width: 100%;
    max-width: 400px;
    background: var(--surface-color);
    border-left: 1px solid var(--border-color);
    z-index: 101;
    display: flex;
    flex-direction: column;
    box-shadow: -4px 0 24px rgba(0,0,0,0.5);
  }
  @media (max-width: 500px) {
    .drawer { max-width: 100%; }
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-color);
  }
  .close-btn {
    background: none;
    border: none;
    font-size: 2rem;
    color: var(--text-secondary);
    padding: 0;
    line-height: 1;
    cursor: pointer;
  }
  .close-btn:hover { color: var(--text-primary); }
  
  .momentum-strip {
    display: flex;
    padding: 1rem;
    gap: 2px;
    background: var(--surface-color-hover);
    overflow-x: auto;
    border-bottom: 1px solid var(--border-color);
  }
  .block {
    height: 16px;
    flex: 0 0 12px;
    border-radius: 2px;
  }
  .block.left { background: var(--accent-red); }
  .block.right { background: var(--accent-blue); }
  .block.negative {
    background: transparent;
    border: 1px dashed;
  }
  .block.left.negative { border-color: var(--accent-red); }
  .block.right.negative { border-color: var(--accent-blue); }

  .timeline {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .event-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    background: rgba(255,255,255,0.03);
    border-radius: 8px;
    border: 1px solid var(--border-color);
  }
  .time {
    font-size: 0.8rem;
    color: var(--text-tertiary);
    width: 60px;
  }
  .desc {
    flex: 1;
    display: flex;
    gap: 0.5rem;
    align-items: center;
    font-size: 0.9rem;
  }
  .side.left { color: var(--accent-red); font-weight: bold; }
  .side.right { color: var(--accent-blue); font-weight: bold; }
  .pending-badge {
    font-size: 0.7rem;
    color: var(--text-tertiary);
    text-transform: uppercase;
  }
  .score-snapshot {
    font-weight: 700;
    background: #000;
    padding: 0.25rem 0.5rem;
    border-radius: 6px;
    display: flex;
    gap: 0.25rem;
  }
  .score-snapshot .red { color: var(--accent-red); }
  .score-snapshot .blue { color: var(--accent-blue); }
  .score-snapshot .sep { color: var(--text-tertiary); }
  .empty {
    text-align: center;
    padding: 2rem;
    color: var(--text-tertiary);
  }
</style>
