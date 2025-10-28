// CMoon - Trello-like Project Management Board
class CMoonBoard {
    constructor(options = {}) {
        this.storageKey = options.storageKey || 'cmoon-board';
        this.lists = this.loadFromStorage();
        this.draggedCard = null;
        this.draggedFromList = null;
        this.editingCardId = null;
        this.editingListId = null;
        
        this.init();
    }

    init() {
        this.renderBoard();
        this.bindEvents();
        this.createDefaultLists();
    }

    // Data Management
    loadFromStorage() {
        const saved = localStorage.getItem(this.storageKey);
        return saved ? JSON.parse(saved) : [];
    }

    saveToStorage() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.lists));
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Default Data
    createDefaultLists() {
        if (this.lists.length === 0) {
            this.lists = [
                {
                    id: this.generateId(),
                    title: 'To Do',
                    cards: [
                        {
                            id: this.generateId(),
                            title: 'Welcome to CMoon!',
                            description: 'This is your personal project management board. You can drag cards between lists, edit them, and organize your tasks.',
                            dueDate: '',
                            label: 'blue'
                        },
                        {
                            id: this.generateId(),
                            title: 'Create your first task',
                            description: 'Click the "Add a card" button to create your first task.',
                            dueDate: '',
                            label: 'green'
                        }
                    ]
                },
                {
                    id: this.generateId(),
                    title: 'In Progress',
                    cards: [
                        {
                            id: this.generateId(),
                            title: 'Learn about CMoon features',
                            description: 'Explore all the features like labels, due dates, and drag-and-drop functionality.',
                            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                            label: 'yellow'
                        }
                    ]
                },
                {
                    id: this.generateId(),
                    title: 'Done',
                    cards: [
                        {
                            id: this.generateId(),
                            title: 'Set up CMoon board',
                            description: 'Successfully created your personal project management board!',
                            dueDate: new Date().toISOString().split('T')[0],
                            label: 'green'
                        }
                    ]
                }
            ];
            this.saveToStorage();
            this.renderBoard();
        }
    }

    // Rendering
    renderBoard() {
        const container = document.getElementById('listsContainer');
        container.innerHTML = '';

        this.lists.forEach(list => {
            const listElement = this.createListElement(list);
            container.appendChild(listElement);
        });
    }

    createListElement(list) {
        const listDiv = document.createElement('div');
        listDiv.className = 'list';
        listDiv.setAttribute('data-list-id', list.id);

        listDiv.innerHTML = `
            <div class="list-header">
                <h3 class="list-title" contenteditable="true">${this.escapeHtml(list.title)}</h3>
                <div class="list-actions">
                    <button class="edit-list-btn" title="Edit list">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-list-btn" title="Delete list">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="cards-container drop-zone" data-list-id="${list.id}">
                ${list.cards.map(card => this.createCardHTML(card)).join('')}
            </div>
            <button class="add-card-btn" data-list-id="${list.id}">
                <i class="fas fa-plus"></i> Add a card
            </button>
        `;

        return listDiv;
    }

    createCardHTML(card) {
        const dueDateClass = this.getDueDateClass(card.dueDate);
        const dueDateDisplay = card.dueDate ? this.formatDate(card.dueDate) : '';
        const labelHTML = card.label ? `<div class="card-label ${card.label}"></div>` : '';
        const priority = card.priority || 'none';
        const priorityIcon = priority === 'high' ? '🔥' : priority === 'medium' ? '⬆️' : priority === 'low' ? '⬇️' : '';

        return `
            <div class="card" data-card-id="${card.id}" draggable="true">
                <div class="card-header">
                    <div class="card-title">${this.escapeHtml(card.title)}</div>
                    <div class="card-actions">
                        <button class="edit-card-btn" title="Edit card">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-card-btn" title="Delete card">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                ${card.description ? `<div class="card-description">${this.escapeHtml(card.description)}</div>` : ''}
                <div class="card-meta">
                    <div class="card-meta-left">
                        ${labelHTML}
                        ${priorityIcon ? `<span title="${priority} priority">${priorityIcon}</span>` : ''}
                    </div>
                    ${dueDateDisplay ? `
                        <div class="card-due-date ${dueDateClass}">
                            <i class="fas fa-calendar"></i>
                            ${dueDateDisplay}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // Utility Functions
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        const diffTime = date - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        if (diffDays === -1) return 'Yesterday';
        if (diffDays > 0) return `In ${diffDays} days`;
        return `${Math.abs(diffDays)} days ago`;
    }

    getDueDateClass(dueDate) {
        if (!dueDate) return '';
        
        const date = new Date(dueDate);
        const today = new Date();
        const diffTime = date - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'overdue';
        if (diffDays <= 3) return 'due-soon';
        return '';
    }

    // Event Binding
    bindEvents() {
        // Add list button
        document.getElementById('addListBtn').addEventListener('click', () => {
            this.showListModal();
        });
        const showBoardBtn = document.getElementById('showBoardBtn');
        const showCalendarBtn = document.getElementById('showCalendarBtn');
        if (showBoardBtn && showCalendarBtn) {
            showBoardBtn.addEventListener('click', () => {
                document.querySelector('.board').style.display = '';
                document.getElementById('calendarView').style.display = 'none';
            });
            showCalendarBtn.addEventListener('click', () => {
                document.querySelector('.board').style.display = 'none';
                document.getElementById('calendarView').style.display = '';
                // Delegate to BoardsApp calendar render if available
                if (window.__boardsAppInstance && window.__boardsAppInstance.renderCalendar) {
                    window.__boardsAppInstance.renderCalendar();
                }
            });
        }

        // Modal events
        this.bindModalEvents();

        // List title editing
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('list-title')) {
                e.target.focus();
            }
        });

        document.addEventListener('blur', (e) => {
            if (e.target.classList.contains('list-title')) {
                this.updateListTitle(e.target);
            }
        }, true);

        // Card and list actions
        document.addEventListener('click', (e) => {
            if (e.target.closest('.add-card-btn')) {
                const listId = e.target.closest('.add-card-btn').dataset.listId;
                this.showCardModal(listId);
            } else if (e.target.closest('.edit-card-btn')) {
                const cardId = e.target.closest('.card').dataset.cardId;
                this.editCard(cardId);
            } else if (e.target.closest('.delete-card-btn')) {
                const cardId = e.target.closest('.card').dataset.cardId;
                this.deleteCard(cardId);
            } else if (e.target.closest('.edit-list-btn')) {
                const listId = e.target.closest('.list').dataset.listId;
                this.editList(listId);
            } else if (e.target.closest('.delete-list-btn')) {
                const listId = e.target.closest('.list').dataset.listId;
                this.deleteList(listId);
            }
        });

        // Drag and drop events
        this.bindDragAndDropEvents();
    }

    bindModalEvents() {
        // Card modal
        const cardModal = document.getElementById('cardModal');
        const cardForm = document.getElementById('cardForm');
        const closeCardModal = document.getElementById('closeModal');
        const cancelCard = document.getElementById('cancelCard');

        closeCardModal.addEventListener('click', () => this.hideCardModal());
        cancelCard.addEventListener('click', () => this.hideCardModal());
        cardModal.addEventListener('click', (e) => {
            if (e.target === cardModal) this.hideCardModal();
        });

        cardForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCard();
        });

        // List modal
        const listModal = document.getElementById('listModal');
        const listForm = document.getElementById('listForm');
        const closeListModal = document.getElementById('closeListModal');
        const cancelList = document.getElementById('cancelList');

        closeListModal.addEventListener('click', () => this.hideListModal());
        cancelList.addEventListener('click', () => this.hideListModal());
        listModal.addEventListener('click', (e) => {
            if (e.target === listModal) this.hideListModal();
        });

        listForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveList();
        });
    }

    bindDragAndDropEvents() {
        document.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('card')) {
                this.draggedCard = e.target;
                this.draggedFromList = e.target.closest('.list').dataset.listId;
                e.target.classList.add('dragging');
            }
        });

        document.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('card')) {
                e.target.classList.remove('dragging');
                this.draggedCard = null;
                this.draggedFromList = null;
            }
        });

        document.addEventListener('dragover', (e) => {
            e.preventDefault();
            const dropZone = e.target.closest('.drop-zone');
            if (dropZone) {
                dropZone.classList.add('drag-over');
            }
        });

        document.addEventListener('dragleave', (e) => {
            const dropZone = e.target.closest('.drop-zone');
            if (dropZone) {
                dropZone.classList.remove('drag-over');
            }
        });

        document.addEventListener('drop', (e) => {
            e.preventDefault();
            const dropZone = e.target.closest('.drop-zone');
            if (dropZone && this.draggedCard) {
                dropZone.classList.remove('drag-over');
                this.moveCard(this.draggedCard.dataset.cardId, dropZone.dataset.listId);
            }
        });
    }

    // Card Operations
    showCardModal(listId) {
        this.editingCardId = null;
        this.currentListId = listId;
        
        document.getElementById('modalTitle').textContent = 'Add New Card';
        document.getElementById('cardForm').reset();
        document.getElementById('cardModal').classList.add('show');
        document.getElementById('cardTitle').focus();
    }

    editCard(cardId) {
        const card = this.findCard(cardId);
        if (!card) return;

        this.editingCardId = cardId;
        this.currentListId = this.findListContainingCard(cardId).id;
        
        document.getElementById('modalTitle').textContent = 'Edit Card';
        document.getElementById('cardTitle').value = card.title;
        document.getElementById('cardDescription').value = card.description || '';
        document.getElementById('cardDueDate').value = card.dueDate || '';
        document.getElementById('cardLabel').value = card.label || '';
        document.getElementById('cardPriority').value = card.priority || 'none';
        
        document.getElementById('cardModal').classList.add('show');
        document.getElementById('cardTitle').focus();
    }

    saveCard() {
        const title = document.getElementById('cardTitle').value.trim();
        const description = document.getElementById('cardDescription').value.trim();
        const dueDate = document.getElementById('cardDueDate').value;
        const label = document.getElementById('cardLabel').value;
        const priority = document.getElementById('cardPriority').value;

        if (!title) return;

        const cardData = {
            title,
            description,
            dueDate,
            label,
            priority
        };

        if (this.editingCardId) {
            this.updateCard(this.editingCardId, cardData);
        } else {
            this.addCard(this.currentListId, cardData);
        }

        this.hideCardModal();
    }

    addCard(listId, cardData) {
        const list = this.lists.find(l => l.id === listId);
        if (!list) return;

        const newCard = {
            id: this.generateId(),
            ...cardData
        };

        list.cards.push(newCard);
        this.saveToStorage();
        this.renderBoard();
    }

    updateCard(cardId, cardData) {
        const card = this.findCard(cardId);
        if (!card) return;

        Object.assign(card, cardData);
        this.saveToStorage();
        this.renderBoard();
    }

    deleteCard(cardId) {
        if (!confirm('Are you sure you want to delete this card?')) return;

        const list = this.findListContainingCard(cardId);
        if (!list) return;

        list.cards = list.cards.filter(card => card.id !== cardId);
        this.saveToStorage();
        this.renderBoard();
    }

    moveCard(cardId, targetListId) {
        const sourceList = this.findListContainingCard(cardId);
        const targetList = this.lists.find(l => l.id === targetListId);
        if (!sourceList || !targetList || sourceList.id === targetListId) return;

        // Update data first
        const card = sourceList.cards.find(c => c.id === cardId);
        if (!card) return;
        sourceList.cards = sourceList.cards.filter(c => c.id !== cardId);
        targetList.cards.push(card);
        this.saveToStorage();

        // Minimal DOM update to avoid full re-render flash
        const cardEl = this.draggedCard || document.querySelector(`.card[data-card-id="${cardId}"]`);
        const targetContainer = document.querySelector(`.cards-container[data-list-id="${targetListId}"]`);
        if (cardEl && targetContainer) {
            targetContainer.appendChild(cardEl);
        }
    }

    // List Operations
    showListModal() {
        this.editingListId = null;
        
        document.getElementById('listModalTitle').textContent = 'Add New List';
        document.getElementById('listForm').reset();
        document.getElementById('listModal').classList.add('show');
        document.getElementById('listTitle').focus();
    }

    editList(listId) {
        const list = this.lists.find(l => l.id === listId);
        if (!list) return;

        this.editingListId = listId;
        
        document.getElementById('listModalTitle').textContent = 'Edit List';
        document.getElementById('listTitle').value = list.title;
        
        document.getElementById('listModal').classList.add('show');
        document.getElementById('listTitle').focus();
    }

    saveList() {
        const title = document.getElementById('listTitle').value.trim();
        if (!title) return;

        if (this.editingListId) {
            this.updateList(this.editingListId, title);
        } else {
            this.addList(title);
        }

        this.hideListModal();
    }

    addList(title) {
        const newList = {
            id: this.generateId(),
            title,
            cards: []
        };

        this.lists.push(newList);
        this.saveToStorage();
        this.renderBoard();
    }

    updateList(listId, title) {
        const list = this.lists.find(l => l.id === listId);
        if (!list) return;

        list.title = title;
        this.saveToStorage();
        this.renderBoard();
    }

    updateListTitle(element) {
        const listId = element.closest('.list').dataset.listId;
        const newTitle = element.textContent.trim();
        
        if (newTitle) {
            this.updateList(listId, newTitle);
        } else {
            // Restore original title if empty
            const list = this.lists.find(l => l.id === listId);
            if (list) {
                element.textContent = list.title;
            }
        }
    }

    deleteList(listId) {
        const list = this.lists.find(l => l.id === listId);
        if (!list) return;

        if (list.cards.length > 0) {
            if (!confirm(`This list contains ${list.cards.length} card(s). Are you sure you want to delete it?`)) {
                return;
            }
        }

        this.lists = this.lists.filter(l => l.id !== listId);
        this.saveToStorage();
        this.renderBoard();
    }

    // Helper Methods
    findCard(cardId) {
        for (const list of this.lists) {
            const card = list.cards.find(c => c.id === cardId);
            if (card) return card;
        }
        return null;
    }

    findListContainingCard(cardId) {
        return this.lists.find(list => list.cards.some(card => card.id === cardId));
    }

    hideCardModal() {
        document.getElementById('cardModal').classList.remove('show');
        this.editingCardId = null;
        this.currentListId = null;
    }

    hideListModal() {
        document.getElementById('listModal').classList.remove('show');
        this.editingListId = null;
    }
}

class BoardsApp {
    constructor() {
        this.currentBoardId = null;
        this.currentBoard = null;
        this.boardStoragePrefix = 'cmoon-board-';
        this.boardsKey = 'cmoon-boards';
        this.themePresets = [
            { id: 'indigo', primary: '#667eea', start: '#667eea', end: '#764ba2' },
            { id: 'teal', primary: '#14b8a6', start: '#0ea5e9', end: '#14b8a6' },
            { id: 'sunset', primary: '#f97316', start: '#f59e0b', end: '#ef4444' },
            { id: 'rose', primary: '#e11d48', start: '#fb7185', end: '#e11d48' },
            { id: 'emerald', primary: '#10b981', start: '#34d399', end: '#10b981' },
            { id: 'violet', primary: '#8b5cf6', start: '#6366f1', end: '#8b5cf6' },
            { id: 'grape', primary: '#7c3aed', start: '#a855f7', end: '#7c3aed' },
            { id: 'ocean', primary: '#0ea5e9', start: '#22d3ee', end: '#0ea5e9' },
            { id: 'amber', primary: '#f59e0b', start: '#fbbf24', end: '#f59e0b' },
            { id: 'slate', primary: '#334155', start: '#64748b', end: '#334155' }
        ];
        this.init();
    }

    init() {
        this.renderBoardsView();
        this.bindEvents();
        this.routeOnLoad();
    }

    getBoards() {
        const saved = localStorage.getItem(this.boardsKey);
        return saved ? JSON.parse(saved) : [];
    }

    saveBoards(boards) {
        localStorage.setItem(this.boardsKey, JSON.stringify(boards));
    }

    renderBoardsView() {
        const boardsContainer = document.getElementById('boardsContainer');
        const boards = this.getBoards();
        boardsContainer.innerHTML = '';

        if (boards.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty-list';
            empty.textContent = 'No boards yet. Create your first board to get started!';
            boardsContainer.appendChild(empty);
            return;
        }

        boards.forEach(board => {
            const card = document.createElement('div');
            card.className = 'board-card';
            card.setAttribute('data-board-id', board.id);
            const swatchColor = (board.theme && board.theme.primary) || '#667eea';
            card.innerHTML = `
                <div class="board-card-title">${this.escapeHtml(board.title)}</div>
                <div class="board-card-actions">
                    <span class="swatch" style="background:${swatchColor}"></span>
                    <button class="btn btn-secondary rename-board-btn"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-secondary delete-board-btn"><i class="fas fa-trash"></i></button>
                </div>
            `;
            card.addEventListener('click', (e) => {
                if (e.target.closest('.rename-board-btn') || e.target.closest('.delete-board-btn')) return;
                this.openBoard(board.id);
            });
            card.querySelector('.rename-board-btn').addEventListener('click', () => this.showBoardModal('rename', board));
            card.querySelector('.delete-board-btn').addEventListener('click', () => this.deleteBoard(board.id));
            boardsContainer.appendChild(card);
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    bindEvents() {
        const createBtn = document.getElementById('createBoardBtn');
        const backBtn = document.getElementById('backToBoardsBtn');
        const boardModal = document.getElementById('boardModal');
        const closeBoardModal = document.getElementById('closeBoardModal');
        const cancelBoard = document.getElementById('cancelBoard');
        const boardForm = document.getElementById('boardForm');
        const themeOptions = document.getElementById('boardThemeOptions');

        createBtn.addEventListener('click', () => this.showBoardModal('create'));
        backBtn.addEventListener('click', () => this.showBoards());

        closeBoardModal.addEventListener('click', () => this.hideBoardModal());
        cancelBoard.addEventListener('click', () => this.hideBoardModal());
        boardModal.addEventListener('click', (e) => { if (e.target === boardModal) this.hideBoardModal(); });

        boardForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('boardTitle').value.trim();
            const selectedThemeId = this.selectedThemeId || 'indigo';
            const theme = this.themePresets.find(t => t.id === selectedThemeId);
            if (!title) return;
            if (this.boardModalMode === 'create') {
                this.createBoard(title, theme);
            } else if (this.boardModalMode === 'rename' && this.boardModalBoardId) {
                this.renameBoard(this.boardModalBoardId, title, theme);
            }
            this.hideBoardModal();
        });

        // Render theme options
        if (themeOptions) {
            themeOptions.innerHTML = '';
            this.themePresets.forEach(preset => {
                const div = document.createElement('div');
                div.className = 'theme-swatch';
                div.style.background = `linear-gradient(135deg, ${preset.start} 0%, ${preset.end} 100%)`;
                div.title = preset.id;
                div.addEventListener('click', () => this.selectTheme(preset.id));
                themeOptions.appendChild(div);
            });
        }

        // Global shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const cardModal = document.getElementById('cardModal');
        const listModal = document.getElementById('listModal');
                const bModal = document.getElementById('boardModal');
                if (cardModal.classList.contains('show')) cardModal.classList.remove('show');
                if (listModal.classList.contains('show')) listModal.classList.remove('show');
                if (bModal.classList.contains('show')) bModal.classList.remove('show');
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                if (this.currentBoard) {
                    e.preventDefault();
                    document.getElementById('addListBtn').click();
                }
            }
        });
    }

    routeOnLoad() {
        const hash = window.location.hash;
        if (hash.startsWith('#/board/')) {
            const boardId = hash.replace('#/board/', '');
            this.openBoard(boardId);
        } else {
            this.showBoards();
        }
        window.addEventListener('hashchange', () => this.routeOnLoad());
    }

    showBoards() {
        this.currentBoardId = null;
        this.currentBoard = null;
        document.getElementById('boardsView').style.display = '';
        document.getElementById('boardView').style.display = 'none';
        // Reset to default theme for home page
        this.applyDefaultTheme();
        this.renderBoardsView();
        if (window.location.hash !== '#/boards') {
            window.location.hash = '#/boards';
        }
    }

    openBoard(boardId) {
        const boards = this.getBoards();
        const board = boards.find(b => b.id === boardId);
        if (!board) {
            this.showBoards();
            return;
        }
        this.currentBoardId = boardId;
        document.getElementById('currentBoardTitle').textContent = board.title;
        document.getElementById('boardsView').style.display = 'none';
        document.getElementById('boardView').style.display = '';
        window.location.hash = `#/board/${boardId}`;

        if (this.currentBoard) {
            // Reuse existing instance to avoid rebinding global listeners
            this.currentBoard.storageKey = this.boardStoragePrefix + boardId;
            this.currentBoard.lists = this.currentBoard.loadFromStorage();
            this.currentBoard.renderBoard();
        } else {
            this.currentBoard = new CMoonBoard({ storageKey: this.boardStoragePrefix + boardId });
        }
        this.applyTheme(board.theme);
        const boardEl = document.querySelector('.board');
        const calEl = document.getElementById('calendarView');
        if (boardEl && calEl) {
            boardEl.style.display = '';
            calEl.style.display = 'none';
        }
    }

    showBoardModal(mode, board = null) {
        this.boardModalMode = mode;
        this.boardModalBoardId = board ? board.id : null;
        document.getElementById('boardModalTitle').textContent = mode === 'create' ? 'Create Board' : 'Rename Board';
        const input = document.getElementById('boardTitle');
        input.value = board ? board.title : '';
        document.getElementById('boardModal').classList.add('show');
        input.focus();
        const defaultThemeId = (board && board.theme && board.theme.id) || 'indigo';
        this.selectTheme(defaultThemeId);
    }

    hideBoardModal() {
        document.getElementById('boardModal').classList.remove('show');
        this.boardModalMode = null;
        this.boardModalBoardId = null;
    }

    createBoard(title, theme) {
        const boards = this.getBoards();
        const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
        boards.push({ id, title, theme: { id: theme.id, primary: theme.primary, start: theme.start, end: theme.end } });
        this.saveBoards(boards);
        this.renderBoardsView();
        this.openBoard(id);
    }

    renameBoard(boardId, newTitle, theme) {
        const boards = this.getBoards();
        const board = boards.find(b => b.id === boardId);
        if (!board) return;
        board.title = newTitle;
        if (theme) {
            board.theme = { id: theme.id, primary: theme.primary, start: theme.start, end: theme.end };
        }
        this.saveBoards(boards);
        document.getElementById('currentBoardTitle').textContent = newTitle;
        this.renderBoardsView();
        if (this.currentBoardId === boardId) {
            this.applyTheme(board.theme);
        }
    }

    deleteBoard(boardId) {
        const boards = this.getBoards();
        const board = boards.find(b => b.id === boardId);
        if (!board) return;
        if (!confirm(`Delete board "${board.title}"? This cannot be undone.`)) return;
        const filtered = boards.filter(b => b.id !== boardId);
        this.saveBoards(filtered);
        // Remove its lists storage
        localStorage.removeItem(this.boardStoragePrefix + boardId);
        this.renderBoardsView();
        if (this.currentBoardId === boardId) {
            this.showBoards();
        }
    }

    selectTheme(themeId) {
        this.selectedThemeId = themeId;
        const options = document.querySelectorAll('#boardThemeOptions .theme-swatch');
        options.forEach(o => o.classList.toggle('selected', o.title === themeId));
    }

    applyTheme(theme) {
        const t = theme || { primary: '#667eea', start: '#667eea', end: '#764ba2' };
        document.documentElement.style.setProperty('--primary', t.primary);
        document.documentElement.style.setProperty('--bg-grad-start', t.start);
        document.documentElement.style.setProperty('--bg-grad-end', t.end);
    }

    applyDefaultTheme() {
        const t = { primary: '#667eea', start: '#667eea', end: '#764ba2' };
        document.documentElement.style.setProperty('--primary', t.primary);
        document.documentElement.style.setProperty('--bg-grad-start', t.start);
        document.documentElement.style.setProperty('--bg-grad-end', t.end);
    }

    renderCalendar() {
        const container = document.getElementById('calendarView');
        if (!container || !this.currentBoard) return;
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        const firstDay = new Date(year, month, 1);
        const startDay = firstDay.getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const monthName = firstDay.toLocaleString(undefined, { month: 'long' });
        const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        const itemsByDate = {};
        this.currentBoard.lists.forEach(list => {
            list.cards.forEach(card => {
                if (!card.dueDate) return;
                const d = new Date(card.dueDate);
                if (d.getFullYear() === year && d.getMonth() === month) {
                    const key = d.getDate();
                    if (!itemsByDate[key]) itemsByDate[key] = [];
                    itemsByDate[key].push(card);
                }
            });
        });

        let html = '';
        html += `<div class="calendar-header">${monthName}</div>`;
        html += '<div class="calendar-weekdays">';
        weekdays.forEach(d => { html += `<div class="weekday">${d}</div>`; });
        html += '</div>';
        html += '<div class="calendar-grid">';
        for (let i = 0; i < startDay; i++) {
            html += '<div class="calendar-day"></div>';
        }
        for (let day = 1; day <= daysInMonth; day++) {
            const items = itemsByDate[day] || [];
            html += `<div class="calendar-day">`;
            html += `<div class="date">${day}</div>`;
            items
                .sort((a,b) => this.priorityWeight(b.priority) - this.priorityWeight(a.priority))
                .forEach(card => {
                    const pr = card.priority || 'none';
                    const cls = `priority-${pr}`;
                    html += `<div class="calendar-item ${cls}" data-card-id="${card.id}">${this.escapeHtml(card.title)}</div>`;
                });
            html += `</div>`;
        }
        html += '</div>';
        container.innerHTML = html;

        container.querySelectorAll('.calendar-item').forEach(el => {
            el.addEventListener('click', () => {
                const cardId = el.getAttribute('data-card-id');
                this.cycleCardPriority(cardId);
                this.renderCalendar();
                this.currentBoard.renderBoard();
            });
        });
    }

    priorityWeight(p) {
        if (p === 'high') return 3;
        if (p === 'medium') return 2;
        if (p === 'low') return 1;
        return 0;
    }

    cycleCardPriority(cardId) {
        const card = this.currentBoard.findCard(cardId);
        if (!card) return;
        const order = ['none','low','medium','high'];
        const idx = order.indexOf(card.priority || 'none');
        const next = order[(idx + 1) % order.length];
        card.priority = next;
        this.currentBoard.saveToStorage();
    }

    getBoardEvents(boardId) {
        const board = this.getBoards().find(b => b.id === boardId);
        if (!board) return [];

        const events = [];
        board.lists.forEach(list => {
            list.cards.forEach(card => {
                if (card.dueDate) {
                    events.push({
                        id: card.id,
                        title: card.title,
                        start: card.dueDate,
                        end: card.dueDate,
                        allDay: true,
                        backgroundColor: this.getCardLabelColor(card.label),
                        borderColor: this.getCardLabelColor(card.label),
                        textColor: 'white'
                    });
                }
            });
        });
        return events;
    }

    getCardLabelColor(label) {
        switch (label) {
            case 'red': return '#ef4444';
            case 'orange': return '#f97316';
            case 'yellow': return '#f59e0b';
            case 'green': return '#10b981';
            case 'blue': return '#667eea';
            case 'purple': return '#8b5cf6';
            case 'pink': return '#e11d48';
            default: return '#667eea'; // Default color
        }
    }

    handleEventClick(info) {
        const card = this.findCard(info.event.id);
        if (card) {
            this.editCard(card.id);
        }
    }

    handleEventDrop(info) {
        const card = this.findCard(info.event.id);
        if (card) {
            const newDueDate = info.event.start.toISOString().split('T')[0];
            this.updateCard(card.id, { dueDate: newDueDate });
        }
    }

    handleEventResize(info) {
        const card = this.findCard(info.event.id);
        if (card) {
            const newDueDate = info.event.start.toISOString().split('T')[0];
            this.updateCard(card.id, { dueDate: newDueDate });
        }
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.__boardsAppInstance = new BoardsApp();
});
