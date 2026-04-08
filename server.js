require('dotenv').config();
const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('🟢 MongoDB connected successfully'))
    .catch(err => console.error('🔴 MongoDB connection error:', err));

// MongoDB Schemas
const taskSchema = new mongoose.Schema({
    userEmail: String,
    text: { type: String, required: true },
    done: { type: Boolean, default: false },
    timeFrom: String,
    timeTo: String,
    notified: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const objectiveSchema = new mongoose.Schema({
    userEmail: String,
    title: { type: String, required: true },
    desc: String,
    icon: { type: String, default: '🎯' },
    progress: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

const Task = mongoose.model('Task', taskSchema);
const Objective = mongoose.model('Objective', objectiveSchema);

// Simple memory store for task status (Syncs across devices)
let completedTasks = new Set();

// Set up server-side middleware
app.use(express.static(path.join(__dirname)));
app.use(express.json());

// --- MONGODB API ROUTES ---

// TASKS API
app.get('/api/tasks', async (req, res) => {
    const { email } = req.query;
    try {
        const tasks = await Task.find({ userEmail: email }).sort({ createdAt: 1 });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

app.post('/api/tasks', async (req, res) => {
    try {
        const newTask = new Task(req.body);
        const savedTask = await newTask.save();
        res.status(201).json(savedTask);
    } catch (err) {
        res.status(400).json({ error: 'Failed to create task' });
    }
});

app.put('/api/tasks/:id', async (req, res) => {
    try {
        const updatedTask = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedTask);
    } catch (err) {
        res.status(400).json({ error: 'Failed to update task' });
    }
});

app.delete('/api/tasks/:id', async (req, res) => {
    try {
        await Task.findByIdAndDelete(req.params.id);
        res.json({ message: 'Task deleted' });
    } catch (err) {
        res.status(400).json({ error: 'Failed to delete task' });
    }
});

// OBJECTIVES API
app.get('/api/objectives', async (req, res) => {
    const { email } = req.query;
    try {
        const objectives = await Objective.find({ userEmail: email }).sort({ createdAt: 1 });
        res.json(objectives);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch objectives' });
    }
});

app.post('/api/objectives', async (req, res) => {
    try {
        const newObjective = new Objective(req.body);
        const savedObjective = await newObjective.save();
        res.status(201).json(savedObjective);
    } catch (err) {
        res.status(400).json({ error: 'Failed to create objective' });
    }
});

app.delete('/api/objectives/:id', async (req, res) => {
    try {
        await Objective.findByIdAndDelete(req.params.id);
        res.json({ message: 'Objective deleted' });
    } catch (err) {
        res.status(400).json({ error: 'Failed to delete objective' });
    }
});

// API: Check task status
app.get('/api/tasks/status', (req, res) => {
    res.json({ completed: Array.from(completedTasks) });
});

// API: Complete task (Triggered from Email)
app.get('/api/complete', async (req, res) => {
    const { task, email } = req.query;
    if (task && email) {
        try {
            await Task.findOneAndUpdate({ text: task, userEmail: email }, { done: true });
            completedTasks.add(task);
            console.log(`📡 Digital Sync: Task "${task}" marked FINISHED for ${email}.`);
            res.send(`
                <div style="font-family: sans-serif; text-align: center; padding: 50px;">
                    <h1 style="color: #6366f1;">✅ Task Finished!</h1>
                    <p>Digital Flow has updated your dashboard on all devices for <b>${email}</b>.</p>
                    <script>setTimeout(() => window.close(), 3000);</script>
                </div>
            `);
        } catch (err) {
            res.status(500).send('Database update failed.');
        }
    } else {
        res.status(400).send('Missing task name or email.');
    }
});

// API: Send Real Email Notification
app.post('/api/notify', async (req, res) => {
    const { email, taskName, type } = req.body;

    if (!email || !taskName) {
        return res.status(400).json({ error: 'Missing email or task name.' });
    }

    const isSuccess = type === 'success';
    const emailSubject = isSuccess ? `🏆 SUCCESS: ${taskName} Completed!` : `⚠️ WORK PENDING: ${taskName}`;
    const emailHeadline = isSuccess ? 'TASK COMPLETED SUCCESSFULLY!' : 'WORK PENDING - TIME EXCEEDED';
    const emailColor = isSuccess ? '#10b981' : '#ef4444';
    const emailBadgeColor = isSuccess ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';

    try {
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_PASS
            },
        });

        const mailOptions = {
            from: '"Digital Flow Achievement" <no-reply@digitalflow.io>',
            to: email,
            subject: emailSubject,
            text: isSuccess ? `CONGRATULATIONS: You completed "${taskName}" successfully!` : `URGENT: Your task "${taskName}" has exceeded its deadline!`,
            html: `
                <div style="font-family: 'Inter', sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; border-radius: 24px; border: 1px solid #1e293b;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #6366f1; margin: 0; font-size: 32px;">Digital Flow</h1>
                        <p style="color: #94a3b8; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Intelligence Performance Update</p>
                    </div>
                    
                    <div style="background: ${emailBadgeColor}; border-left: 4px solid ${emailColor}; padding: 25px; border-radius: 12px; margin-bottom: 30px;">
                        <h2 style="color: ${emailColor}; margin: 0 0 10px 0; font-size: 20px;">${emailHeadline}</h2>
                        <p style="margin: 0; font-size: 18px; font-weight: bold; color: #f8fafc;">Task Name: ${taskName}</p>
                    </div>

                    <p style="font-size: 16px; line-height: 1.6; color: #cbd5e1;">${isSuccess ? 'Outstanding work! Our monitoring system has verified the completion of this task. Keep up the momentum!' : 'Your scheduled task has surpassed its designated "To" time. PLEASE DO FAST.'}</p>
                    
                    <div style="text-align: center; margin: 40px 0;">
                        <span style="background: ${emailColor}; color: white; padding: 15px 35px; border-radius: 14px; text-decoration: none; font-weight: bold; font-size: 16px;">${isSuccess ? '🏆 Achievement Unlocked' : '⏰ Exceed Alert'}</span>
                    </div>
                    
                    <hr style="border: 0; border-top: 1px solid #1e293b; margin: 40px 0;">
                    <p style="text-align: center; color: #64748b; font-size: 12px;">Sent via Digital Flow High-Fidelity Performance Engine.</p>
                </div>
            `
        };

        let info = await transporter.sendMail(mailOptions);

        console.log(`📧 Digital Notification Sent: ${info.messageId}`);

        res.status(200).json({
            success: true,
            messageId: info.messageId
        });
    } catch (err) {
        console.error('❌ Failed to push Digital Email:', err);
        res.status(500).json({ error: 'Failed to send notification.' });
    }
});

// Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Any other routes should serve index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Real-time Dashboard Server is now live!`);
    console.log(`🔗 Access it here: http://localhost:${PORT}`);
    console.log(`🟢 Using MongoDB for persistent storage.`);
});

