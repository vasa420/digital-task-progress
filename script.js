document.addEventListener('DOMContentLoaded', () => {
    // Initialize Dashboard Components
    updateClock();
    updateDate();
    // checkAndResetTasks(); // Removed as we are now using MongoDB for persistent storage
    // loadTasks();  // Moved to showDashboard to ensure user context
    applyTheme();
    loadNotificationSettings();
    updateTrendChart();
    updateProgress();
    // loadObjectives(); // Moved to showDashboard to use user context from MongoDB

    // Check for existing session (Instant Load)
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
        showDashboard(JSON.parse(savedUser));
    }

    // Initialize Clerk
    const clerkPublishableKey = "pk_test_c3VidGxlLW5hcndoYWwtNTAuY2xlcmsuYWNjb3VudHMuZGV2JA";
    
    window.addEventListener('load', async function () {
        if (!window.Clerk) {
            console.error('Clerk SDK not loaded');
            return;
        }

        await window.Clerk.load();

        window.Clerk.addListener(({ user }) => {
            if (user) {
                // User is signed in
                const userData = {
                    given_name: user.firstName || 'User',
                    name: user.fullName || 'User',
                    picture: user.imageUrl,
                    email: user.primaryEmailAddress ? user.primaryEmailAddress.emailAddress : ''
                };
                localStorage.setItem('user', JSON.stringify(userData));
                showDashboard(userData);
            } else {
                // User is signed out - Mount Sign In if on login view
                const loginView = document.getElementById('login-view');
                if (loginView && !loginView.classList.contains('hidden-display')) {
                    const container = document.getElementById('clerk-signin-container');
                    if (container) {
                        window.Clerk.mountSignIn(container, {
                            appearance: {
                                elements: {
                                    rootBox: {
                                        width: '100%',
                                        display: 'flex',
                                        justifyContent: 'center'
                                    },
                                    card: {
                                        border: 'none',
                                        boxShadow: 'none',
                                        background: 'transparent'
                                    },
                                    headerTitle: { display: 'none' },
                                    headerSubtitle: { display: 'none' },
                                    dividerRow: { display: 'none' },
                                    formFieldRow: { display: 'none' },
                                    formButtonPrimary: { display: 'none' },
                                    footerAction: { display: 'none' },
                                    socialButtonsBlockButton: {
                                        width: '100%',
                                        height: '54px',
                                        borderRadius: '14px',
                                        border: '1px solid var(--glass-border)',
                                        background: 'var(--bg-white)',
                                        color: 'var(--text-bright)',
                                        fontSize: '1rem',
                                        fontWeight: '600'
                                    },
                                    footer: { display: 'none' },
                                    branding: { display: 'none' }
                                }
                            }
                        });
                    }
                }
            }
        });
    });

    // Set interval for real-time clock
    setInterval(updateClock, 1000);

    // Event Listeners
    // Task Input Validation Listener
    ['task-input', 'task-time-from', 'task-time-to'].forEach(id => {
        document.getElementById(id).addEventListener('input', validateTaskForm);
    });

    document.getElementById('add-btn').addEventListener('click', addTask);
    document.getElementById('task-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !document.getElementById('add-btn').disabled) addTask();
    });

    document.getElementById('task-list').addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') updateProgress();
    });

    document.getElementById('task-list').addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-task-btn')) {
            const item = e.target.closest('.task-item');
            const taskId = item.getAttribute('data-id');
            
            item.style.opacity = '0';
            item.style.transform = 'translateX(20px)';
            
            try {
                await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
                setTimeout(() => {
                    item.remove();
                    updateProgress();
                }, 300);
            } catch (err) {
                console.error('❌ Failed to delete task:', err);
            }
        }
    });

    // Logout handler
    document.getElementById('logout-btn').addEventListener('click', () => {
        showSystemModal('Confirm Logout', 'Are you sure you want to end your session?', 'warning', 'Logout', 'Stay')
            .then(confirmed => {
                if (confirmed) logout();
            });
    });

    // Theme Save Handler
    const saveBtn = document.getElementById('save-settings-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const select = document.getElementById('theme-select');
            const theme = select.value;
            localStorage.setItem('theme', theme);
            applyTheme();

            const emailToggle = document.getElementById('email-notif-toggle');
            if (emailToggle) {
                localStorage.setItem('emailNotifications', emailToggle.checked);
            }

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

    // Start background checks for overdue tasks (every 30 seconds for better real-time feel)
    setInterval(checkOverdueTasks, 30000);
});



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
        // If login view is already hidden, just ensure dashboard is active
        if (loginView.classList.contains('hidden-display')) {
            dashView.classList.remove('hidden-display', 'hidden');
            dashView.classList.add('active');
            return;
        }

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

    // Mobile Sync Button Handler
    const syncBtn = document.getElementById('enable-notifications-btn');
    if (syncBtn) {
        syncBtn.addEventListener('click', async () => {
            if (!("Notification" in window)) {
                showToast("System Error", "This device doesn't support notifications.", "overdue");
                return;
            }

            const permission = await Notification.requestPermission();
            if (permission === "granted") {
                syncBtn.classList.add('active');
                syncBtn.textContent = "✅ Linked";
                
                // Send immediate test to verify "Digital Uplink"
                new Notification("Digital Flow System", {
                    body: "🚀 Mobile Sync Successful! You will now receive alerts here.",
                    icon: "https://ui-avatars.com/api/?name=DF&background=6366f1&color=fff"
                });

                showToast("Sync Successful", "Mobile Digital Uplink is now ACTIVE.", "success");
            } else {
                showToast("Sync Failed", "Please enable notifications in your browser settings.", "overdue");
            }
        });

        // Auto-check if already granted
        if (Notification.permission === "granted") {
            syncBtn.classList.add('active');
            syncBtn.textContent = "✅ Linked";
        }
    }

    // Load Data from MongoDB
    loadTasksFromDB(user.email);
    loadObjectivesFromDB(user.email);

    // Initialize tasks if none exist
    // This will be handled by loadTasksFromDB checking for empty results
}

async function loadTasksFromDB(email) {
    try {
        const response = await fetch(`/api/tasks?email=${email}`);
        const tasks = await response.json();
        const list = document.getElementById('task-list');
        if (list) {
            list.innerHTML = '';
            if (tasks.length === 0) {
                addInitialTasks(email);
            } else {
                tasks.forEach(task => {
                    createTaskElement(task.text, task.done, task.timeFrom, task.timeTo, task.notified, task._id);
                });
                updateProgress();
            }
        }
    } catch (err) {
        console.error('❌ Failed to fetch tasks:', err);
    }
}

async function addInitialTasks(email) {
    const defaults = [
        { text: "Wash dishes", done: true, timeFrom: "08:00", timeTo: "08:30" },
        { text: "Buy groceries", done: false, timeFrom: "10:00", timeTo: "11:00" },
        { text: "Pay bills", done: false, timeFrom: "14:00", timeTo: "14:30" },
        { text: "Walk the dog", done: false, timeFrom: "17:00", timeTo: "17:30" },
        { text: "Buy milk at the store", done: false, timeFrom: "18:00", timeTo: "18:30" }
    ];

    for (const task of defaults) {
        await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...task, userEmail: email })
        });
    }
    loadTasksFromDB(email);
}

function logout() {
    localStorage.removeItem('user');
    if (window.Clerk && window.Clerk.user) {
        window.Clerk.signOut().then(() => {
            window.location.reload();
        });
    } else {
        window.location.reload();
    }
}

function updateClock() {
    const clockElement = document.getElementById('realtime-clock');
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
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
async function addTask() {
    const input = document.getElementById('task-input');
    const timeFromInput = document.getElementById('task-time-from');
    const timeToInput = document.getElementById('task-time-to');

    const text = input.value.trim();
    let timeFrom = timeFromInput.value;
    let timeTo = timeToInput.value;

    const savedUser = localStorage.getItem('user');
    const user = savedUser ? JSON.parse(savedUser) : null;

    if (text !== "" && timeFrom && timeTo && user) {
        const newTask = {
            text,
            timeFrom,
            timeTo,
            userEmail: user.email,
            done: false
        };

        try {
            await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTask)
            });
            
            input.value = ""; 
            timeFromInput.value = "";
            timeToInput.value = "";
            validateTaskForm();
            loadTasksFromDB(user.email);
        } catch (err) {
            console.error('❌ Failed to add task:', err);
        }
    }
}

function validateTaskForm() {
    const text = document.getElementById('task-input').value.trim();
    const fromTimeStr = document.getElementById('task-time-from').value;
    const toTimeStr = document.getElementById('task-time-to').value;
    const errorEl = document.getElementById('time-error-msg');
    const addBtn = document.getElementById('add-btn');

    let isTimeValid = true;
    let errorMsg = "";

    if (fromTimeStr && toTimeStr) {
        const now = new Date();
        const [fromH, fromM] = fromTimeStr.split(':').map(Number);
        const [toH, toM] = toTimeStr.split(':').map(Number);

        let fromDate = new Date();
        fromDate.setHours(fromH, fromM, 0, 0);

        let toDate = new Date();
        toDate.setHours(toH, toM, 0, 0);

        // Allow a 5-minute "grace period" for tasks starting right now or just missed.
        const gracePeriod = 5 * 60 * 1000; // 5 minutes

        // Intelligent AM/PM handler: 
        // If the 24h conversion (e.g., 01:50 AM) has passed, 
        // check if adding 12h (01:50 PM) makes it valid for today.
        if (fromDate.getTime() + gracePeriod < now.getTime() && fromH < 12) {
            const pmFromDate = new Date(fromDate.getTime() + 12 * 60 * 60 * 1000);
            const pmToDate = new Date(toDate.getTime() + 12 * 60 * 60 * 1000);
            
            if (pmFromDate.getTime() + gracePeriod >= now.getTime() && pmToDate > pmFromDate) {
                // User almost certainly meant PM version. Allow validation to proceed cleanly.
                fromDate = pmFromDate;
                toDate = pmToDate;
            }
        }
        
        if (fromDate.getTime() + gracePeriod < now.getTime()) {
            isTimeValid = false;
            errorMsg = "🕒 Selected time has already passed. Please update to a future time.";
        } else if (toDate <= fromDate) {
            isTimeValid = false;
            errorMsg = "⚠️ 'To' time must be after 'From' time.";
        }
    }

    if (errorEl) {
        errorEl.textContent = errorMsg;
        errorEl.classList.toggle('active', !isTimeValid);
    }

    // Enable only if all fields have values AND time is valid
    if (text !== "" && fromTimeStr !== "" && toTimeStr !== "" && isTimeValid) {
        addBtn.disabled = false;
    } else {
        addBtn.disabled = true;
    }
}

function createTaskElement(text, done = false, timeFrom = "", timeTo = "", notified = false, id = null) {
    const list = document.getElementById('task-list');
    if (!list) return;

    const li = document.createElement('li');
    li.className = `task-item ${done ? 'completed' : ''}`;
    li.setAttribute('data-time-from', timeFrom);
    li.setAttribute('data-time-to', timeTo);
    li.setAttribute('data-notified', notified);
    if (id) li.setAttribute('data-id', id);

    let timeBadge = '';
    if (timeFrom || timeTo) {
        const from = timeFrom ? timeFrom.padStart(5, '0') : '??';
        const to = timeTo ? timeTo.padStart(5, '0') : '??';
        timeBadge = `<span class="task-time-badge">${from} - ${to}</span>`;
    }

    li.innerHTML = `
        ${timeBadge}
        <div class="task-item-content">
            <div class="task-label-group">
                <label>
                    <input type="checkbox" ${done ? 'checked' : ''}>
                    <span class="task-text-content">${text}</span>
                </label>
            </div>
            <button class="delete-task-btn" title="Remove Task">×</button>
        </div>
    `;

    const checkbox = li.querySelector('input');
    checkbox.addEventListener('change', async () => {
        const isDone = checkbox.checked;
        if (isDone) {
            li.classList.add('completed');
        } else {
            li.classList.remove('completed');
        }

        try {
            await fetch(`/api/tasks/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ done: isDone })
            });

            if (isDone) {
                const taskText = li.querySelector('.task-text-content').textContent.trim();
                const savedUser = localStorage.getItem('user');
                const user = savedUser ? JSON.parse(savedUser) : null;
                
                if (user && user.email) {
                    fetch('/api/notify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: user.email, taskName: taskText, type: 'success' })
                    })
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            showToast("Achievement Unlocked", "Success alert sent to your mobile!", "success");
                        }
                    });
                }
            }
            updateProgress();
        } catch (err) {
            console.error('❌ Failed to update task:', err);
        }
    });

    list.appendChild(li);
    if (!done) checkSingleTaskOverdue(li);
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

async function loadObjectivesFromDB(email) {
    try {
        const response = await fetch(`/api/objectives?email=${email}`);
        objectives = await response.json();
        renderObjectives();
    } catch (err) {
        console.error('❌ Failed to fetch objectives:', err);
    }
}

function renderObjectives() {
    const grid = document.getElementById('objectives-grid');
    if (!grid) return;

    const cards = grid.querySelectorAll('.objective-card:not(.plus)');
    cards.forEach(c => c.remove());

    const plusCard = document.getElementById('add-objective-card');

    objectives.forEach(obj => {
        const card = document.createElement('div');
        card.className = 'objective-card';
        card.innerHTML = `
            <button class="obj-delete-btn" onclick="deleteObjectiveFromDB('${obj._id}')">×</button>
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

async function createObjective() {
    const title = document.getElementById('obj-title').value.trim();
    const desc = document.getElementById('obj-desc').value.trim();
    const icon = document.getElementById('obj-icon').value.trim() || '🎯';
    const progress = parseInt(document.getElementById('obj-progress').value) || 0;

    const savedUser = localStorage.getItem('user');
    const user = savedUser ? JSON.parse(savedUser) : null;

    if (!title || !user) {
        showSystemModal('Missing Data', 'Please ensure you are signed in and provide a title.', 'warning');
        return;
    }

    const newObj = {
        userEmail: user.email,
        title,
        desc,
        icon,
        progress: Math.min(100, Math.max(0, progress))
    };

    try {
        await fetch('/api/objectives', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newObj)
        });
        loadObjectivesFromDB(user.email);
        closeObjectiveModal();
    } catch (err) {
        console.error('❌ Failed to create objective:', err);
    }
}

async function deleteObjectiveFromDB(id) {
    const confirmed = await showSystemModal(
        'Delete Objective', 
        'Are you sure you want to permanently remove this objective?', 
        'danger', 
        'Delete', 
        'Cancel'
    );
    
    if (confirmed) {
        try {
            await fetch(`/api/objectives/${id}`, { method: 'DELETE' });
            const savedUser = localStorage.getItem('user');
            const user = savedUser ? JSON.parse(savedUser) : null;
            if (user) loadObjectivesFromDB(user.email);
            showToast("Objective Removed", "Strategic objective deleted from cloud.", "warning");
        } catch (err) {
            console.error('❌ Failed to delete objective:', err);
        }
    }
}

// --- REAL-TIME OVERDUE & NOTIFICATION LOGIC ---

function checkOverdueTasks() {
    const tasks = document.querySelectorAll('.task-item:not(.completed)');
    tasks.forEach(task => {
        checkSingleTaskOverdue(task);
    });
}

function checkSingleTaskOverdue(taskEl) {
    const timeTo = taskEl.getAttribute('data-time-to');
    const isNotified = taskEl.getAttribute('data-notified') === 'true';
    
    if (!timeTo) return;

    const now = new Date();
    const [hours, minutes] = timeTo.split(':').map(Number);
    const deadline = new Date();
    deadline.setHours(hours, minutes, 0, 0);

    if (now > deadline) {
        taskEl.classList.add('overdue');
        
        if (!isNotified) {
            const taskName = taskEl.querySelector('.task-text-content').textContent;
            const taskId = taskEl.getAttribute('data-id');
            sendOverdueNotification(taskName);
            taskEl.setAttribute('data-notified', 'true');
            
            // Persist notified state in DB
            if (taskId) {
                fetch(`/api/tasks/${taskId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ notified: true })
                });
            }
        }
    } else {
        taskEl.classList.remove('overdue');
    }
}

async function sendOverdueNotification(taskName) {
    const isEnabled = localStorage.getItem('emailNotifications') !== 'false'; // Default to true
    const savedUser = localStorage.getItem('user');
    const user = savedUser ? JSON.parse(savedUser) : null;
    
    if (isEnabled && user && user.email) {
        console.log(`📧 Dispatching Real Digital Email for: ${taskName} to ${user.email}`);
        
        // Show immediate local toast
        showToast("Email Hub", `Dispatching URGENT alert for: "${taskName}"`, "overdue");

        try {
            // Push Browser Notification (Real Mobile Alert if browser is open)
            if ("Notification" in window && Notification.permission === "granted") {
                new Notification(`⚠️ TASK EXCEEDED: ${taskName}`, {
                    body: "WORK PENDING! DONE FAST!",
                    icon: "https://ui-avatars.com/api/?name=DF&background=6366f1&color=fff"
                });
            }

            const response = await fetch('/api/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: user.email,
                    taskName: taskName
                })
            });

            const data = await response.json();
            if (data.success) {
                console.log(`✅ Reality Notification Delivered. ID: ${data.messageId}`);
                showToast("Email Sent!", `Real notification pushed to: ${user.email}`, "success");
            }
        } catch (err) {
            console.error('❌ Failed to push reality notification:', err);
        }
    } else {
        console.log(`🔕 Notification suppressed. Reason: ${!isEnabled ? 'Disabled' : 'No Email Found'}`);
        showToast("System Alert", `Task "${taskName}" is overdue! Done fast!`, "overdue");
    }
}

function loadNotificationSettings() {
    const isEnabled = localStorage.getItem('emailNotifications') !== 'false';
    const emailToggle = document.getElementById('email-notif-toggle');
    if (emailToggle) {
        emailToggle.checked = isEnabled;
    }

    // Update Uplink Badge based on browser permission as well
    const uplinkBadge = document.getElementById('uplink-badge');
    if (uplinkBadge && Notification.permission === "granted") {
        uplinkBadge.textContent = "✅ System Linked";
        uplinkBadge.className = "status-indicator success";
    }
}

function showToast(title, message, type = "info") {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type === 'overdue' ? 'overdue' : ''} ${type === 'success' ? 'success' : ''}`;
    
    let icon = '🔔';
    if (type === 'overdue') icon = '📧';
    if (type === 'success') icon = '✅';
    
    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-content">
            <span class="toast-title">${title}</span>
            <span class="toast-message">${message}</span>
            <div class="toast-meta">
                <span class="toast-tag">Digital Flow Mail</span>
            </div>
        </div>
    `;

    container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('active');
    });

    // Auto remove after 10 seconds
    setTimeout(() => {
        toast.classList.remove('active');
        setTimeout(() => toast.remove(), 600);
    }, 10000);

    // Click to dismiss
    toast.addEventListener('click', () => {
        toast.classList.remove('active');
        setTimeout(() => toast.remove(), 600);
    });
}

// --- PROFESSIONAL SYSTEM MODAL HANDLER ---

function showSystemModal(title, message, type = 'info', confirmText = 'OK', cancelText = null) {
    return new Promise((resolve) => {
        const modal = document.getElementById('system-modal');
        const titleEl = document.getElementById('modal-title');
        const messageEl = document.getElementById('modal-message');
        const footer = document.getElementById('modal-footer');
        const indicator = document.getElementById('modal-indicator');

        if (!modal || !titleEl || !messageEl || !footer) return;

        titleEl.textContent = title;
        messageEl.textContent = message;
        footer.innerHTML = '';

        // Update indicator color
        indicator.className = 'modal-indicator';
        if (type === 'warning') indicator.classList.add('warning');
        if (type === 'danger') indicator.classList.add('danger');

        // Create buttons
        if (cancelText) {
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'modal-btn secondary';
            cancelBtn.textContent = cancelText;
            cancelBtn.onclick = () => {
                modal.classList.add('hidden-display');
                resolve(false);
            };
            footer.appendChild(cancelBtn);
        }

        const confirmBtn = document.createElement('button');
        confirmBtn.className = `modal-btn ${type === 'danger' ? 'danger' : 'primary'}`;
        confirmBtn.textContent = confirmText;
        confirmBtn.onclick = () => {
            modal.classList.add('hidden-display');
            resolve(true);
        };
        footer.appendChild(confirmBtn);

        modal.classList.remove('hidden-display');
        
        // Add one-time click listener for overlay
        const handleOutsideClick = (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden-display');
                modal.removeEventListener('click', handleOutsideClick);
                resolve(false);
            }
        };
        modal.addEventListener('click', handleOutsideClick);
    });
}
