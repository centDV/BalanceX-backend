const express = require('express');
const cors = require('cors');
require('dotenv').config();

const userRoutes = require('./src/routes/user.routes');
const accountingRoutes = require('./src/routes/accounting.routes');
const journalRoutes = require('./src/routes/journal.routes'); 

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ 
    origin: 'http://localhost:5173', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'] 
}));
app.use(express.json()); 

app.use('/api/user', userRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/accounting', journalRoutes); 

app.get('/', (req, res) => {
    res.send('Servidor Contable API funcionando.');
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});
