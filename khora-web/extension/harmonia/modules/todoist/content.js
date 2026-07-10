// Todoist - Capa Content Script (v1.0.0)
// Observa la creación de tareas en el DOM de Todoist y las reporta al background script.

(function() {
  if (window.__TODOIST_AISTHESIS_INJECTED) return;
  window.__TODOIST_AISTHESIS_INJECTED = true;

  // Un set simple para no enviar tareas duplicadas en la misma sesión de la pestaña
  const reportedTasks = new Set();

  function sendTask(title) {
    if (!title || reportedTasks.has(title)) return;
    reportedTasks.add(title);

    chrome.runtime.sendMessage({
      type: "TODOIST_NEW_TASK",
      title: title
    }, response => {
      if (chrome.runtime.lastError) {
        console.warn("[Harmonia-Todoist] Error enviando tarea:", chrome.runtime.lastError.message);
      } else if (response && !response.ok) {
        console.warn("[Harmonia-Todoist] Error creando en Notion:", response.error);
      } else {
        console.log("[Harmonia-Todoist] Tarea enviada a Notion:", title);
      }
    });
  }



  // Escuchar enter en el editor de tareas de Todoist
  // Todoist usa div contenteditable para el título de la tarea (ej. aria-label="Task name" o class="public-DraftEditor-content")
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      // Todoist task editor content
      const target = e.target;
      if (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // En Todoist el aria-label suele indicar el tipo de campo
        const label = target.getAttribute('aria-label') || target.getAttribute('data-placeholder') || "";
        // También podemos chequear clases comunes de Todoist para el editor
        if (label.toLowerCase().includes('task') || label.toLowerCase().includes('tarea') || target.closest('form')) {
          const text = target.textContent || target.value;
          if (text && text.trim().length > 0) {
            // En Todoist a veces Enter añade la tarea pero no borra el input de inmediato, o se pulsa Ctrl+Enter.
            // Damos un pequeño retraso y chequeamos si el input se vació (lo que confirmaría que se envió)
            const capturedText = text.trim();
            setTimeout(() => {
              const currentText = target.textContent || target.value;
              // Si el texto se borró, o si ya no está en el DOM, asumimos que se "envió"
              if (!currentText || !document.body.contains(target) || currentText.trim() === '') {
                 sendTask(capturedText);
              }
            }, 100);
          }
        }
      }
    }
  }, true); // Use capture to get it early

  // También capturar clicks en el botón de "Add task" / "Añadir tarea"
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('button[data-testid="task-editor-submit-button"], button[type="submit"]');
    if (btn) {
      // Buscar el input de tarea en el mismo contenedor
      const container = btn.closest('.task_editor__editing_area, form');
      if (container) {
        const input = container.querySelector('[contenteditable="true"], input, textarea');
        if (input) {
          const text = input.textContent || input.value;
          if (text && text.trim().length > 0) {
             sendTask(text.trim());
          }
        }
      }
    }
  }, true);

  console.log("[Harmonia-Todoist] Content script inyectado.");
})();
