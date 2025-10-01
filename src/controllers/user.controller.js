const db = require('../config/db.config');

exports.saveUser = async (req, res) => {
    const { id, firstName, lastName, email, companyName } = req.body;
    
    const query = `
        INSERT INTO users (id, first_name, last_name, email, company_name)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            email = EXCLUDED.email,
            company_name = EXCLUDED.company_name
        RETURNING id, first_name, last_name;
    `;
    
    try {
        const result = await db.query(query, [id, firstName, lastName, email, companyName]);
        
        res.status(200).json({ 
            message: 'Usuario guardado exitosamente', 
            user: result.rows[0] 
        });
    } catch (error) {
        console.error('Error al guardar el usuario en DB:', error);
        if (error.code === '23505') {
            return res.status(409).json({ error: 'El correo electrónico ya está registrado.' });
        }
        res.status(500).json({ error: 'Fallo interno del servidor al guardar el usuario.' });
    }
};

exports.deleteUser = async (req, res) => {
    const { id } = req.params;
    
    const query = 'DELETE FROM users WHERE id = $1 RETURNING id;';

    try {
        const result = await db.query(query, [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        res.status(200).json({
            message: 'Usuario eliminado exitosamente, incluyendo todos sus datos contables.',
            deletedId: result.rows[0].id
        });
    } catch (error) {
        console.error('Error al eliminar el usuario en DB:', error);
        res.status(500).json({ error: 'Fallo interno del servidor al eliminar el usuario.' });
    }
};