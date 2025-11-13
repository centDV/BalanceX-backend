const db = require('../config/db.config');

exports.getBalanceSheet = async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'Se requiere userId' });
  }

  try {
    const query = `
      SELECT 
        c.id,
        c.codigo,
        c.nombre,
        c.naturaleza,
        c.es_cuenta_mayor,
        COALESCE(SUM(l.debito - l.credito), 0) as saldo
      FROM catalogo c
      LEFT JOIN libro_diario l ON c.id = l.cuenta_id
      LEFT JOIN asientos a ON l.asiento_id = a.id
      WHERE c.app_user_id = $1
      GROUP BY c.id, c.codigo, c.nombre, c.naturaleza, c.es_cuenta_mayor
      ORDER BY c.codigo ASC;
    `;

    const result = await db.query(query, [userId]);
    const cuentas = result.rows;

    // Clasificar cuentas según su naturaleza y código
    const activos = {
      corrientes: [],
      noCorrientes: [],
      totalActivos: 0,
    };

    const pasivos = {
      corrientes: [],
      noCorrientes: [],
      totalPasivos: 0,
    };

    const patrimonio = [];

    cuentas.forEach((cuenta) => {
      const item = {
        codigo: cuenta.codigo,
        nombre: cuenta.nombre,
        saldo: parseFloat(cuenta.saldo),
      };

      // Determinar clasificación por código
      // Códigos 1xxx = Activos
      if (cuenta.codigo.startsWith('1')) {
        if (cuenta.codigo.startsWith('11') || cuenta.codigo.startsWith('12')) {
          activos.corrientes.push(item);
          activos.totalActivos += item.saldo;
        } else {
          activos.noCorrientes.push(item);
          activos.totalActivos += item.saldo;
        }
      }
      // Códigos 2xxx = Pasivos
      else if (cuenta.codigo.startsWith('2')) {
        if (cuenta.codigo.startsWith('21') || cuenta.codigo.startsWith('22')) {
          pasivos.corrientes.push(item);
          pasivos.totalPasivos += item.saldo;
        } else {
          pasivos.noCorrientes.push(item);
          pasivos.totalPasivos += item.saldo;
        }
      }
      // Códigos 3xxx = Patrimonio
      else if (cuenta.codigo.startsWith('3')) {
        patrimonio.push(item);
      }
    });

    const totalPatrimonio = patrimonio.reduce((sum, item) => sum + item.saldo, 0);

    res.status(200).json({
      fecha: new Date().toISOString().split('T')[0],
      activos,
      pasivos,
      patrimonio,
      totalPatrimonio,
    });
  } catch (error) {
    console.error('Error al obtener balance general:', error);
    res.status(500).json({ error: 'Error interno al generar el balance general' });
  }
};

/**
 * Obtiene el Estado de Resultados (P&L)
 * Ingresos menos gastos
 */
exports.getIncomeStatement = async (req, res) => {
  const { userId, startDate, endDate } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'Se requiere userId' });
  }

  try {
    let dateFilter = '';
    const params = [userId];

    if (startDate) {
      dateFilter += ` AND a.fecha >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      dateFilter += ` AND a.fecha <= $${params.length + 1}`;
      params.push(endDate);
    }

    const query = `
      SELECT 
        c.id,
        c.codigo,
        c.nombre,
        c.naturaleza,
        COALESCE(SUM(l.debito - l.credito), 0) as saldo
      FROM catalogo c
      LEFT JOIN libro_diario l ON c.id = l.cuenta_id
      LEFT JOIN asientos a ON l.asiento_id = a.id
      WHERE c.app_user_id = $1
        AND (c.codigo LIKE '4%' OR c.codigo LIKE '5%' OR c.codigo LIKE '6%' OR c.codigo LIKE '7%')
        ${dateFilter}
      GROUP BY c.id, c.codigo, c.nombre, c.naturaleza
      ORDER BY c.codigo ASC;
    `;

    const result = await db.query(query, params);
    const cuentas = result.rows;

    const ingresos = [];
    const gastos = {
      operacionales: [],
      noOperacionales: [],
    };

    let totalIngresos = 0;
    let totalGastos = 0;

    cuentas.forEach((cuenta) => {
      const item = {
        codigo: cuenta.codigo,
        nombre: cuenta.nombre,
        monto: Math.abs(parseFloat(cuenta.saldo)),
      };

      // Códigos 4xxx = Ingresos
      if (cuenta.codigo.startsWith('4')) {
        ingresos.push(item);
        totalIngresos += item.monto;
      }
      // Códigos 5xxx y 6xxx = Gastos Operacionales
      else if (cuenta.codigo.startsWith('5') || cuenta.codigo.startsWith('6')) {
        gastos.operacionales.push(item);
        totalGastos += item.monto;
      }
      // Códigos 7xxx = Otros gastos/ingresos
      else if (cuenta.codigo.startsWith('7')) {
        gastos.noOperacionales.push(item);
        totalGastos += item.monto;
      }
    });

    const utilidadNeta = totalIngresos - totalGastos;

    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];

    res.status(200).json({
      periodo: {
        inicio: startDate || startOfYear,
        fin: endDate || today.toISOString().split('T')[0],
      },
      ingresos,
      totalIngresos,
      gastos,
      totalGastos,
      utilidadNeta,
    });
  } catch (error) {
    console.error('Error al obtener estado de resultados:', error);
    res.status(500).json({ error: 'Error interno al generar el estado de resultados' });
  }
};

/**
 * Obtiene el Estado de Cambios en Patrimonio
 */
exports.getEquityChanges = async (req, res) => {
  const { userId, startDate, endDate } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'Se requiere userId' });
  }

  try {
    // Patrimonio inicial (primer día del período o de todas las transacciones)
    const patrimonioInicialQuery = `
      SELECT 
        COALESCE(SUM(
          CASE 
            WHEN c.naturaleza = 'D' THEN (l.debito - l.credito)
            ELSE (l.credito - l.debito)
          END
        ), 0) as patrimonio
      FROM catalogo c
      LEFT JOIN libro_diario l ON c.id = l.cuenta_id
      LEFT JOIN asientos a ON l.asiento_id = a.id
      WHERE c.app_user_id = $1
        AND c.codigo LIKE '3%'
        ${startDate ? `AND a.fecha < $2` : ''}
      GROUP BY c.app_user_id;
    `;

    const patrimonioParams = [userId];
    if (startDate) patrimonioParams.push(startDate);

    const patrimonioResult = await db.query(patrimonioInicialQuery, patrimonioParams);
    const patrimonioInicial = patrimonioResult.rows.length > 0 ? parseFloat(patrimonioResult.rows[0].patrimonio) : 0;

    // Movimientos del período
    let dateFilter = '';
    const params = [userId];

    if (startDate) {
      dateFilter += ` AND a.fecha >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      dateFilter += ` AND a.fecha <= $${params.length + 1}`;
      params.push(endDate);
    }

    const movimientosQuery = `
      SELECT 
        c.codigo,
        c.nombre,
        COALESCE(SUM(l.debito - l.credito), 0) as monto
      FROM catalogo c
      LEFT JOIN libro_diario l ON c.id = l.cuenta_id
      LEFT JOIN asientos a ON l.asiento_id = a.id
      WHERE c.app_user_id = $1
        AND (c.codigo LIKE '4%' OR c.codigo LIKE '5%' OR c.codigo LIKE '6%')
        ${dateFilter}
      GROUP BY c.codigo, c.nombre
      ORDER BY c.codigo ASC;
    `;

    const movimientosResult = await db.query(movimientosQuery, params);
    const movimientos = movimientosResult.rows.map((row) => ({
      concepto: `${row.codigo} - ${row.nombre}`,
      monto: Math.abs(parseFloat(row.monto)),
      tipo: row.codigo.startsWith('4') ? 'ingreso' : 'egreso',
    }));

    const totalMovimientos = movimientos.reduce((sum, m) => sum + m.monto, 0);
    const patrimonioFinal = patrimonioInicial + totalMovimientos;

    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];

    res.status(200).json({
      periodo: {
        inicio: startDate || startOfYear,
        fin: endDate || today.toISOString().split('T')[0],
      },
      patrimonioInicial,
      movimientos,
      patrimonioFinal,
    });
  } catch (error) {
    console.error('Error al obtener cambios en patrimonio:', error);
    res.status(500).json({ error: 'Error interno al generar cambios en patrimonio' });
  }
};

/**
 * Obtiene el Estado de Flujos de Caja
 */
exports.getCashFlow = async (req, res) => {
  const { userId, startDate, endDate } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'Se requiere userId' });
  }

  try {
    let dateFilter = '';
    const params = [userId];

    if (startDate) {
      dateFilter += ` AND a.fecha >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      dateFilter += ` AND a.fecha <= $${params.length + 1}`;
      params.push(endDate);
    }

    // Saldo inicial de efectivo
    const saldoInicialQuery = `
      SELECT 
        COALESCE(SUM(l.debito - l.credito), 0) as saldo
      FROM catalogo c
      LEFT JOIN libro_diario l ON c.id = l.cuenta_id
      LEFT JOIN asientos a ON l.asiento_id = a.id
      WHERE c.app_user_id = $1
        AND c.codigo LIKE '11%'
        ${startDate ? `AND a.fecha < $${params.length + 1}` : ''}
    `;

    const saldoParams = [userId];
    if (startDate) saldoParams.push(startDate);

    const saldoResult = await db.query(saldoInicialQuery, saldoParams);
    const saldoInicial = saldoResult.rows.length > 0 ? parseFloat(saldoResult.rows[0].saldo) : 0;

    // Actividades operacionales (cambios en cuentas de corto plazo)
    const operacionalesQuery = `
      SELECT 
        c.codigo,
        c.nombre,
        SUM(CASE 
          WHEN c.naturaleza = 'D' THEN (l.debito - l.credito)
          ELSE (l.credito - l.debito)
        END) as monto
      FROM catalogo c
      LEFT JOIN libro_diario l ON c.id = l.cuenta_id
      LEFT JOIN asientos a ON l.asiento_id = a.id
      WHERE c.app_user_id = $1
        AND (c.codigo LIKE '41%' OR c.codigo LIKE '42%' OR c.codigo LIKE '51%' OR c.codigo LIKE '52%' OR c.codigo LIKE '12%')
        ${dateFilter}
      GROUP BY c.codigo, c.nombre
      ORDER BY c.codigo ASC;
    `;

    // Actividades de inversión (cambios en activos fijos)
    const inversionQuery = `
      SELECT 
        c.codigo,
        c.nombre,
        SUM(CASE 
          WHEN c.naturaleza = 'D' THEN (l.debito - l.credito)
          ELSE (l.credito - l.debito)
        END) as monto
      FROM catalogo c
      LEFT JOIN libro_diario l ON c.id = l.cuenta_id
      LEFT JOIN asientos a ON l.asiento_id = a.id
      WHERE c.app_user_id = $1
        AND (c.codigo LIKE '13%' OR c.codigo LIKE '14%')
        ${dateFilter}
      GROUP BY c.codigo, c.nombre
      ORDER BY c.codigo ASC;
    `;

    // Actividades de financiamiento (cambios en pasivos y patrimonio)
    const financiamientoQuery = `
      SELECT 
        c.codigo,
        c.nombre,
        SUM(CASE 
          WHEN c.naturaleza = 'D' THEN (l.debito - l.credito)
          ELSE (l.credito - l.debito)
        END) as monto
      FROM catalogo c
      LEFT JOIN libro_diario l ON c.id = l.cuenta_id
      LEFT JOIN asientos a ON l.asiento_id = a.id
      WHERE c.app_user_id = $1
        AND (c.codigo LIKE '21%' OR c.codigo LIKE '22%' OR c.codigo LIKE '3%')
        ${dateFilter}
      GROUP BY c.codigo, c.nombre
      ORDER BY c.codigo ASC;
    `;

    const operacionalesResult = await db.query(operacionalesQuery, params);
    const inversionResult = await db.query(inversionQuery, params);
    const financiamientoResult = await db.query(financiamientoQuery, params);

    const actividades = {
      operacionales: operacionalesResult.rows.map((row) => ({
        concepto: `${row.codigo} - ${row.nombre}`,
        monto: Math.abs(parseFloat(row.monto)),
      })),
      totalOperacionales: Math.abs(
        operacionalesResult.rows.reduce((sum, row) => sum + parseFloat(row.monto), 0)
      ),
      inversión: inversionResult.rows.map((row) => ({
        concepto: `${row.codigo} - ${row.nombre}`,
        monto: Math.abs(parseFloat(row.monto)),
      })),
      totalInversion: Math.abs(
        inversionResult.rows.reduce((sum, row) => sum + parseFloat(row.monto), 0)
      ),
      financiamiento: financiamientoResult.rows.map((row) => ({
        concepto: `${row.codigo} - ${row.nombre}`,
        monto: Math.abs(parseFloat(row.monto)),
      })),
      totalFinanciamiento: Math.abs(
        financiamientoResult.rows.reduce((sum, row) => sum + parseFloat(row.monto), 0)
      ),
    };

    const flujoNeto =
      actividades.totalOperacionales +
      actividades.totalInversion +
      actividades.totalFinanciamiento;

    const saldoFinal = saldoInicial + flujoNeto;

    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];

    res.status(200).json({
      periodo: {
        inicio: startDate || startOfYear,
        fin: endDate || today.toISOString().split('T')[0],
      },
      saldoInicial,
      actividades,
      saldoFinal,
    });
  } catch (error) {
    console.error('Error al obtener flujo de caja:', error);
    res.status(500).json({ error: 'Error interno al generar flujo de caja' });
  }
};
