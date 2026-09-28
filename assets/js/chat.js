// Asistente de IA del monitor ("Pregúntale al monitor").
//
// Envía la conversación a /api/chat (Gemini, en el servidor) y muestra la
// respuesta con botones que llevan a la sección del sitio que la respalda.
//
// Dos modos de presentación:
//   - Sitio abierto directamente: botón flotante abajo a la derecha.
//   - Embebido en el iframe de WordPress: el iframe mide lo mismo que el
//     contenido, así que un elemento `position: fixed` quedaría al fondo del
//     monitor. El botón va en la barra superior y el panel se abre debajo.

const SUGGESTIONS = [
  '¿Cuál es la brecha salarial entre mujeres y hombres en México?',
  '¿Qué estado tiene la mayor brecha salarial?',
  '¿Cómo ha cambiado la participación económica de las mujeres?',
  '¿Cuántas mujeres estudian carreras STEM?',
];

const MAX_HISTORY = 8;

export function createChat({ navigate, track, escapeHtml }) {
  const embedded = window.parent !== window;
  const history = [];
  let busy = false;

  const launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.className = `chat-launcher${embedded ? ' chat-launcher--inline' : ''}`;
  launcher.setAttribute('aria-expanded', 'false');
  launcher.setAttribute('aria-controls', 'chat-panel');
  launcher.innerHTML = '<span class="chat-launcher-icon" aria-hidden="true">✦</span><span>Pregúntale al monitor</span>';

  const panel = document.createElement('section');
  panel.id = 'chat-panel';
  panel.className = `chat-panel${embedded ? ' chat-panel--inline' : ''}`;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Asistente del monitor');
  panel.hidden = true;
  panel.innerHTML = `
    <header class="chat-head">
      <div>
        <p class="chat-title"><span aria-hidden="true">✦</span> Asistente del monitor</p>
        <p class="chat-subtitle">Responde con los datos de este sitio</p>
      </div>
      <button type="button" class="chat-close" data-role="close" aria-label="Cerrar asistente">×</button>
    </header>
    <div class="chat-log" data-role="log" aria-live="polite">
      <div class="chat-msg chat-msg--bot">
        <p>Hola. Pregúntame sobre los datos del monitor: participación económica, brecha salarial, informalidad, cuidados, STEM, estados o alcaldías de la CDMX. Te llevo a la gráfica que responde tu pregunta.</p>
      </div>
      <div class="chat-suggestions" data-role="suggestions">
        ${SUGGESTIONS.map((q) => `<button type="button" class="chat-chip">${escapeHtml(q)}</button>`).join('')}
      </div>
    </div>
    <form class="chat-form" data-role="form">
      <textarea class="chat-input" data-role="input" rows="1" maxlength="600"
        placeholder="Escribe tu pregunta…" aria-label="Tu pregunta"></textarea>
      <button type="submit" class="chat-send" data-role="send" aria-label="Enviar pregunta">➤</button>
    </form>
    <p class="chat-disclaimer">Respuestas generadas con IA (Google Gemini): pueden contener errores. Verifica las cifras en las gráficas.</p>
  `;

  const $ = (role) => panel.querySelector(`[data-role="${role}"]`);
  const log = $('log');
  const form = $('form');
  const input = $('input');
  const send = $('send');

  if (embedded) {
    const topbar = document.querySelector('.topbar');
    topbar?.appendChild(launcher);
    (topbar?.parentElement || document.body).insertBefore(panel, topbar?.nextSibling || null);
  } else {
    document.body.append(launcher, panel);
  }

  const setOpen = (open) => {
    panel.hidden = !open;
    launcher.setAttribute('aria-expanded', open ? 'true' : 'false');
    launcher.classList.toggle('is-open', open);
    if (open) {
      track('chat_open');
      if (embedded) {
        // Justo debajo de la barra superior, flotando sobre el contenido.
        const topbar = document.querySelector('.topbar');
        const base = panel.offsetParent || document.body;
        if (topbar) {
          const top = topbar.getBoundingClientRect().bottom - base.getBoundingClientRect().top + 10;
          panel.style.top = `${Math.round(top)}px`;
        }
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      window.setTimeout(() => input.focus(), 50);
    }
  };

  launcher.addEventListener('click', () => setOpen(panel.hidden));
  $('close').addEventListener('click', () => {
    setOpen(false);
    launcher.focus();
  });
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setOpen(false);
      launcher.focus();
    }
  });

  $('suggestions').addEventListener('click', (event) => {
    const chip = event.target.closest('.chat-chip');
    if (chip) ask(chip.textContent);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    ask(input.value);
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      ask(input.value);
    }
  });
  // El campo crece con el texto hasta cuatro líneas.
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 110)}px`;
  });

  function addMessage(role, html) {
    const node = document.createElement('div');
    node.className = `chat-msg chat-msg--${role}`;
    node.innerHTML = html;
    log.appendChild(node);
    log.scrollTop = log.scrollHeight;
    return node;
  }

  // Mensaje de error con botón para reenviar la misma pregunta: la saturación de
  // la capa gratuita de Gemini suele durar solo unos segundos.
  function showError(message, question, retryable) {
    const node = addMessage('bot chat-msg--error', `
      <p>${escapeHtml(message)}</p>
      ${retryable ? '<button type="button" class="chat-retry">Reintentar</button>' : ''}`);
    node.querySelector('.chat-retry')?.addEventListener('click', () => {
      node.remove();
      log.querySelectorAll('.chat-msg--user').forEach((m, i, all) => { if (i === all.length - 1) m.remove(); });
      track('chat_retry');
      ask(question);
    });
  }

  async function ask(rawText) {
    const text = String(rawText || '').trim();
    if (!text || busy) return;
    busy = true;
    send.disabled = true;
    input.value = '';
    input.style.height = 'auto';
    $('suggestions')?.remove();

    addMessage('user', `<p>${escapeHtml(text)}</p>`);
    history.push({ role: 'user', text });
    const typing = addMessage('bot', '<span class="chat-typing" aria-label="Escribiendo"><i></i><i></i><i></i></span>');
    track('chat_question', { length: text.length });

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.slice(-MAX_HISTORY) }),
      });
      const json = await res.json().catch(() => ({}));
      typing.remove();
      if (!res.ok || !json.answer) {
        history.pop();
        showError(json.error || 'No pude responder en este momento. Inténtalo de nuevo.', text, res.status !== 400);
        return;
      }
      history.push({ role: 'model', text: json.answer });
      const links = Array.isArray(json.links) ? json.links : [];
      const node = addMessage('bot', `
        ${formatAnswer(json.answer, escapeHtml)}
        ${links.length ? `<div class="chat-links">${links.map((l, i) => `
          <button type="button" class="chat-link" data-index="${i}">
            <span aria-hidden="true">→</span> ${escapeHtml(l.label)}
          </button>`).join('')}</div>` : ''}
      `);
      node.querySelectorAll('.chat-link').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const link = links[Number(btn.dataset.index)];
          // En pantallas angostas el panel tapa la gráfica: se cierra al navegar.
          if (embedded || window.innerWidth < 760) setOpen(false);
          await navigate(link);
        });
      });
    } catch {
      typing.remove();
      history.pop();
      showError('No hay conexión con el asistente. Revisa tu conexión e inténtalo de nuevo.', text, true);
    } finally {
      busy = false;
      send.disabled = false;
      input.focus();
    }
  }
}

// Markdown mínimo y seguro: se escapa todo el texto y solo se reconstruyen
// párrafos, listas con guion y **negritas**.
function formatAnswer(text, escapeHtml) {
  const blocks = String(text).trim().split(/\n{2,}/);
  return blocks.map((block) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    const bold = (s) => escapeHtml(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    if (lines.length && lines.every((l) => /^[-*•]\s+/.test(l))) {
      return `<ul>${lines.map((l) => `<li>${bold(l.replace(/^[-*•]\s+/, ''))}</li>`).join('')}</ul>`;
    }
    return `<p>${lines.map(bold).join('<br>')}</p>`;
  }).join('');
}
