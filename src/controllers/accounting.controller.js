const db = require('../config/db.config');

exports.getCatalogo = async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'Falta el ID de usuario.' });
    }

    const query = `
        SELECT id, app_user_id, codigo, nombre, naturaleza, es_cuenta_mayor, parent_id 
        FROM catalogo 
        WHERE app_user_id = $1 
        ORDER BY codigo ASC;
    `;

    try {
        const result = await db.query(query, [userId]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error al obtener el catálogo:', error);
        res.status(500).json({ error: 'Fallo interno del servidor al obtener el catálogo.' });
    }
};

exports.addAccount = async (req, res) => {
    const { userId, codigo, nombre, naturaleza, esCuentaMayor,parent_id } = req.body;

    if (!userId || !codigo || !nombre || !naturaleza) {
        return res.status(400).json({ error: 'Faltan campos requeridos.' });
    }

    
    if (!['D', 'C'].includes(naturaleza)) {
        return res.status(400).json({ error: 'La naturaleza debe ser D (Deudora) o C (Acreedora).' });
    }

    const query = `
        INSERT INTO catalogo (app_user_id, codigo, nombre, naturaleza, es_cuenta_mayor, parent_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, codigo, nombre;
    `;
    
    try {
        const result = await db.query(query, [userId, codigo, nombre, naturaleza, esCuentaMayor, parent_id || null]);
        res.status(201).json({ 
            message: 'Cuenta creada exitosamente', 
            account: result.rows[0] 
        });
    } catch (error) {
        console.error('Error al agregar cuenta:', error);
        if (error.code === '23505') {
             return res.status(409).json({ error: 'El código de cuenta ya existe para este usuario.' });
        }
        res.status(500).json({ error: 'Fallo interno del servidor al agregar la cuenta.' });
    }
};

exports.deleteAccount = async (req, res) => {
    const { id: accountId } = req.params; 
    const { userId } = req.query; 

    if (!accountId || !userId) {
        return res.status(400).json({ error: 'Faltan campos requeridos (ID de cuenta o ID de usuario).' });
    }

    const query = `
        DELETE FROM catalogo 
        WHERE id = $1 AND app_user_id = $2
        RETURNING id;
    `;

    try {
        const result = await db.query(query, [accountId, userId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Cuenta no encontrada o no pertenece al usuario.' });
        }

        res.status(200).json({ 
            message: 'Cuenta eliminada exitosamente', 
            accountId: accountId 
        });

    } catch (error) {
        console.error('Error al borrar la cuenta:', error);
        
        if (error.code === '23503') { 
            return res.status(409).json({ 
                error: 'No se puede eliminar la cuenta. Podría tener transacciones asociadas o cuentas dependientes.',
                details: 'La base de datos impide la eliminación por restricciones de integridad.'
            });
        }
        
        res.status(500).json({ error: 'Fallo interno del servidor al borrar la cuenta.' });
    }
};

exports.ledgerizeAccounts = async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'ID de usuario es requerido para la mayorización.' });
    }

    try {
        await db.query('BEGIN');

        const deleteBalancesQuery = `
            DELETE FROM libro_mayor 
            WHERE app_user_id = $1;
        `;
        await db.query(deleteBalancesQuery, [userId]);

        const calculateDetailBalancesQuery = `
            WITH AccountNet AS (
                SELECT
                    ld.cuenta_id,
                    c.naturaleza,
                    c.parent_id,
                    SUM(ld.debito) AS total_debito,
                    SUM(ld.credito) AS total_credito
                FROM libro_diario ld
                JOIN asientos a ON ld.asiento_id = a.id
                JOIN catalogo c ON ld.cuenta_id = c.id
                WHERE a.app_user_id = $1
                AND c.es_cuenta_mayor = FALSE -- Solo cuentas de detalle
                GROUP BY ld.cuenta_id, c.naturaleza, c.parent_id
            ),
            DetailBalances AS (
                SELECT
                    cuenta_id,
                    naturaleza,
                    parent_id,
                    CASE
                        WHEN naturaleza = 'D' THEN total_debito - total_credito
                        ELSE total_credito - total_debito
                    END AS saldo_calculado
                FROM AccountNet
            )
            INSERT INTO libro_mayor (app_user_id, cuenta_id, saldo_actual, ultima_mayorizacion)
            SELECT
                $1, 
                db.cuenta_id,
                db.saldo_calculado,
                NOW()
            FROM DetailBalances db
            RETURNING cuenta_id; -- Retorna los IDs de las cuentas de detalle mayorizadas
        `;
        const detailResult = await db.query(calculateDetailBalancesQuery, [userId]);
        const calculateMajorAccountBalancesQuery = `
            WITH RECURSIVE AccountHierarchy AS (
                -- Anchor: Cuentas de detalle (ya con saldo en libro_mayor)
                SELECT
                    c.id AS account_id,
                    c.parent_id,
                    c.es_cuenta_mayor,
                    lm.saldo_actual AS balance
                FROM catalogo c
                JOIN libro_mayor lm ON c.id = lm.cuenta_id
                WHERE c.app_user_id = $1
                
                UNION ALL
                
                -- Recursive part: Propagar saldos hacia arriba
                SELECT
                    p.id AS account_id,
                    p.parent_id,
                    p.es_cuenta_mayor,
                    h.balance -- El saldo de la cuenta hija se propaga
                FROM catalogo p
                JOIN AccountHierarchy h ON p.id = h.parent_id
                WHERE p.app_user_id = $1
            ),
            MajorAccountBalances AS (
                SELECT
                    account_id,
                    SUM(balance) AS total_saldo
                FROM AccountHierarchy
                GROUP BY account_id
                HAVING (SELECT es_cuenta_mayor FROM catalogo WHERE id = account_id) = TRUE 
            )
            INSERT INTO libro_mayor (app_user_id, cuenta_id, saldo_actual, ultima_mayorizacion)
            SELECT
                $1,
                mab.account_id,
                mab.total_saldo,
                NOW()
            FROM MajorAccountBalances mab
            ON CONFLICT (app_user_id, cuenta_id)
            DO UPDATE SET
                saldo_actual = EXCLUDED.saldo_actual,
                ultima_mayorizacion = EXCLUDED.ultima_mayorizacion;
        `;

        await db.query(calculateMajorAccountBalancesQuery, [userId]);
        
        await db.query('COMMIT');

        res.status(200).json({ 
            message: 'Mayorización completada exitosamente para todas las cuentas (detalle y mayores).',
            detailAccountsMayorized: detailResult.rowCount
        });

    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error durante la mayorización de cuentas:', error);
        res.status(500).json({ error: 'Error interno del servidor al mayorizar las cuentas.' });
    }
};



exports.getLedger = async (req, res) => {
    const userId = req.query.userId; 

    if (!userId) {
        return res.status(400).json({ error: 'ID de usuario es requerido para obtener el Libro Mayor.' });
    }

    try {
        const query = `
            SELECT 
                lm.cuenta_id, 
                lm.saldo_actual, 
                TO_CHAR(lm.ultima_mayorizacion, 'YYYY-MM-DD HH24:MI:SS') AS ultima_mayorizacion,
                c.codigo, 
                c.nombre, 
                c.naturaleza
            FROM libro_mayor lm
            JOIN catalogo c ON lm.cuenta_id = c.id
            WHERE lm.app_user_id = $1
            ORDER BY c.codigo ASC;
        `;
        
        const result = await db.query(query, [userId]);
        
        const ledgerEntries = result.rows.map(row => ({
            ...row,
            saldo_actual: parseFloat(row.saldo_actual)
        }));

        res.json(ledgerEntries);

    } catch (error) {
        console.error('Error al obtener el Libro Mayor:', error);
        res.status(500).json({ error: 'Error interno del servidor al obtener el Libro Mayor.' });
    }
};


exports.getAccountMovements = async (req, res) => {
    const { userId, accountId } = req.query; 

    if (!userId || !accountId) {
        return res.status(400).json({ error: 'Faltan campos requeridos (ID de usuario o ID de cuenta).' });
    }

    try {
        const descendantQuery = `
            WITH RECURSIVE AccountTree AS (
                -- Anchor: La cuenta consultada
                SELECT id 
                FROM catalogo 
                WHERE id = $1 AND app_user_id = $2
                
                UNION ALL
                
                -- Recursive part: Buscar hijos
                SELECT c.id
                FROM catalogo c
                JOIN AccountTree at ON c.parent_id = at.id
                WHERE c.app_user_id = $2
            )
            SELECT id FROM AccountTree;
        `;
        
        const descendantResult = await db.query(descendantQuery, [accountId, userId]);
        
        const accountIdsToSearch = descendantResult.rows.map(row => row.id);

        if (accountIdsToSearch.length === 0) {
            return res.status(404).json({ error: 'La cuenta no fue encontrada para el usuario especificado.' });
        }

        const query = `
            SELECT 
                a.fecha, 
                a.referencia, 
                a.descripcion, 
                ld.debito, 
                ld.credito,
                c.codigo AS cuenta_codigo,    -- Añadido: código de la cuenta real
                c.nombre AS cuenta_nombre     -- Añadido: nombre de la cuenta real
            FROM libro_diario ld
            JOIN asientos a ON ld.asiento_id = a.id
            JOIN catalogo c ON ld.cuenta_id = c.id -- Unir para obtener el detalle de la cuenta
            WHERE ld.cuenta_id = ANY($1::int[]) -- Uso de ANY para buscar en el array de IDs
            AND a.app_user_id = $2
            ORDER BY a.fecha ASC, a.id ASC;
        `;

        const result = await db.query(query, [accountIdsToSearch, userId]);
        
        const movements = result.rows.map(row => ({
            fecha: row.fecha,
            referencia: row.referencia,
            descripcion: row.descripcion,
            debito: parseFloat(row.debito),
            credito: parseFloat(row.credito),
            cuenta_afectada_codigo: row.cuenta_codigo,
            cuenta_afectada_nombre: row.cuenta_nombre
        }));

        res.status(200).json(movements);
    } catch (error) {
        console.error('Error al obtener movimientos de cuenta:', error);
        res.status(500).json({ error: 'Fallo interno del servidor al obtener los movimientos de la cuenta.' });
    }
};