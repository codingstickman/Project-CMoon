import { sendMessage } from './AI.js';

// Comprehensive system prompt for Trello-like task management
const SYSTEM_PROMPT = `You are an AI assistant for CMoon, a Trello-like project management board. Your role is to:
1. Help users create, edit, and organize tasks and lists
2. Provide productivity advice and task prioritization guidance
3. Understand natural language requests and convert them to structured actions
4. Be friendly, efficient, and conversational

TONE & PERSONALITY:
- Be friendly, helpful, and conversational
- Use casual but professional language
- Show enthusiasm for helping users stay organized
- Use contractions and natural speech patterns
- Be encouraging about productivity

CRITICAL MEMORY INSTRUCTIONS:
- ALWAYS read and remember the BOARD CONTEXT provided below
- Remember task names, list names, due dates, priorities, and labels discussed
- Reference previous conversation when relevant
- Build upon previous discussions rather than starting fresh

CONVERSATIONAL FLOW RULES:
- This is a natural conversation - act like you're helping a friend organize their work
- Ask ONE clarifying question at a time if needed
- Provide complete guidance when you have enough information
- If the user's request is clear, execute it immediately

RESPONSE STRUCTURE:
You MUST respond with ONLY a valid JSON object. No other text before or after.

{
  "action": "create|edit|delete|move|list|assist|question|success",
  "element_type": "task|list|board",
  "conversationalResponse": "Friendly response to the user",
  "details": {
    // Relevant fields based on action
  },
  "followUpQuestion": "Optional single question if clarification needed"
}

ACTION TYPES:
1. CREATE: User wants to create a new task or list
   - element_type: "task" or "list"
   - details: { title, description?, listId?, dueDate?, label?, priority? }

2. EDIT: User wants to modify existing task/list
   - element_type: "task" or "list"
   - details: { id?, title?, description?, dueDate?, label?, priority?, updates }

3. DELETE: User wants to delete a task or list
   - element_type: "task" or "list"
   - details: { id?, title? }

4. MOVE: User wants to move a task between lists
   - element_type: "task"
   - details: { taskId?, taskTitle?, fromList?, toList? }

5. LIST: User wants to see tasks/lists
   - element_type: "task" or "list"
   - details: { filter?: "overdue|today|urgent|all", listId? }

6. ASSIST: General advice, no specific action
   - element_type: null
   - details: { advice, topic? }

7. QUESTION: Need clarification
   - element_type: varies
   - details: { partialInfo }
   - followUpQuestion: "What you need to know"

8. SUCCESS: Confirmation of completed action
   - element_type: varies
   - details: { summary }

EXAMPLES:

User: "Add a task to finish the report"
Response: {
  "action": "question",
  "element_type": "task",
  "conversationalResponse": "I'd be happy to add that task! Which list should I add 'Finish the report' to?",
  "details": { "taskTitle": "Finish the report" },
  "followUpQuestion": "Which list should this task go in?"
}

User: "Add it to To Do"
Response: {
  "action": "create",
  "element_type": "task",
  "conversationalResponse": "Perfect! I've added 'Finish the report' to your To Do list. Would you like to set a due date or priority?",
  "details": {
    "title": "Finish the report",
    "listName": "To Do",
    "description": ""
  }
}

User: "Show me all my urgent tasks"
Response: {
  "action": "list",
  "element_type": "task",
  "conversationalResponse": "Here are all your high-priority tasks. Let me know if you'd like to reschedule or reprioritize any of them!",
  "details": { "filter": "urgent" }
}

User: "How should I organize my tasks?"
Response: {
  "action": "assist",
  "element_type": null,
  "conversationalResponse": "Great question! I recommend organizing tasks by workflow stage (To Do → In Progress → Done) or by project. Use labels to categorize by type, priorities for urgency, and due dates to track deadlines. Start with your most important task each day!",
  "details": { "topic": "organization" }
}

CRITICAL RULES:
- Respond with ONLY valid JSON, no additional text
- Always include conversationalResponse field with friendly message
- Be specific in details object
- Use followUpQuestion only when truly needed
- Infer context from conversation history when provided
- If unclear, ask ONE specific question`;

class TrelloAIAssistant {
    constructor() {
        this.conversationHistory = [];
        this.boardContext = null;
        this.init();
    }

    init() {
        const chatSidebar = document.getElementById('ai-chat-sidebar');
        const chatMessages = document.getElementById('aiChatMessages');
        const chatForm = document.getElementById('aiChatForm');
        const chatInput = document.getElementById('aiChatInput');
        const closeBtn = document.getElementById('aiChatCloseBtn');

        if (!chatSidebar || !chatMessages || !chatForm || !chatInput) {
            console.error('[AI Chat] Required DOM elements missing.');
            return;
        }

        // Add welcome message
        this.appendMessage("Hi! I'm your CMoon assistant. I can help you create tasks, organize lists, and boost your productivity. What would you like to do?", 'ai');

        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userText = chatInput.value.trim();
            if (!userText) return;

            this.appendMessage(userText, 'user');
            chatInput.value = '';

            // Show typing indicator
            const typingId = this.showTypingIndicator();

            try {
                const response = await this.processMessage(userText);
                this.removeTypingIndicator(typingId);
                this.handleResponse(response);
            } catch (err) {
                this.removeTypingIndicator(typingId);
                this.appendMessage('Sorry, I encountered an error. Please try again!', 'ai', true);
                console.error('[AI Chat] Error:', err);
            }
        });

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                chatSidebar.style.display = 'none';
            });
        }

        // Global shortcut to open chat
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                chatSidebar.style.display = '';
                chatInput.focus();
            }
        });
    }

    buildContextPrompt() {
        if (!window.__boardsAppInstance || !window.__boardsAppInstance.currentBoard) {
            return "\n\nBOARD CONTEXT: No board currently open.";
        }

        const board = window.__boardsAppInstance.currentBoard;
        const lists = board.lists || [];
        
        let context = "\n\nBOARD CONTEXT:\n";
        context += `Current Board: ${document.getElementById('currentBoardTitle')?.textContent || 'Unnamed Board'}\n\n`;
        
        context += "Available Lists:\n";
        lists.forEach(list => {
            context += `- "${list.title}" (${list.cards?.length || 0} tasks)\n`;
        });

        context += "\nRecent Tasks:\n";
        const allCards = lists.flatMap(list => 
            (list.cards || []).map(card => ({ ...card, listTitle: list.title }))
        );
        
        allCards.slice(0, 10).forEach(card => {
            const priority = card.priority || 'none';
            const dueDate = card.dueDate ? ` (Due: ${card.dueDate})` : '';
            context += `- "${card.title}" in ${card.listTitle}${dueDate} [Priority: ${priority}]\n`;
        });

        // Add conversation history
        if (this.conversationHistory.length > 0) {
            context += "\n\nRecent Conversation:\n";
            this.conversationHistory.slice(-6).forEach(msg => {
                context += `${msg.role}: ${msg.content}\n`;
            });
        }

        return context;
    }

    async processMessage(userMessage) {
        // Build context
        const contextPrompt = this.buildContextPrompt();
        const fullPrompt = SYSTEM_PROMPT + contextPrompt + "\n\nUser: " + userMessage;

        // Call AI API
        const rawResponse = await sendMessage(userMessage, fullPrompt);
        
        // Store in history
        this.conversationHistory.push({ role: 'user', content: userMessage });
        
        // Clean and parse response
        const cleaned = this.cleanResponse(rawResponse);
        let parsed;
        
        try {
            parsed = JSON.parse(cleaned);
        } catch (e) {
            // Fallback if JSON parsing fails
            parsed = {
                action: 'assist',
                element_type: null,
                conversationalResponse: cleaned || "I'm not sure I understood that. Could you rephrase?",
                details: {}
            };
        }

        this.conversationHistory.push({ role: 'assistant', content: parsed.conversationalResponse });
        
        return parsed;
    }

    cleanResponse(rawResponse) {
        if (!rawResponse || rawResponse.trim() === '') {
            return '{}';
        }

        // Remove <think> tags
        let cleaned = rawResponse.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        
        // Extract JSON if wrapped in text
        const jsonStart = cleaned.indexOf('{');
        const jsonEnd = cleaned.lastIndexOf('}');

        
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
            cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
        }
        
        return cleaned;
    }

    handleResponse(response) {
        const { action, element_type, conversationalResponse, details, followUpQuestion } = response;

        // Always show the conversational response
        if (conversationalResponse) {
            this.appendMessage(conversationalResponse, 'ai');
        }

        // Execute the action
        switch (action) {
            case 'create':
                this.executeCreate(element_type, details);
                break;
            case 'edit':
                this.executeEdit(element_type, details);
                break;
            case 'delete':
                this.executeDelete(element_type, details);
                break;
            case 'move':
                this.executeMove(details);
                break;
            case 'list':
                this.executeList(element_type, details);
                break;
            case 'assist':
            case 'question':
            case 'success':
                // Already handled by conversationalResponse
                break;
            default:
                console.warn('[AI Chat] Unknown action:', action);
        }
    }

    executeCreate(elementType, details) {
        const board = window.__boardsAppInstance?.currentBoard;
        if (!board) {
            this.appendMessage("Please open a board first to create tasks!", 'ai', true);
            return;
        }

        if (elementType === 'task') {
            // Find the list by name or ID
            const list = board.lists.find(l => 
                l.title.toLowerCase() === (details.listName || details.listTitle || '').toLowerCase() ||
                l.id === details.listId
            );

            if (!list) {
                this.appendMessage(`I couldn't find a list named "${details.listName}". Could you specify which list?`, 'ai', true);
                return;
            }

            const cardData = {
                title: details.title,
                description: details.description || '',
                dueDate: details.dueDate || '',
                label: details.label || '',
                priority: details.priority || 'none'
            };

            board.addCard(list.id, cardData);
        } else if (elementType === 'list') {
            board.addList(details.title);
        }
    }

    executeEdit(elementType, details) {
        const board = window.__boardsAppInstance?.currentBoard;
        if (!board) return;

        if (elementType === 'task') {
            // Find card by title or ID
            const card = details.id ? board.findCard(details.id) : this.findCardByTitle(details.title);
            
            if (card) {
                board.updateCard(card.id, details.updates || details);
            }
        }
    }

    executeDelete(elementType, details) {
        const board = window.__boardsAppInstance?.currentBoard;
        if (!board) return;

        if (elementType === 'task') {
            const card = details.id ? board.findCard(details.id) : this.findCardByTitle(details.title);
            if (card) {
                board.deleteCard(card.id);
            }
        }
    }

    executeMove(details) {
        const board = window.__boardsAppInstance?.currentBoard;
        if (!board) return;

        const card = details.taskId ? board.findCard(details.taskId) : this.findCardByTitle(details.taskTitle);
        const targetList = board.lists.find(l => l.title.toLowerCase() === (details.toList || '').toLowerCase());

        if (card && targetList) {
            board.moveCard(card.id, targetList.id);
        }
    }

    executeList(elementType, details) {
        const board = window.__boardsAppInstance?.currentBoard;
        if (!board) return;

        let tasks = [];
        board.lists.forEach(list => {
            list.cards.forEach(card => {
                tasks.push({ ...card, listTitle: list.title });
            });
        });

        // Filter based on details
        if (details.filter === 'urgent') {
            tasks = tasks.filter(t => t.priority === 'high');
        } else if (details.filter === 'today') {
            const today = new Date().toISOString().split('T')[0];
            tasks = tasks.filter(t => t.dueDate === today);
        } else if (details.filter === 'overdue') {
            const today = new Date().toISOString().split('T')[0];
            tasks = tasks.filter(t => t.dueDate && t.dueDate < today);
        }

        // Display results
        if (tasks.length === 0) {
            this.appendMessage("No tasks match that filter!", 'ai');
        } else {
            let msg = 'Found ' + tasks.length + ' task(s):\n\n';
            tasks.slice(0, 10).forEach(task => {
                msg += '• ' + task.title + ' (' + task.listTitle + ')';
                if (task.dueDate) msg += ' - Due: ' + task.dueDate;
                msg += '\n';
            });
            this.appendMessage(msg, 'ai');
        }
    }

    findCardByTitle(title) {
        const board = window.__boardsAppInstance?.currentBoard;
        if (!board || !title) return null;

        const lowerTitle = title.toLowerCase();
        for (const list of board.lists) {
            const card = list.cards.find(c => c.title.toLowerCase().includes(lowerTitle));
            if (card) return card;
        }
        return null;
    }

    appendMessage(content, sender = 'ai', isError = false) {
        const chatMessages = document.getElementById('aiChatMessages');
        const msgDiv = document.createElement('div');
        msgDiv.className = 'ai-chat-message' + (sender === 'user' ? ' user' : '') + (isError ? ' error' : '');
        msgDiv.textContent = content;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    showTypingIndicator() {
        const chatMessages = document.getElementById('aiChatMessages');
        const typingDiv = document.createElement('div');
        const id = 'typing-' + Date.now();
        typingDiv.id = id;
        typingDiv.className = 'ai-chat-message';
        typingDiv.textContent = 'Thinking...';
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return id;
    }

    removeTypingIndicator(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }
}

// Initialize when DOM is ready
function ready(fn) {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(fn, 0);
    } else {
        document.addEventListener('DOMContentLoaded', fn);
    }
}

ready(() => {
    window.trelloAIAssistant = new TrelloAIAssistant();
});