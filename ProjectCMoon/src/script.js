// CMoon - Trello-like Project Management Board
class CMoonBoard {
    constructor() {
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
        const saved = localStorage.getItem('cmoon-board');
        return saved ? JSON.parse(saved) : [];
    }

    saveToStorage() {
        localStorage.setItem('cmoon-board', JSON.stringify(this.lists));
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
        
        document.getElementById('cardModal').classList.add('show');
        document.getElementById('cardTitle').focus();
    }

    saveCard() {
        const title = document.getElementById('cardTitle').value.trim();
        const description = document.getElementById('cardDescription').value.trim();
        const dueDate = document.getElementById('cardDueDate').value;
        const label = document.getElementById('cardLabel').value;

        if (!title) return;

        const cardData = {
            title,
            description,
            dueDate,
            label
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

        const card = sourceList.cards.find(c => c.id === cardId);
        if (!card) return;

        sourceList.cards = sourceList.cards.filter(c => c.id !== cardId);
        targetList.cards.push(card);
        
        this.saveToStorage();
        this.renderBoard();
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

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CMoonBoard();
});

// Add some keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Escape key to close modals
    if (e.key === 'Escape') {
        const cardModal = document.getElementById('cardModal');
        const listModal = document.getElementById('listModal');
        
        if (cardModal.classList.contains('show')) {
            cardModal.classList.remove('show');
        }
        if (listModal.classList.contains('show')) {
            listModal.classList.remove('show');
        }
    }
    
    // Ctrl/Cmd + N to add new list
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        document.getElementById('addListBtn').click();
    }
});
