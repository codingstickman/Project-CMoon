import { sendMessage } from './AI.js';

const systemPrompt = `You are an AI assistant embedded in a productivity organizer web app. Respond only with clean, valid JSON, never with explanations or intermediate 'thinking' steps. Your response must directly represent the required action and necessary information for the app to process.\n\nRespond to user input with a JSON object with this structure:\n{\n  "action": "create" | "edit" | "delete" | "list" | "assist" | "error",\n  "element_type": "task" | "note" | "event" | ...,\n  "details": {...}\n}\nOnly fill 'details' with necessary properties. For 'assist,' provide clear, single-sentence advice as 'details.message'. Never output a 'thinking' tag, extra commentary, or non-JSON formatting. If you don’t understand, reply with {"action": "error", "details": {"message": "Sorry, I didn't understand. Please rephrase."}}. Always output only valid JSON, formatted for direct parsing and use in the app.`;

function ready(fn) {
  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(fn, 0);
  else document.addEventListener('DOMContentLoaded', fn);
}

ready(() => {
  const chatSidebar = document.getElementById('ai-chat-sidebar');
  const chatMessages = document.getElementById('aiChatMessages');
  const chatForm = document.getElementById('aiChatForm');
  const chatInput = document.getElementById('aiChatInput');
  const closeBtn = document.getElementById('aiChatCloseBtn');

  if (!chatSidebar || !chatMessages || !chatForm || !chatInput) {
    console.error('[AI Chat] One or more required DOM elements missing.');
    return;
  }

  function appendMessage(content, sender = 'ai', isError = false) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'ai-chat-message' + (sender === 'user' ? ' user' : '') + (isError ? ' error' : '');
    msgDiv.textContent = content;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    console.log('[AI Chat] Appended message:', content);
  }

  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userText = chatInput.value.trim();
    if (!userText) return;
    appendMessage(userText, 'user');
    chatInput.value = '';
    try {
      const rawResponse = await sendMessage(userText, systemPrompt);
      let parsed;
      try {
        parsed = JSON.parse(rawResponse);
        appendMessage(JSON.stringify(parsed, null, 2), 'ai');
      } catch(err) {
        appendMessage("[AI JSON Error]\n" + rawResponse, 'ai', true);
      }
    } catch (err) {
      appendMessage('[Connection error: ' + (err?.message || 'unknown') + ']', 'ai', true);
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      chatSidebar.style.display = 'none';
    });
  }

  // For manual debugging: open from browser console
  window.aiShowChatSidebar = () => {
    if (chatSidebar) chatSidebar.style.display = '';
  };

  // Optionally auto-focus on chatInput when sidebar is present
  if (chatSidebar.style.display !== 'none') {
    chatInput.focus();
  }
});
