<script lang="ts">
  import { page } from '$app/stores';
  import { convex, createQuery } from "$lib/convex.svelte";
  import { getEditorSecret, getOrCreateDeviceId } from "$lib/auth";
  import HistoryDrawer from "$lib/components/HistoryDrawer.svelte";
  import ConfirmModal from "$lib/components/ConfirmModal.svelte";
  import RenameModal from "$lib/components/RenameModal.svelte";
  import { onMount } from 'svelte';

  const api: any = {
    games: {
      getByCode: "games:getByCode",
      adjustScore: "games:adjustScore",
      adjustSet: "games:adjustSet",
      endSet: "games:endSet",
      renameTeam: "games:renameTeam",
      end: "games:end",
      reopen: "games:reopen"
    },
    events: {
      listTimeline: "events:listTimeline"
    }
  };

  let gameCode = $derived($page.params.gameCode);
  
  let gameQuery = createQuery(api.games.getByCode, () => ({ gameCode }));
  let game = $derived(gameQuery.data);

  let isCreator = $state(false);
  let secret = $state<string | null>(null);
  let deviceId = $state<string>("");

  $effect(() => {
    if (gameCode) {
      // client side only
      if (typeof window !== "undefined") {
        secret = getEditorSecret(gameCode);
        deviceId = getOrCreateDeviceId();
        isCreator = !!secret;
      }
    }
  });

  let eventsQuery = createQuery(api.events.listTimeline, () => {
    // Only query if we have the game ID
    if (!game) return { gameId: "skip", limit: 0 };
    return { gameId: game._id, limit: 100, includeCurrentPending: true };
  });

  let isHistoryOpen = $state(false);

  let modal = $state({
    open: false,
    title: "",
    message: "",
    onConfirm: () => {},
    confirmText: "Confirm",
    cancelText: "Cancel"
  });

  let renameModal = $state({
    open: false,
    title: "",
    initialValue: "",
    theme: "default",
    onConfirm: (val: string) => {}
  });

  function showConfirm(title: string, message: string, onConfirm: () => void, confirmText = "Confirm") {
    modal = { open: true, title, message, onConfirm, confirmText, cancelText: "Cancel" };
  }

  function showAlert(title: string, message: string) {
    modal = { open: true, title, message, onConfirm: () => {}, confirmText: "OK", cancelText: "" };
  }

  async function score(side: 'left' | 'right', delta: 1 | -1) {
    if (!isCreator || !game || game.status !== 'live') return;
    await convex.mutation(api.games.adjustScore, {
      gameId: game._id, side, delta, editorSecret: secret, actorDeviceId: deviceId
    });
  }

  async function set(side: 'left' | 'right', delta: 1 | -1) {
    if (!isCreator || !game || game.status !== 'live') return;
    await convex.mutation(api.games.adjustSet, {
      gameId: game._id, side, delta, editorSecret: secret, actorDeviceId: deviceId
    });
  }

  async function endCurrentSet() {
    if (!isCreator || !game || game.status !== 'live') return;
    if (game.leftScore === game.rightScore) {
       showAlert("Tied Match", "Cannot end set when scores are tied.");
       return;
    }
    showConfirm(
      "End Set?", 
      "This will increment the winner's sets and reset scores to 0.",
      async () => {
        await convex.mutation(api.games.endSet, { gameId: game._id, editorSecret: secret, actorDeviceId: deviceId });
      },
      "End Set"
    );
  }

  async function rename(side: 'left' | 'right') {
    if (!isCreator || !game || game.status !== 'live') return;
    const current = side === 'left' ? game.leftTeamName : game.rightTeamName;
    
    renameModal = {
      open: true,
      title: `Rename ${side.toUpperCase()} Team`,
      initialValue: current,
      theme: side === 'left' ? 'red' : 'blue',
      onConfirm: async (newName: string) => {
        if (newName && newName.trim() !== current) {
          await convex.mutation(api.games.renameTeam, {
             gameId: game._id, side, newName: newName.trim(), editorSecret: secret, actorDeviceId: deviceId
          });
        }
      }
    };
  }

  async function toggleStatus() {
    if (!isCreator || !game) return;
    if (game.status === 'live') {
      showConfirm(
        "End Game?",
        "Are you sure you want to finalize and end this game?",
        async () => {
          await convex.mutation(api.games.end, { gameId: game._id, editorSecret: secret, actorDeviceId: deviceId });
        },
        "End Game"
      );
    } else {
      showConfirm(
        "Reopen Game?",
        "Are you sure you want to reopen this game for scoring?",
        async () => {
          await convex.mutation(api.games.reopen, { gameId: game._id, editorSecret: secret, actorDeviceId: deviceId });
        },
        "Reopen"
      );
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    alert("Link copied!");
  }
</script>

{#if gameQuery.isLoading}
  <div class="center-msg">Loading game...</div>
{:else if gameQuery.error}
  <div class="center-msg error">Error loading game.</div>
{:else if !game}
  <div class="center-msg error">Game not found.</div>
{:else}
  <div class="game-container animate-fade-in {game.status}">
    <div class="overlay-top-left">
      <a href="/" class="btn-icon">← Home</a>
    </div>

    {#if !isCreator}
      <div class="spectator-banner">Spectator Mode (Read-Only)</div>
    {/if}

    <main class="board">
      <div class="board-divider"></div>

      <!-- LEFT TEAM -->
      <div 
        class="team-side left" 
        role="button" 
        tabindex="0"
        onclick={() => score('left', 1)}
        onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && score('left', 1)}
      >
        <button class="name-btn" onclick={(e) => { e.stopPropagation(); rename('left'); }} disabled={!isCreator || game.status !== 'live'}>
          <span class="name-text">{game.leftTeamName}</span>
        </button>

        <div class="score-display">
          {game.leftScore}
        </div>

        {#if isCreator && game.status === 'live'}
           <div class="undo-action">
              <button class="minus-btn" aria-label="Undo point" onclick={(e) => { e.stopPropagation(); score('left', -1); }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="84" height="84" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                  <path d="M3 3v5h5"></path>
                </svg>
              </button>
           </div>
        {/if}
      </div>

      <!-- RIGHT TEAM -->
      <div 
        class="team-side right" 
        role="button" 
        tabindex="0"
        onclick={() => score('right', 1)}
        onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && score('right', 1)}
      >
        <button class="name-btn" onclick={(e) => { e.stopPropagation(); rename('right'); }} disabled={!isCreator || game.status !== 'live'}>
          <span class="name-text">{game.rightTeamName}</span>
        </button>

        <div class="score-display">
          {game.rightScore}
        </div>

        {#if isCreator && game.status === 'live'}
           <div class="undo-action">
              <button class="minus-btn" aria-label="Undo point" onclick={(e) => { e.stopPropagation(); score('right', -1); }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="84" height="84" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                  <path d="M3 3v5h5"></path>
                </svg>
              </button>
           </div>
        {/if}
      </div>
    </main>

    <div class="set-pill-container">
      <div class="set-pill">
        <div class="set-pill-scores">
          <span class="set-score left">{game.leftSets}</span>
          <div class="set-divider"></div>
          <span class="set-score right">{game.rightSets}</span>
        </div>
        <button 
          class="set-pill-label" 
          onclick={endCurrentSet}
          disabled={!isCreator || game.status !== 'live'}
        >
          END SET
        </button>
      </div>
    </div>

    <!-- FLOATING STATUS & ACTIONS -->
    <div class="overlay-bottom-left">
      <div class="status-badge {game.status}">
        {game.status === 'live' ? 'LIVE' : 'FINISHED'}
      </div>
    </div>

    <div class="overlay-bottom-right actions">
      <button onclick={() => isHistoryOpen = true} class="btn-secondary">History</button>
      <button onclick={copyLink} class="btn-secondary">Share</button>
      {#if isCreator}
         <button onclick={toggleStatus} class="btn-secondary status-toggle">
           {game.status === 'live' ? 'End Game' : 'Reopen'}
         </button>
      {/if}
    </div>
  </div>

  <HistoryDrawer 
    isOpen={isHistoryOpen} 
    close={() => isHistoryOpen = false} 
    events={eventsQuery.data?.page || []} 
  />

  <ConfirmModal 
    isOpen={modal.open}
    title={modal.title}
    message={modal.message}
    onConfirm={modal.onConfirm}
    onCancel={() => modal.open = false}
    confirmText={modal.confirmText}
    cancelText={modal.cancelText}
  />
  
  <RenameModal
    isOpen={renameModal.open}
    title={renameModal.title}
    initialValue={renameModal.initialValue}
    theme={renameModal.theme}
    onConfirm={renameModal.onConfirm}
    onCancel={() => renameModal.open = false}
  />
{/if}

<style>
  .center-msg {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    font-size: 1.5rem;
    color: var(--text-secondary);
  }
  .game-container {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background: var(--bg-color);
  }
  .game-container.finished .board {
    opacity: 0.8;
  }
  
  .overlay-top-left {
    position: absolute;
    top: 1rem;
    left: 1rem;
    z-index: 50;
  }
  .overlay-bottom-left {
    position: absolute;
    bottom: 1.5rem;
    left: 1.5rem;
    z-index: 50;
  }
  .overlay-bottom-right {
    position: absolute;
    bottom: 1.5rem;
    right: 1.5rem;
    z-index: 50;
  }
  
  .actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  
  .btn-icon {
    color: var(--text-primary);
    text-decoration: none;
    font-weight: bold;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    background: rgba(255,255,255,0.05);
  }
  .btn-icon:hover { background: rgba(255,255,255,0.1); }
  
  .status-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-weight: bold;
    font-size: 0.85rem;
    letter-spacing: 1px;
    display: inline-block;
  }
  .status-badge.live {
    background: rgba(34, 197, 94, 0.2); /* green now */
    color: #4ade80;
    box-shadow: 0 0 10px rgba(34, 197, 94, 0.3);
  }
  .status-badge.finished {
    background: var(--surface-color-hover);
    color: var(--text-tertiary);
  }
  
  .spectator-banner {
    background: rgba(59, 130, 246, 0.15);
    color: var(--accent-blue);
    text-align: center;
    padding: 0.5rem;
    font-weight: bold;
    font-size: 0.9rem;
    border-bottom: 1px solid rgba(59, 130, 246, 0.2);
  }

  .board {
    flex: 1;
    display: flex;
    position: relative;
    overflow: hidden;
  }
  .board-divider {
    position: absolute;
    top: 0; bottom: 0; left: 50%;
    width: 4px;
    background: var(--bg-color); /* Deep black dividing line */
    transform: translateX(-50%);
    z-index: 10;
  }
  @media (max-width: 768px) {
    .board {
      flex-direction: column;
    }
    .board-divider {
      top: 50%; bottom: auto; left: 0; right: 0;
      width: 100%; height: 4px;
      transform: translateY(-50%);
    }
  }

  .team-side {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    transition: background 0.2s, transform 0.1s;
    cursor: pointer;
    position: relative;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }
  .team-side:active {
    transform: scale(0.99);
  }
  .team-side.left {
    background: #450a0a; /* dark red */
  }
  .team-side.left .score-display {
    color: white;
    text-shadow: 0 0 20px rgba(0,0,0,0.5);
  }
  .team-side.right {
    background: #172554; /* dark blue */
  }
  .team-side.right .score-display {
    color: white;
    text-shadow: 0 0 20px rgba(0,0,0,0.5);
  }

  .name-btn {
    position: absolute;
    top: 4rem;
    background: transparent;
    font-size: 5rem;
    font-weight: 800;
    color: white;
    padding: 0.5rem 1rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    border-radius: 12px;
    text-shadow: 0 0 10px rgba(0,0,0,0.5);
    z-index: 10;
  }
  @media (max-width: 768px) {
    .name-btn { font-size: 3rem; gap: 0.5rem; padding: 0.25rem 0.5rem; top: 1rem; }
  }
  .name-btn:hover:not(:disabled) {
    background: rgba(255,255,255,0.1);
  }

  .name-btn:hover:not(:disabled) {
    background: rgba(255,255,255,0.1);
  }
  
  .score-display {
    background: transparent;
    font-size: 25vw;
    line-height: 1;
    font-weight: 900;
    color: var(--text-primary);
    padding: 2rem;
    border-radius: 24px;
    width: 100%;
    text-align: center;
    transition: transform 0.1s, background 0.2s;
  }
  @media (max-width: 768px) {
    .score-display { font-size: 40vw; padding: 1rem; }
  }
  .score-display:hover:not(:disabled) {
    background: rgba(255,255,255,0.03);
    transform: scale(1.02);
  }
  .score-display:active:not(:disabled) {
    transform: scale(0.98);
  }
  .undo-action {
    position: absolute;
    top: 2rem;
    right: 2rem;
    z-index: 20;
  }

  .minus-btn {
    background: rgba(255,255,255,0.05);
    color: white;
    border: 2px solid transparent;
    width: 120px;
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s;
  }
  .minus-btn:hover { background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.4); transform: scale(1.05); }
  .minus-btn:active { transform: scale(0.95); }

  .team-side.left .minus-btn {
    background: rgba(0,0,0,0.3);
    border-color: rgba(255,255,255,0.2);
  }
  .team-side.right .minus-btn {
    background: rgba(0,0,0,0.3);
    border-color: rgba(255,255,255,0.2);
  }

  .set-pill-container {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    z-index: 100;
  }

  .set-pill {
    background: white;
    border: 4px solid var(--bg-color);
    border-bottom: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow: hidden;
    box-shadow: 0 -4px 20px rgba(0,0,0,0.3);
  }
  @media (max-width: 768px) {
    .set-pill {
    }
  }

  .set-pill-scores {
    display: flex;
    align-items: center;
    background: white;
  }

  .set-score {
    font-size: 6rem;
    font-weight: 900;
    padding: 1.5rem 3rem;
    color: #000;
  }
  @media (max-width: 768px) {
    .set-score { font-size: 4rem; padding: 1rem 2rem; }
  }

  .set-divider {
    width: 2px;
    height: 128px;
    background: var(--bg-color);
  }
  @media (max-width: 768px) {
    .set-divider { height: 90px; }
  }

  .set-pill-label {
    width: 100%;
    text-align: center;
    font-size: 1.8rem;
    font-weight: 800;
    letter-spacing: 6px;
    color: #000;
    border-top: 4px solid var(--bg-color);
    background: white;
    padding: 1rem 0;
    cursor: pointer;
    transition: background 0.1s;
    border-left: none;
    border-right: none;
    border-bottom: none;
  }
  
  .set-pill-label:hover:not(:disabled) {
    background: #e2e8f0;
  }
</style>
