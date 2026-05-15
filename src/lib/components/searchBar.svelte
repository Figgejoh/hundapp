<script>
  let { value = $bindable(""), onSearch } = $props();
</script>

<div class="search-box">
  <input
    type="text"
    placeholder="Sök badplats..."
    bind:value
    onkeydown={(e) => e.key === "Enter" && onSearch()}
  />
  <button onclick={onSearch}>Sök</button>
</div>

<style>
  .search-box {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border-radius: 50px;
    background: rgba(255, 255, 255, 0.55);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border: 1px solid rgba(255, 255, 255, 0.7);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  }

  input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 15px;
    outline: none;
    min-width: 0;
    color: #1a1a1a;
  }

  input::placeholder {
    color: rgba(0, 0, 0, 0.4);
  }

  button {
    flex-shrink: 0;
    padding: 6px 16px;
    border: none;
    border-radius: 50px;
    background: #4CAF50;
    color: white;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }

  button:hover {
    background: #43a047;
  }

  @media (max-width: 600px) {
    .search-box {
      padding: 8px 12px;
    }

    input {
      font-size: 13px;
    }

    button {
      padding: 5px 12px;
      font-size: 12px;
    }
  }
</style>