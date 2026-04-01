const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Set up server-side middleware
app.use(express.static(path.join(__dirname)));

// Root route (Google Sign-in will work here!)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Any other routes should serve index.html for single-page style transitions
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Real-time Dashboard Server is now live!`);
    console.log(`🔗 Access it here: http://localhost:${PORT}`);
    console.log(`🛡️  Google Login will now function correctly at this address.`);
});
