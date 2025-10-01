const db = require('../config/db.config'); 

exports.registerAsiento = async (req, res) => {
    const { userId, fecha, descripcion, referencia, lineas } = req.body;

    if (!userId || !fecha || !descripcion || !lineas || lineas.length < 2) {
        return res.status(400).json({
            error: 'Faltan datos obligatorios o el asiento requiere al menos dos líneas.'
        });
    }

    const totalDebito = lineas.reduce((sum, line) => sum + (line.debito || 0), 0);
    const totalCredito = lineas.reduce((sum, line) => sum + (line.credito || 0), 0);

    const debitoCents = Math.round(totalDebito * 100);
    const creditoCents = Math.round(totalCredito * 100);

    if (debitoCents !== creditoCents) {
        return res.status(400).json({
            error: `El asiento no está balanceado. Débito total: ${totalDebito.toFixed(2)} vs Crédito total: ${totalCredito.toFixed(2)}.`
        });
    }

    try {
        await db.query('BEGIN');

        const asientoQuery = `
            INSERT INTO asientos (app_user_id, fecha, descripcion, referencia)
            VALUES ($1, $2, $3, $4)
            RETURNING id;
        `;
        const asientoResult = await db.query(asientoQuery, [
            userId,
            fecha,
            descripcion,
            referencia || null
        ]);
        const asientoId = asientoResult.rows[0].id;

        for (const line of lineas) {
            const diarioQuery = `
                INSERT INTO libro_diario (asiento_id, cuenta_id, debito, credito)
                VALUES ($1, $2, $3, $4);
            `;
            const debito = parseFloat(line.debito) || 0.0;
            const credito = parseFloat(line.credito) || 0.0;

            await db.query(diarioQuery, [
                asientoId,
                line.cuenta_id,
                debito,
                credito
            ]);
        }

        await db.query('COMMIT');

        res.status(201).json({
            message: 'Asiento registrado exitosamente.',
            asientoId: asientoId,
            total: totalDebito.toFixed(2)
        });
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error al registrar el asiento (ROLLBACK):', error);

        if (error.code === '23503') {
            return res.status(409).json({
                error: 'Fallo de integridad de datos. Una cuenta ID en las líneas no es válida o no existe.',
                details: error.detail
            });
        }

        res.status(500).json({
            error: 'Fallo interno del servidor al procesar el asiento.'
        });
    }
};

exports.getJournal = async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: "Se requiere userId" });
  }

  try {
    const query = `
      SELECT a.id AS asiento_id, a.fecha, a.descripcion, a.referencia,
             l.id AS linea_id, l.cuenta_id, c.nombre AS cuenta_nombre,
             l.debito, l.credito
      FROM asientos a
      JOIN libro_diario l ON a.id = l.asiento_id
      JOIN catalogo c ON l.cuenta_id = c.id
      WHERE a.app_user_id = $1
      ORDER BY a.fecha ASC, a.id ASC, l.id ASC;
    `;

    const result = await db.query(query, [userId]);

    const asientos = {};
    result.rows.forEach(row => {
      if (!asientos[row.asiento_id]) {
        asientos[row.asiento_id] = {
          id: row.asiento_id,
          fecha: row.fecha,
          descripcion: row.descripcion,
          referencia: row.referencia,
          lineas: []
        };
      }

      asientos[row.asiento_id].lineas.push({
        id: row.linea_id,
        cuenta_id: row.cuenta_id,
        cuenta_nombre: row.cuenta_nombre,
        debito: parseFloat(row.debito),
        credito: parseFloat(row.credito)
      });
    });

    res.json(Object.values(asientos));
  } catch (error) {
    console.error("Error al obtener libro diario:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};

exports.deleteAsiento = async (req, res) => {
    const { asientoId } = req.params;

    if (!asientoId) {
        return res.status(400).json({ error: "Se requiere el ID del asiento a eliminar." });
    }

    try {
        await db.query('BEGIN');

        await db.query(
            `DELETE FROM libro_diario WHERE asiento_id = $1`,
            [asientoId]
        );

        const result = await db.query(
            `DELETE FROM asientos WHERE id = $1 RETURNING id`,
            [asientoId]
        );

        if (result.rowCount === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ error: "Asiento no encontrado." });
        }

        await db.query('COMMIT');

        res.json({
            message: "Asiento eliminado exitosamente.",
            asientoId: asientoId
        });
    } catch (error) {
        await db.query('ROLLBACK');
        console.error("Error al eliminar asiento (ROLLBACK):", error);
        res.status(500).json({ error: "Error interno al eliminar el asiento." });
    }
};

