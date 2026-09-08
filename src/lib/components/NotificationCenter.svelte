<script>
  /**
   * Meldungsflaeche und Rueckfrage-Dialog.
   *
   * Ersetzt window.alert und window.confirm: blockiert nichts, laesst sich mit
   * der Tastatur bedienen und haelt automatisierte Laeufe nicht an.
   */
  import { notifications, dismiss, pendingConfirm } from '../stores/notificationStore';

  /** Aufgeklappte Detaillisten, nach Meldungs-Id. */
  let expanded = {};

  function toggle(id) {
    expanded = { ...expanded, [id]: !expanded[id] };
  }

  const ICON = {
    info: 'i',
    success: '✓',
    warning: '!',
    error: '×',
  };

  const ROLE = {
    info: 'status',
    success: 'status',
    warning: 'alert',
    error: 'alert',
  };

  function onConfirmKeydown(event) {
    if (!$pendingConfirm) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      $pendingConfirm.resolve(false);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      $pendingConfirm.resolve(true);
    }
  }

  /** Fokus auf die Bestaetigung legen, sobald der Dialog erscheint. */
  function autofocus(node) {
    node.focus();
    return {};
  }
</script>

<svelte:window on:keydown={onConfirmKeydown} />

<!-- Meldungen -->
<div class="notification-area" aria-live="polite">
  {#each $notifications as n (n.id)}
    <div class="notification {n.level}" role={ROLE[n.level] || 'status'}>
      <span class="badge" aria-hidden="true">{ICON[n.level] || 'i'}</span>
      <div class="body">
        <div class="title">{n.title}</div>
        {#if n.message}<div class="message">{n.message}</div>{/if}
        {#if n.details && n.details.length}
          <button class="details-toggle" on:click={() => toggle(n.id)}>
            {expanded[n.id] ? 'Einzelheiten ausblenden' : `Einzelheiten (${n.details.length})`}
          </button>
          {#if expanded[n.id]}
            <ul class="details">
              {#each n.details as d}<li>{d}</li>{/each}
            </ul>
          {/if}
        {/if}
      </div>
      <button class="close" on:click={() => dismiss(n.id)} aria-label="Meldung schliessen">&times;</button>
    </div>
  {/each}
</div>

<!-- Rueckfrage -->
{#if $pendingConfirm}
  <div class="confirm-backdrop" on:click={() => $pendingConfirm.resolve(false)} role="presentation"></div>
  <div class="confirm" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
    <h2 id="confirm-title">{$pendingConfirm.title}</h2>
    {#if $pendingConfirm.message}<p>{$pendingConfirm.message}</p>{/if}
    <div class="confirm-buttons">
      <button class="secondary" on:click={() => $pendingConfirm.resolve(false)}>
        {$pendingConfirm.cancelLabel}
      </button>
      <button
        class="primary"
        class:destructive={$pendingConfirm.destructive}
        use:autofocus
        on:click={() => $pendingConfirm.resolve(true)}
      >
        {$pendingConfirm.confirmLabel}
      </button>
    </div>
  </div>
{/if}

<style>
  .notification-area {
    position: fixed;
    right: 16px;
    bottom: 16px;
    z-index: 2000;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: 420px;
    pointer-events: none;
  }

  .notification {
    pointer-events: auto;
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 10px 12px;
    border-radius: 6px;
    border-left: 4px solid var(--accent, #666);
    background: #ffffff;
    color: #1a1a1a;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
    font-size: 13px;
    line-height: 1.4;
  }

  .notification.info { --accent: #2f6fed; }
  .notification.success { --accent: #1f9254; }
  .notification.warning { --accent: #c07800; }
  .notification.error { --accent: #c0392b; }

  .badge {
    flex: 0 0 18px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--accent);
    color: #fff;
    font-weight: 700;
    font-size: 12px;
    line-height: 18px;
    text-align: center;
  }

  .body { flex: 1 1 auto; min-width: 0; }
  .title { font-weight: 600; }
  .message { margin-top: 2px; }

  .details-toggle {
    margin-top: 6px;
    padding: 0;
    border: none;
    background: none;
    color: var(--accent);
    font-size: 12px;
    text-decoration: underline;
    cursor: pointer;
  }

  .details {
    margin: 6px 0 0;
    padding-left: 16px;
    max-height: 220px;
    overflow-y: auto;
    font-size: 12px;
    color: #444;
  }
  .details li { margin-bottom: 3px; word-break: break-word; }

  .close {
    flex: 0 0 auto;
    border: none;
    background: none;
    font-size: 18px;
    line-height: 1;
    color: #888;
    cursor: pointer;
    padding: 0 2px;
  }
  .close:hover { color: #222; }

  .confirm-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
    z-index: 2100;
  }

  .confirm {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 2101;
    width: min(420px, calc(100vw - 32px));
    padding: 18px 20px;
    border-radius: 8px;
    background: #fff;
    color: #1a1a1a;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
    font-size: 14px;
  }

  .confirm h2 { margin: 0 0 8px; font-size: 16px; }
  .confirm p { margin: 0 0 16px; line-height: 1.45; }

  .confirm-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .confirm-buttons button {
    padding: 7px 14px;
    border-radius: 4px;
    border: 1px solid #c8c8c8;
    background: #f5f5f5;
    font-size: 13px;
    cursor: pointer;
  }
  .confirm-buttons .primary {
    border-color: #2f6fed;
    background: #2f6fed;
    color: #fff;
  }
  .confirm-buttons .primary.destructive {
    border-color: #c0392b;
    background: #c0392b;
  }
  .confirm-buttons button:focus-visible {
    outline: 2px solid #1a1a1a;
    outline-offset: 2px;
  }
</style>
