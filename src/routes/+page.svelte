<script lang="ts">
  import { convex, createQuery } from "$lib/convex.svelte";
  import { generateSecret, getOrCreateDeviceId, setEditorSecret } from "$lib/auth";
  import { goto } from "$app/navigation";

  const api: any = {
    games: {
      listActive: "games:listActive",
      searchArchive: "games:searchArchive",
      create: "games:create"
    }
  };

  let leftTeam = $state("");
  let rightTeam = $state("");
  let isCreating = $state(false);

  let searchQ = $state("");
  let searchDate = $state("");
  
  const activeGames = createQuery(api.games.listActive, () => ({ limit: 10 }));
  const searchResults = createQuery(api.games.searchArchive, () => ({ 
    query: searchQ, 
    date: searchDate || undefined, 
    limit: 10 
  }));

  let liveGames = $derived(activeGames.data?.page || []);
  let hasLiveGames = $derived(activeGames.isLoading || liveGames.length > 0);

  async function handleCreate(e: Event) {
    e.preventDefault();
    if (!leftTeam.trim() || !rightTeam.trim()) return;
    
    isCreating = true;
    try {
      const secret = generateSecret();
      const deviceId = getOrCreateDeviceId();
      
      const res = await convex.mutation(api.games.create, {
        leftTeamName: leftTeam.trim(),
        rightTeamName: rightTeam.trim(),
        creatorDeviceId: deviceId,
        editorSecret: secret
      });
      
      setEditorSecret(res.gameCode, secret);
      goto(`/game/${res.gameCode}`);
    } catch (e) {
      console.error(e);
      alert("Failed to create game");
    } finally {
      isCreating = false;
    }
  }
</script>

<div class="sports-layout animate-fade-in">
  <header class="app-header">
    <div class="logo">SCORE<span class="logo-accent">BOARD</span></div>
  </header>

  <main class="main-content">
    
    <!-- Hero / Create Match -->
    <section class="hero-panel">
      <div class="hero-content">
        <h1 class="hero-headline">START A NEW MATCH</h1>
        <form class="match-form" onsubmit={handleCreate}>
          <div class="team-inputs">
            <div class="input-wrapper">
              <input type="text" bind:value={leftTeam} placeholder="RED" required class="team-input bg-dark-red" />
              <svg class="edit-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </div>
            <div class="vs-circle">VS</div>
            <div class="input-wrapper">
              <input type="text" bind:value={rightTeam} placeholder="BLUE" required class="team-input bg-dark-blue" />
              <svg class="edit-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </div>
          </div>
          <button type="submit" class="launch-btn" disabled={isCreating || !leftTeam || !rightTeam}>
            {isCreating ? 'STARTING...' : 'GO LIVE'}
          </button>
        </form>
      </div>
    </section>

    <div class="dashboard-grid">

      {#if hasLiveGames}
      <!-- Active Games -->
      <section class="dashboard-section">
        <h2 class="section-title">
          <span class="live-dot"></span>
          LIVE MATCHES
        </h2>
        
        <div class="match-list-container">
          {#if activeGames.isLoading}
            <div class="empty-msg">Loading matches...</div>
          {:else}
            <div class="match-cards">
              {#each liveGames as game (game._id)}
                <a href={`/game/${game.gameCode}`} class="match-card">
                  <div class="card-top">
                    <span class="match-date">{new Date(game.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div class="card-scores">
                    <div class="team-score">
                      <span class="team-name">{game.leftTeamName}</span>
                      <span class="score-number">{game.leftScore}</span>
                    </div>
                    <div class="score-divider">-</div>
                    <div class="team-score right-align">
                      <span class="score-number">{game.rightScore}</span>
                      <span class="team-name">{game.rightTeamName}</span>
                    </div>
                  </div>
                </a>
              {/each}
            </div>
          {/if}
        </div>
      </section>
      {/if}

      <!-- Finished Games -->
      <section class="dashboard-section" class:full-width={!hasLiveGames}>
        <h2 class="section-title">MATCH ARCHIVE</h2>
        
        <div class="search-container">
          <input 
            type="text" 
            bind:value={searchQ} 
            placeholder="Search teams (e.g., Red vs Blue)" 
            class="search-input text-search"
          />
          <input 
            type="date" 
            bind:value={searchDate} 
            class="search-input date-search"
          />
        </div>

        <div class="match-list-container">
          {#if searchResults.isLoading}
            <div class="empty-msg">Searching logs...</div>
          {:else}
             {@const results = searchResults.data?.page || []}
             {#if results.length === 0}
               <div class="empty-msg">No matches found.</div>
             {:else}
               <div class="match-cards">
                 {#each results as game (game._id)}
                   <a href={`/game/${game.gameCode}`} class="match-card archived">
                     <div class="card-top">
                       <span class="match-date">{new Date(game.endedAt || game.createdAt).toLocaleDateString()}</span>
                       <span class="archived-badge">FINAL</span>
                     </div>
                      <div class="card-scores">
                       <div class="team-score">
                         <span class="team-name">{game.leftTeamName}</span>
                         {#if game.leftSets > 0 || game.rightSets > 0}
                           <span class="score-number">{game.leftSets}</span>
                         {:else}
                           <span class="score-number">{game.leftScore}</span>
                         {/if}
                       </div>
                       
                       <div class="score-divider">
                         {#if game.leftSets > 0 || game.rightSets > 0}
                           <span class="set-label">SETS</span>
                         {:else}
                           -
                         {/if}
                       </div>
                       
                       <div class="team-score right-align">
                         {#if game.leftSets > 0 || game.rightSets > 0}
                           <span class="score-number">{game.rightSets}</span>
                         {:else}
                           <span class="score-number">{game.rightScore}</span>
                         {/if}
                         <span class="team-name">{game.rightTeamName}</span>
                       </div>

                       {#if game.leftSets > 0 || game.rightSets > 0}
                         <!-- Expanded Points Display -->
                         <div class="points-divider">|</div>
                         <div class="points-display">
                           <span class="minor-score">{game.leftScore}</span>
                           <span class="minor-divider">-</span>
                           <span class="minor-score">{game.rightScore}</span>
                         </div>
                       {/if}
                     </div>
                   </a>
                 {/each}
               </div>
             {/if}
          {/if}
        </div>
      </section>
    </div>
  </main>
</div>

<style>
  .sports-layout {
    min-height: 100vh;
    background-color: var(--bg-color); /* Dark, #0f1115 */
    color: white;
    font-family: 'Outfit', sans-serif;
    padding: 0;
    margin: 0;
  }

  .app-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 3rem;
    background: #1a1d24;
    border-bottom: 1px solid #2a2e38;
  }
  @media (max-width: 600px) {
    .app-header { flex-direction: column; gap: 0.5rem; padding: 1rem; text-align: center; }
  }

  .logo {
    font-size: 2rem;
    font-weight: 900;
    letter-spacing: -1px;
    margin: 0;
  }
  .logo-accent {
    color: #ef4444; /* bold red */
  }

  .main-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 3rem 2rem;
    display: flex;
    flex-direction: column;
    gap: 3rem;
  }

  /* Hero / Create */
  .hero-panel {
    background: #1a1d24;
    border-radius: 20px;
    padding: 3rem;
    border: 1px solid #2a2e38;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  }
  @media (max-width: 768px) {
    .hero-panel { padding: 1.5rem; }
  }

  .hero-headline {
    text-align: center;
    font-size: 2.5rem;
    font-weight: 900;
    margin: 0 0 2rem;
    letter-spacing: -1px;
  }

  .match-form {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
    max-width: 800px;
    margin: 0 auto;
  }

  .team-inputs {
    display: flex;
    width: 100%;
    align-items: stretch;
    background: #0f1115;
    border-radius: 100px;
    padding: 0.5rem;
    position: relative;
    border: 1px solid #2a2e38;
  }
  @media (max-width: 768px) {
    .team-inputs { flex-direction: column; border-radius: 20px; gap: 0.5rem; background: transparent; border: none; padding: 0; }
  }

  .team-input {
    flex: 1;
    border: none;
    padding: 1.5rem 2rem;
    font-size: 1.25rem;
    font-weight: 800;
    color: white;
    text-align: center;
    text-transform: uppercase;
    outline: none;
  }
  .team-input::placeholder {
    color: rgba(255,255,255,0.4);
  }
  .bg-dark-red {
    background-color: #450a0a;
    border-radius: 100px 0 0 100px;
  }
  .bg-dark-blue {
    background-color: #172554;
    border-radius: 0 100px 100px 0;
  }
  @media (max-width: 768px) {
    .bg-dark-red { border-radius: 16px; }
    .bg-dark-blue { border-radius: 16px; }
  }

  .vs-circle {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 50px;
    height: 50px;
    background: white;
    color: black;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 900;
    font-size: 1.25rem;
    z-index: 10;
    box-shadow: 0 4px 10px rgba(0,0,0,0.3);
  }
  @media (max-width: 768px) {
    .vs-circle { display: none; }
  }

  .launch-btn {
    background: white;
    color: black;
    border: none;
    padding: 1rem 4rem;
    font-size: 1.25rem;
    font-weight: 900;
    border-radius: 100px;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 2px;
    transition: transform 0.2s, background 0.2s;
  }
  .launch-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    background: #f1f5f9;
  }
  .launch-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Grid Layouts for Active / History */
  .dashboard-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3rem;
  }
  @media (max-width: 900px) {
    .dashboard-grid { grid-template-columns: 1fr; }
  }

  .dashboard-section {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  .dashboard-section.full-width {
    grid-column: 1 / -1;
  }

  .section-title {
    font-size: 1.25rem;
    font-weight: 800;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    letter-spacing: 1px;
    color: #e2e8f0;
  }

  .live-dot {
    width: 12px;
    height: 12px;
    background-color: #22c55e;
    border-radius: 50%;
    animation: blink 2s infinite;
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .search-container {
    width: 100%;
    display: flex;
    gap: 1rem;
  }
  @media (max-width: 600px) {
    .search-container { flex-direction: column; }
  }
  .search-input {
    padding: 1.25rem 1.5rem;
    background: #1a1d24;
    border: 1px solid #2a2e38;
    border-radius: 16px;
    color: white;
    font-size: 1.1rem;
    font-family: inherit;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.2s;
  }
  .search-input.text-search {
    flex: 1;
  }
  .search-input.date-search {
    width: auto;
    color-scheme: dark;
  }
  .search-input:focus {
    border-color: #475569;
  }

  .match-list-container {
    background: #1a1d24;
    border-radius: 20px;
    border: 1px solid #2a2e38;
    min-height: 200px;
    padding: 1.5rem;
  }

  .empty-msg {
    text-align: center;
    color: #64748b;
    font-weight: 500;
    padding: 2rem 0;
  }

  .match-cards {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .match-card {
    display: flex;
    flex-direction: column;
    padding: 1.25rem;
    background: #0f1115;
    border: 1px solid #2a2e38;
    border-radius: 12px;
    text-decoration: none;
    color: white;
    transition: border-color 0.2s, transform 0.1s;
  }
  .match-card:hover {
    border-color: #475569;
    transform: translateY(-2px);
  }

  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  .match-date {
    font-size: 0.85rem;
    font-weight: 800;
    color: #64748b;
  }
  .archived-badge {
    font-size: 0.75rem;
    font-weight: 800;
    background: #334155;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    color: #cbd5e1;
  }

  .card-scores {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 1rem;
    background: #1a1d24;
    border-radius: 8px;
  }

  .team-score {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex: 1;
  }
  .team-score.right-align {
    justify-content: flex-end;
  }

  .team-name {
    font-weight: 700;
    font-size: 1.1rem;
    color: #f8fafc;
    text-transform: uppercase;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .score-number {
    font-size: 2rem;
    font-weight: 900;
    min-width: 2rem;
    text-align: center;
    line-height: 1;
  }
  
  .points-divider {
    font-size: 1.5rem;
    color: #334155;
    margin: 0 0.5rem 0 1rem;
    font-weight: 300;
  }
  
  .points-display {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #0f1115;
    padding: 0.25rem 0.75rem;
    border-radius: 8px;
    border: 1px solid #1e293b;
  }

  .minor-score {
    font-size: 1.1rem;
    color: #94a3b8;
    font-weight: 700;
  }
  
  .minor-divider {
    color: #475569;
    font-weight: 700;
    font-size: 0.9rem;
  }

  .score-divider {
    font-weight: 900;
    color: #475569;
    padding: 0 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .set-label {
    font-size: 0.9rem;
    letter-spacing: 1px;
    color: #94a3b8;
  }
  
  @media (max-width: 768px) {
    .points-divider, .points-display {
      display: none;
    }
  }
</style>
