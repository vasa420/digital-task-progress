document.addEventListener('DOMContentLoaded', () => {
    // Check for existing session on load
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
        showDashboard(JSON.parse(savedUser));
    }

    // Initialize Dashboard Components
    updateClock();
    updateDate();
    checkAndResetTasks();
    loadTasks();
    applyTheme();
    updateTrendChart();
    updateProgress();
    loadObjectives(); // Initialize objectives

    // Intercept Google Sign-in to show Mock Account Selector
    // (This overrides the broken real button for a perfect simulation)
    const googlePlaceholder = document.querySelector('.g_id_signin');
    if (googlePlaceholder) {
        googlePlaceholder.addEventListener('click', (e) => {
            // Prevent real (broken) Google action
            e.preventDefault();
            e.stopPropagation();
            showMockPicker();
        }, true);
    }

    // Set interval for real-time clock
    setInterval(updateClock, 1000);

    // Event Listeners
    document.getElementById('add-btn').addEventListener('click', addTask);
    document.getElementById('task-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });

    document.getElementById('task-list').addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') updateProgress();
    });

    document.getElementById('task-list').addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-task-btn')) {
            const item = e.target.closest('.task-item');
            item.style.opacity = '0';
            item.style.transform = 'translateX(20px)';
            setTimeout(() => {
                item.remove();
                saveTasks();
                updateProgress();
            }, 300);
        }
    });

    // Logout handler
    document.getElementById('logout-btn').addEventListener('click', logout);

    // Theme Save Handler
    const saveBtn = document.getElementById('save-settings-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const select = document.getElementById('theme-select');
            const theme = select.value;
            localStorage.setItem('theme', theme);
            applyTheme();

            // Show feedback
            saveBtn.textContent = 'Changes Saved! ⚡';
            saveBtn.classList.add('success');
            setTimeout(() => {
                saveBtn.textContent = 'Save Changes';
                saveBtn.classList.remove('success');
            }, 2000);
        });
    }

    // Interactive Tilt Effect for Login Card
    const card = document.querySelector('.login-card');
    const container = document.querySelector('.login-hero');

    if (card && container) {
        container.addEventListener('mousemove', (e) => {
            const { clientX, clientY } = e;
            const { innerWidth, innerHeight } = window;

            const xRotation = ((clientY / innerHeight) - 0.5) * 10; // max 10deg
            const yRotation = ((clientX / innerWidth) - 0.5) * -10; // max 10deg

            card.style.transform = `perspective(1000px) rotateX(${xRotation}deg) rotateY(${yRotation}deg)`;
        });

        container.addEventListener('mouseleave', () => {
            card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg)`;
        });
    }

    // Dashboard Sidebar Navigation Logic
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.content-view');

    navLinks.forEach((link, index) => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            // Update Active Link
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Switch Sections
            sections.forEach(s => {
                s.classList.remove('active');
                s.classList.add('hidden-display');
            });

            const targetSection = sections[index];
            if (targetSection) {
                targetSection.classList.remove('hidden-display');
                // Small delay to trigger animation
                requestAnimationFrame(() => {
                    targetSection.classList.add('active');
                });
            }
        });
    });

    // Guest login handler
    const guestBtn = document.getElementById('guest-login-btn');
    if (guestBtn) {
        guestBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const guestUser = {
                given_name: 'Varad',
                name: 'Varad (Guest)',
                picture: 'https://ui-avatars.com/api/?name=Varad&background=8b5cf6&color=fff'
            };
            localStorage.setItem('user', JSON.stringify(guestUser));
            showDashboard(guestUser);
        });
    }

    // Objective Modal Listeners
    const addObjCard = document.getElementById('add-objective-card');
    if (addObjCard) {
        addObjCard.addEventListener('click', openObjectiveModal);
    }

    const cancelObjBtn = document.getElementById('cancel-obj-btn');
    if (cancelObjBtn) {
        cancelObjBtn.addEventListener('click', closeObjectiveModal);
    }

    const confirmObjBtn = document.getElementById('confirm-obj-btn');
    if (confirmObjBtn) {
        confirmObjBtn.addEventListener('click', createObjective);
    }

    // Click outside modal to close
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('objective-modal');
        if (e.target === modal) closeObjectiveModal();
    });
});

// Mock Account Selector Functions
function showMockPicker() {
    const modal = document.getElementById('account-picker-modal');
    modal.classList.remove('hidden-display');
}

function selectAccount(type) {
    const accounts = {
        'varad_personal': {
            given_name: 'Varad',
            name: 'Varad (Personal)',
            picture: 'https://ui-avatars.com/api/?name=Varad+P&background=8b5cf6&color=fff'
        },
        'varad_work': {
            given_name: 'Varad',
            name: 'Varad Agrawal',
            picture: 'https://ui-avatars.com/api/?name=VA&background=10b981&color=fff'
        }
    };

    const user = accounts[type];
    if (user) {
        localStorage.setItem('user', JSON.stringify(user));

        // Initialize state on first login
        if (!localStorage.getItem('lastResetToken')) {
            localStorage.setItem('lastResetToken', Date.now());
        }

        // Hide picker and show dashboard
        document.getElementById('account-picker-modal').classList.add('hidden-display');
        showDashboard(user);
    }
}

// Google Credential Callback
async function handleCredentialResponse(response) {
    try {
        const payload = JSON.parse(atob(response.credential.split('.')[1]));
        localStorage.setItem('user', JSON.stringify(payload));
        showDashboard(payload);
    } catch (err) {
        console.error('❌ Google Login Error:', err);
    }
}

function showDashboard(user) {
    console.log('📂 Showing Dashboard for:', user.name);

    // Update UI elements
    const greeting = document.getElementById('user-greeting');
    const nameEl = document.getElementById('user-name');
    const avatar = document.getElementById('user-avatar');

    if (greeting) greeting.textContent = `Welcome Back, ${user.given_name}`;
    if (nameEl) nameEl.textContent = user.name;
    if (avatar) avatar.src = user.picture;

    // Transition Views
    const loginView = document.getElementById('login-view');
    const dashView = document.getElementById('dashboard-view');

    if (loginView && dashView) {
        loginView.classList.remove('active');
        loginView.classList.add('hidden');

        // Allow animation to complete before switching display
        setTimeout(() => {
            loginView.classList.add('hidden-display');
            dashView.classList.remove('hidden-display');

            // Trigger dashboard entrance animation
            requestAnimationFrame(() => {
                dashView.classList.remove('hidden');
                dashView.classList.add('active');
            });
        }, 800);
    }

    // Initialize tasks if none exist
    const list = document.getElementById('task-list');
    if (list && list.children.length === 0 && !localStorage.getItem('tasks')) {
        addInitialTasks();
    } else {
        loadTasks();
    }
}

function addInitialTasks() {
    const defaults = [
        { text: "Wash dishes", done: true },
        { text: "Buy groceries", done: false },
        { text: "Pay bills", done: false },
        { text: "Walk the dog", done: false },
        { text: "Buy milk at the store", done: false }
    ];

    const list = document.getElementById('task-list');
    if (!list) return;

    defaults.forEach(task => {
        createTaskElement(task.text, task.done);
    });

    saveTasks();
    updateProgress();
}

function checkAndResetTasks() {
    const lastReset = localStorage.getItem('lastResetToken');
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    if (lastReset && (now - lastReset > twentyFourHours)) {
        console.log('⏳ 24 Hours passed. Resetting focus tasks...');
        localStorage.removeItem('tasks');
        localStorage.setItem('lastResetToken', now);
        // Page will load defaults via showDashboard -> addInitialTasks
    } else if (!lastReset) {
        localStorage.setItem('lastResetToken', now);
    }
}

function saveTasks() {
    const tasks = [];
    document.querySelectorAll('.task-item').forEach(li => {
        tasks.push({
            text: li.querySelector('label').textContent.trim().replace('×', ''),
            done: li.querySelector('input[type="checkbox"]').checked
        });
    });
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function loadTasks() {
    const savedTasks = localStorage.getItem('tasks');
    if (savedTasks) {
        const tasks = JSON.parse(savedTasks);
        const list = document.getElementById('task-list');
        if (list) {
            list.innerHTML = ''; // Clear current UI
            tasks.forEach(task => {
                createTaskElement(task.text, task.done);
            });
        }
    }
}

function logout() {
    localStorage.removeItem('user');
    window.location.reload();
}

function updateClock() {
    const clockElement = document.getElementById('realtime-clock');
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
    clockElement.textContent = timeString;
}

function updateDate() {
    const dateElement = document.getElementById('dashboard-date');
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateElement.textContent = now.toLocaleDateString('en-US', options);
}

// Beginner Friendly Core Logic: Adding Tasks
function addTask() {
    const input = document.getElementById('task-input');
    const text = input.value.trim();

    if (text !== "") {
        createTaskElement(text);
        input.value = ""; // Clear for next one
        saveTasks();
        updateProgress(); // Sync stats
    }
}

// Support for one-tap chore entry (Fix Step 152)
function quickAdd(text) {
    createTaskElement(text);
    saveTasks();
    updateProgress();
}

function createTaskElement(text, done = false) {
    const list = document.getElementById('task-list');
    if (!list) return;

    const li = document.createElement('li');
    li.className = `task-item ${done ? 'completed' : ''}`;
    li.innerHTML = `
        <label>
            <input type="checkbox" ${done ? 'checked' : ''}> ${text}
        </label>
        <button class="delete-task-btn" title="Remove Task">×</button>
    `;

    // Add change listener to newly created checkbox to ensure persistence
    li.querySelector('input').addEventListener('change', () => {
        saveTasks();
        updateProgress();
    });

    list.appendChild(li);
}

function applyTheme() {
    const theme = localStorage.getItem('theme') || 'light';
    const body = document.body;
    const select = document.getElementById('theme-select');

    if (select) select.value = theme;

    if (theme === 'dark') {
        body.classList.add('dark-mode');
    } else if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
            body.classList.add('dark-mode');
        } else {
            body.classList.remove('dark-mode');
        }
    } else {
        body.classList.remove('dark-mode');
    }
}

function updateProgress() {
    const tasks = document.querySelectorAll('.task-item');
    const checkboxes = document.querySelectorAll('.task-item input[type="checkbox"]');

    let completed = 0;

    checkboxes.forEach((cb, index) => {
        if (cb.checked) {
            completed++;
            tasks[index].classList.add('completed');
        } else {
            tasks[index].classList.remove('completed');
        }
    });

    const totalTasks = tasks.length;
    const pendingTasks = totalTasks - completed;
    const percentage = totalTasks === 0 ? 0 : Math.round((completed / totalTasks) * 100);

    // Update Sidebar/Top Stats
    document.getElementById('total-tasks-val').textContent = totalTasks;
    document.getElementById('completed-tasks-val').textContent = completed;
    document.getElementById('pending-tasks-val').textContent = pendingTasks;

    // Update Gauge Chart
    const gaugeFill = document.getElementById('gauge-fill');
    const textElement = document.getElementById('progress-percentage');

    if (gaugeFill) {
        // stroke-dasharray is 125.6 (semi-circle)
        const maxDash = 125.6;
        const offset = maxDash * (1 - (percentage / 100));
        gaugeFill.style.strokeDashoffset = offset;
    }

    if (textElement) {
        textElement.textContent = percentage + '%';
    }

    // Update Trend Chart to reflect current day progress
    updateTrendChart();
}

function updateTrendChart() {
    const bars = document.querySelectorAll('.c-bar');
    if (!bars.length) return;

    const currentDay = new Date().getDay(); // 0 is Sunday, 1 is Monday...

    bars.forEach((bar, index) => {
        bar.classList.remove('spotlight');

        if (index === currentDay) {
            bar.classList.add('spotlight');
            // Show real progress for today (0% if no tasks are done)
            const progress = parseInt(document.getElementById('progress-percentage')?.textContent || '0');
            bar.style.height = `${progress}%`;
            bar.setAttribute('data-percentage', `${progress}%`);
            bar.style.opacity = '1';
        } else if (index > currentDay) {
            // Future days (Friday, Saturday, etc.) should be 0%
            bar.style.height = '0%';
            bar.setAttribute('data-percentage', '0%');
            bar.style.opacity = '0.2'; // Dimmed for future
        } else {
            // Past days - maintain their historical mock values
            if (!bar.getAttribute('data-percentage')) {
                bar.setAttribute('data-percentage', bar.style.height || '0%');
            }
            bar.style.opacity = '1';
        }
    });
}

// --- STRATEGIC OBJECTIVES LOGIC ---

let objectives = [];

function loadObjectives() {
    const saved = localStorage.getItem('objectives');
    if (saved) {
        objectives = JSON.parse(saved);
    } else {
        // Default Objectives
        objectives = [
            {
                id: Date.now(),
                title: 'Project Launch',
                desc: 'Complete core development and initial testing phase for the new app.',
                icon: '🚀',
                progress: 75
            },
            {
                id: Date.now() + 1,
                title: 'Read 12 Books',
                desc: 'Mental expansion and continuous learning goal for the current year.',
                icon: '📚',
                progress: 40
            }
        ];
        saveObjectives();
    }
    renderObjectives();
}

function saveObjectives() {
    localStorage.setItem('objectives', JSON.stringify(objectives));
}

function renderObjectives() {
    const grid = document.getElementById('objectives-grid');
    if (!grid) return;

    // Remove all cards except the "plus" card
    const cards = grid.querySelectorAll('.objective-card:not(.plus)');
    cards.forEach(c => c.remove());

    const plusCard = document.getElementById('add-objective-card');

    objectives.forEach(obj => {
        const card = document.createElement('div');
        card.className = 'objective-card';
        card.innerHTML = `
            <button class="obj-delete-btn" onclick="deleteObjective(${obj.id})">×</button>
            <div class="obj-header">
                <span class="obj-icon">${obj.icon}</span>
                <h4>${obj.title}</h4>
            </div>
            <p>${obj.desc}</p>
            <div class="obj-progress-container">
                <div class="obj-progress-bar" style="width: ${obj.progress}%"></div>
                <span>${obj.progress}%</span>
            </div>
        `;
        grid.insertBefore(card, plusCard);
    });
}

function openObjectiveModal() {
    const modal = document.getElementById('objective-modal');
    modal.classList.remove('hidden-display');
    // Clear inputs
    document.getElementById('obj-title').value = '';
    document.getElementById('obj-desc').value = '';
    document.getElementById('obj-icon').value = '🎯';
    document.getElementById('obj-progress').value = 0;
}

function closeObjectiveModal() {
    const modal = document.getElementById('objective-modal');
    modal.classList.add('hidden-display');
}

function createObjective() {
    const title = document.getElementById('obj-title').value.trim();
    const desc = document.getElementById('obj-desc').value.trim();
    const icon = document.getElementById('obj-icon').value.trim() || '🎯';
    const progress = parseInt(document.getElementById('obj-progress').value) || 0;

    if (!title) {
        alert('Please enter a title for the objective.');
        return;
    }

    const newObj = {
        id: Date.now(),
        title,
        desc,
        icon,
        progress: Math.min(100, Math.max(0, progress))
    };

    objectives.push(newObj);
    saveObjectives();
    renderObjectives();
    closeObjectiveModal();
}

function deleteObjective(id) {
    if (confirm('Are you sure you want to delete this objective?')) {
        objectives = objectives.filter(o => o.id !== id);
        saveObjectives();
        renderObjectives();
    }
}
