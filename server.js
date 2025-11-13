const express = require('express');
const cors = require('cors');
require('dotenv').config();

const userRoutes = require('./src/routes/user.routes');
const accountingRoutes = require('./src/routes/accounting.routes');
const journalRoutes = require('./src/routes/journal.routes');
const reportsRoutes = require('./src/routes/reports.routes');

const app = express();
const PORT = process.env.PORT || 3001;
app.use(cors({ 
    origin: 'http://localhost:5173', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'] 
}));
app.use(express.json()); 

// Simple request logger to help debug routing issues
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});

app.use(cors({ 
    origin: 'http://localhost:5173', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'] 
}));
app.use(express.json()); 

app.use('/api/user', userRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/accounting', journalRoutes);
app.use('/api/accounting', reportsRoutes); 

app.get('/', (req, res) => {
    res.send('Servidor Contable API funcionando.');
});

// Fallback 404 JSON response to avoid HTML from express default
app.use((req, res) => {
    res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});
