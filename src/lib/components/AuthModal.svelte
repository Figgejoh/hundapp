<script>
  import { supabase } from '$lib/supabase';

  let { onClose, onAuth } = $props();

  let mode = $state('login'); // 'login' | 'signup'
  let email = $state('');
  let password = $state('');
  let error = $state('');
  let loading = $state(false);

  async function submit() {
    error = '';
    loading = true;
    const fn = mode === 'login'
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password });
    const { data, error: err } = await fn;
    loading = false;
    if (err) { error = err.message; return; }
    onAuth(data.user ?? data.session?.user);
    onClose();
  }
</script>

<div
  class="overlay"
  role="button"
  tabindex="0"
  onclick={onClose}
  onkeydown={(e) => e.key === 'Escape' && onClose()}
>
  <div
    class="modal"
    role="dialog"
    tabindex="-1"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
  >
    <h2>{mode === 'login' ? 'Logga in' : 'Skapa konto'}</h2>

    {#if error}
      <p class="error">{error}</p>
    {/if}

    <input type="email" placeholder="E-post" bind:value={email} />
    <input type="password" placeholder="Lösenord" bind:value={password}
      onkeydown={(e) => e.key === 'Enter' && submit()} />

    <button class="submit-btn" onclick={submit} disabled={loading || !email || !password}>
      {loading ? 'Laddar...' : mode === 'login' ? 'Logga in' : 'Skapa konto'}
    </button>

    <button class="toggle-btn" onclick={() => { mode = mode === 'login' ? 'signup' : 'login'; error = ''; }}>
      {mode === 'login' ? 'Inget konto? Skapa ett' : 'Har redan konto? Logga in'}
    </button>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.4);
    backdrop-filter: blur(4px);
    z-index: 3000;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal {
    background: rgba(255,255,255,0.92);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255,255,255,0.7);
    border-radius: 20px;
    padding: 28px 24px;
    width: 90%;
    max-width: 360px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.2);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  h2 {
    margin: 0 0 4px;
    font-size: 20px;
    font-weight: 700;
    color: #1a1a1a;
  }

  .error {
    margin: 0;
    font-size: 13px;
    color: #c62828;
    background: rgba(244,67,54,0.08);
    padding: 8px 12px;
    border-radius: 8px;
  }

  input {
    width: 100%;
    padding: 11px 14px;
    border: 1px solid rgba(0,0,0,0.12);
    border-radius: 50px;
    font-size: 15px;
    outline: none;
    background: rgba(255,255,255,0.7);
    font-family: inherit;
    box-sizing: border-box;
    transition: border-color 0.15s;
  }

  input:focus {
    border-color: #4CAF50;
  }

  .submit-btn {
    width: 100%;
    padding: 12px;
    border-radius: 50px;
    border: none;
    background: #4CAF50;
    color: white;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }

  .submit-btn:hover:not(:disabled) {
    background: #43a047;
  }

  .submit-btn:disabled {
    background: #ccc;
    cursor: default;
  }

  .toggle-btn {
    background: none;
    border: none;
    color: #4CAF50;
    font-size: 13px;
    cursor: pointer;
    text-align: center;
    text-decoration: underline;
    padding: 0;
  }
</style>
