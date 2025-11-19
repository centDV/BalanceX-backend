const db = require('../config/db.config');

// Funciones helper para reutilizar en balance general
async function getSaldoCuentaAggregadoHelper(userId, cuentaId, startDate, endDate) {
  if (!cuentaId) return 0;
  const baseInfo = await db.query(
    `SELECT id, codigo FROM catalogo WHERE app_user_id = $1 AND id = $2`,
    [userId, cuentaId]
  );
  if (!baseInfo.rows.length) return 0;
  const code = String(baseInfo.rows[0].codigo || '');

  let params = [userId, code + '%'];
  let dateSql = '';
  if (startDate) {
    params.push(startDate);
    dateSql += ` AND a.fecha >= $${params.length}`;
  }
  if (endDate) {
    params.push(endDate);
    dateSql += ` AND a.fecha <= $${params.length}`;
  }

  const sql = `
    SELECT COALESCE(SUM(
      CASE WHEN c.naturaleza = 'D' OR c.naturaleza ILIKE 'deud%'
           THEN (l.debito - l.credito)
           ELSE (l.credito - l.debito)
      END
    ),0) AS saldo
    FROM catalogo c
    LEFT JOIN libro_diario l ON c.id = l.cuenta_id
    LEFT JOIN asientos a ON l.asiento_id = a.id
    WHERE c.app_user_id = $1 AND c.codigo LIKE $2
    ${dateSql}
  `;
  const { rows } = await db.query(sql, params);
  const saldo = parseFloat(rows[0]?.saldo) || 0;
  return Math.abs(saldo);
}

async function getInventarioInicialHelper(userId, cuentaId) {
  if (!cuentaId) return 0;
  const sql = `
    SELECT c.naturaleza, l.debito, l.credito
    FROM libro_diario l
    JOIN catalogo c ON l.cuenta_id = c.id
    JOIN asientos a ON l.asiento_id = a.id
    WHERE c.app_user_id = $1 AND c.id = $2
    ORDER BY a.fecha ASC, a.id ASC
    LIMIT 1;
  `;
  const { rows } = await db.query(sql, [userId, cuentaId]);
  if (!rows.length) return 0;
  const r = rows[0];
  const debito = parseFloat(r.debito) || 0;
  const credito = parseFloat(r.credito) || 0;
  const nat = String(r.naturaleza || '').toUpperCase();
  const esDeudora = nat === 'D' || nat.startsWith('DEUD');
  const saldo = esDeudora ? debito - credito : credito - debito;
  return Math.abs(saldo);
}

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
        COALESCE(SUM(l.debito), 0) AS total_debito,
        COALESCE(SUM(l.credito), 0) AS total_credito
      FROM catalogo c
      LEFT JOIN libro_diario l ON c.id = l.cuenta_id
      LEFT JOIN asientos a ON l.asiento_id = a.id AND a.app_user_id = $1
      WHERE c.app_user_id = $1
      GROUP BY c.id, c.codigo, c.nombre, c.naturaleza
      ORDER BY c.codigo ASC;
    `;

    const { rows } = await db.query(query, [userId]);

    const activoCorriente = [];
    const activoNoCorriente = [];
    const pasivoCorriente = [];
    const pasivoNoCorriente = [];
    const capitalContable = [];

    for (const c of rows) {
      const debito = parseFloat(c.total_debito) || 0;
      const credito = parseFloat(c.total_credito) || 0;
      const nat = String(c.naturaleza || '').trim().toUpperCase();
      const esDeudora = nat === 'D' || nat.startsWith('DEUD');
      const saldo = esDeudora ? debito - credito : credito - debito;
      if (saldo <= 0.009) continue;

      const item = { codigo: c.codigo, nombre: c.nombre, saldo };
      const code = String(c.codigo || '');
      // Regla especial: mostrar cuenta de Inventario Final (periodic system) como Activo Corriente
      // aunque su prefijo sea de costos (51xx), se necesita para cuadrar el balance.
      const nombreLower = String(c.nombre || '').toLowerCase();
        // (Regla especial eliminada) 5105 no se fuerza como Activo Corriente; debe reflejarse vía cuenta de inventario 1104.
      if (code.startsWith('11')) {
        activoCorriente.push(item);
      } else if (code.startsWith('12')) {
        activoNoCorriente.push(item);
      } else if (code.startsWith('21')) {
        pasivoCorriente.push(item);
      } else if (code.startsWith('22')) {
        pasivoNoCorriente.push(item);
      } else if (code.startsWith('3')) {
        capitalContable.push(item);
      }
    }

    const totalActivoCorriente = activoCorriente.reduce((s, i) => s + i.saldo, 0);
    const totalActivoNoCorriente = activoNoCorriente.reduce((s, i) => s + i.saldo, 0);
    const totalActivo = totalActivoCorriente + totalActivoNoCorriente;
    const totalPasivoCorriente = pasivoCorriente.reduce((s, i) => s + i.saldo, 0);
    const totalPasivoNoCorriente = pasivoNoCorriente.reduce((s, i) => s + i.saldo, 0);
    const totalPasivo = totalPasivoCorriente + totalPasivoNoCorriente;
    const totalCapitalContable = capitalContable.reduce((s, i) => s + i.saldo, 0);
    
    // Obtener utilidades desde los resultados guardados del estado de resultados (utilidad operacional)
    let utilidades = 0;
    try {
      const resultsRes = await db.query(
        `SELECT utilidad_operacional FROM income_statement_results WHERE app_user_id = $1`,
        [userId]
      );
      if (resultsRes.rows.length > 0) {
        utilidades = parseFloat(resultsRes.rows[0].utilidad_operacional) || 0;
      }
    } catch (e) {
      console.error('Error al obtener utilidades del estado de resultados:', e);
    }
    
    const totalPasivoMasCapital = totalPasivo + totalCapitalContable + utilidades;

    res.status(200).json({
      fecha: new Date().toISOString().split('T')[0],
      activoCorriente,
      activoNoCorriente,
      totalActivoCorriente,
      totalActivoNoCorriente,
      totalActivo,
      pasivoCorriente,
      pasivoNoCorriente,
      totalPasivoCorriente,
      totalPasivoNoCorriente,
      totalPasivo,
      capitalContable,
      totalCapitalContable,
      utilidades,
      totalPasivoMasCapital,
    });
  } catch (error) {
    console.error('Error al obtener balance general:', error);
    res.status(500).json({ error: 'Error interno al generar el balance general' });
  }
};

// Lista de cuentas disponibles para seleccionar en Estado de Resultados
exports.getIncomeStatementAccounts = async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'Se requiere userId' });
  }
  try {
    const query = `SELECT id, codigo, nombre, naturaleza FROM catalogo WHERE app_user_id = $1 ORDER BY codigo ASC;`;
    const { rows } = await db.query(query, [userId]);
    res.status(200).json({ cuentas: rows });
  } catch (error) {
    console.error('Error al listar cuentas para estado de resultados:', error);
    res.status(500).json({ error: 'Error interno al listar cuentas' });
  }
};

// Estado de Resultados basado en selección de cuentas (POST)
exports.getIncomeStatementCustom = async (req, res) => {
  const { userId, selections, startDate, endDate } = req.body || {};
  if (!userId) {
    return res.status(400).json({ error: 'Se requiere userId' });
  }
  // selections: { ventasTotales, devolucionSobreVenta, compras, gastosDeCompra, devolucionSobreCompra, inventarioInicial, inventarioFinal, gastosDeOperacion }
  try {
    const periodoInicio = startDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const periodoFin = endDate || new Date().toISOString().split('T')[0];

    const buildDateFilter = (alias = 'a') => {
      let df = '';
      const params = [];
      if (startDate) {
        df += ` AND ${alias}.fecha >= $REPLACE_START`;
        params.push(startDate);
      }
      if (endDate) {
        df += ` AND ${alias}.fecha <= $REPLACE_END`;
        params.push(endDate);
      }
      return { df, params };
    };

    async function getSaldoCuentaAggregado(cuentaId) {
      if (!cuentaId) return 0;
      // Obtener la cuenta base para conocer su código (prefijo)
      const baseInfo = await db.query(
        `SELECT id, codigo FROM catalogo WHERE app_user_id = $1 AND id = $2`,
        [userId, cuentaId]
      );
      if (!baseInfo.rows.length) return 0;
      const code = String(baseInfo.rows[0].codigo || '');

      // Parámetros y filtros de fecha
      let params = [userId, code + '%'];
      let dateSql = '';
      if (startDate) {
        params.push(startDate);
        dateSql += ` AND a.fecha >= $${params.length}`;
      }
      if (endDate) {
        params.push(endDate);
        dateSql += ` AND a.fecha <= $${params.length}`;
      }

      // Sumar saldo por naturaleza de todas las cuentas descendientes (por prefijo de código)
      const sql = `
        SELECT COALESCE(SUM(
          CASE WHEN c.naturaleza = 'D' OR c.naturaleza ILIKE 'deud%'
               THEN (l.debito - l.credito)
               ELSE (l.credito - l.debito)
          END
        ),0) AS saldo
        FROM catalogo c
        LEFT JOIN libro_diario l ON c.id = l.cuenta_id
        LEFT JOIN asientos a ON l.asiento_id = a.id
        WHERE c.app_user_id = $1 AND c.codigo LIKE $2
        ${dateSql}
      `;
      const { rows } = await db.query(sql, params);
      const saldo = parseFloat(rows[0]?.saldo) || 0;
      return Math.abs(saldo);
    }

    async function getSaldoCuentaConInfo(cuentaId) {
      if (!cuentaId) return null;
      // Obtener la cuenta base
      const baseInfo = await db.query(
        `SELECT id, codigo, nombre FROM catalogo WHERE app_user_id = $1 AND id = $2`,
        [userId, cuentaId]
      );
      if (!baseInfo.rows.length) return null;
      const { id, codigo, nombre } = baseInfo.rows[0];

      // Parámetros y filtros de fecha
      let params = [userId, String(codigo || '') + '%'];
      let dateSql = '';
      if (startDate) {
        params.push(startDate);
        dateSql += ` AND a.fecha >= $${params.length}`;
      }
      if (endDate) {
        params.push(endDate);
        dateSql += ` AND a.fecha <= $${params.length}`;
      }

      const sql = `
        SELECT COALESCE(SUM(
          CASE WHEN c.naturaleza = 'D' OR c.naturaleza ILIKE 'deud%'
               THEN (l.debito - l.credito)
               ELSE (l.credito - l.debito)
          END
        ),0) AS saldo
        FROM catalogo c
        LEFT JOIN libro_diario l ON c.id = l.cuenta_id
        LEFT JOIN asientos a ON l.asiento_id = a.id
        WHERE c.app_user_id = $1 AND c.codigo LIKE $2
        ${dateSql}
      `;
      const { rows } = await db.query(sql, params);
      const saldo = Math.abs(parseFloat(rows[0]?.saldo) || 0);
      return { id, codigo, nombre, monto: saldo };
    }

    async function getInventarioInicial(cuentaId) {
      if (!cuentaId) return 0;
      const sql = `
        SELECT c.naturaleza, l.debito, l.credito
        FROM libro_diario l
        JOIN catalogo c ON l.cuenta_id = c.id
        JOIN asientos a ON l.asiento_id = a.id
        WHERE c.app_user_id = $1 AND c.id = $2
        ORDER BY a.fecha ASC, a.id ASC
        LIMIT 1;
      `;
      const { rows } = await db.query(sql, [userId, cuentaId]);
      if (!rows.length) return 0;
      const r = rows[0];
      const debito = parseFloat(r.debito) || 0;
      const credito = parseFloat(r.credito) || 0;
      const nat = String(r.naturaleza || '').toUpperCase();
      const esDeudora = nat === 'D' || nat.startsWith('DEUD');
      const saldo = esDeudora ? debito - credito : credito - debito;
      return Math.abs(saldo);
    }

    // Extraer IDs
    const {
      ventasTotales: ventasId,
      devolucionSobreVenta: devolVentaId,
      compras: comprasId,
      gastosDeCompra: gastosCompraId,
      devolucionSobreCompra: devolCompraId,
      inventarioInicial: invInicialId,
      inventarioFinal: invFinalId,
      gastosDeOperacion: gastosOperacionIds,
    } = selections || {};

    const ventasTotales = await getSaldoCuentaAggregado(ventasId);
    const devolucionSobreVenta = await getSaldoCuentaAggregado(devolVentaId);
    const compras = await getSaldoCuentaAggregado(comprasId);
    const gastosDeCompra = await getSaldoCuentaAggregado(gastosCompraId);
    const devolucionSobreCompra = await getSaldoCuentaAggregado(devolCompraId);
    const inventarioInicial = await getInventarioInicial(invInicialId);
    const inventarioFinal = await getSaldoCuentaAggregado(invFinalId);

    let gastosDeOperacion = 0;
    const gastosDetalle = [];
    if (Array.isArray(gastosOperacionIds)) {
      for (const gid of gastosOperacionIds) {
        const info = await getSaldoCuentaConInfo(gid);
        if (info) {
          gastosDeOperacion += info.monto;
          gastosDetalle.push(info);
        }
      }
    } else {
      const info = await getSaldoCuentaConInfo(gastosOperacionIds);
      if (info) {
        gastosDeOperacion += info.monto;
        gastosDetalle.push(info);
      }
    }

    // Cálculos derivados según estructura estándar del Estado de Resultados
    // INGRESOS
    const ventasNetas = ventasTotales - devolucionSobreVenta;
    
    // COSTO DE LO VENDIDO
    const comprasTotales = compras + gastosDeCompra;
    const comprasNetas = comprasTotales - devolucionSobreCompra;
    const mercanciaDisponible = inventarioInicial + comprasNetas; // Inventario Inicial + Compras Netas
    const costoDeVenta = mercanciaDisponible - inventarioFinal;   // Total Mercancía - Inventario Final
    
    // UTILIDAD BRUTA = Ingresos - Costo de lo Vendido
    const utilidadBruta = ventasNetas - costoDeVenta;
    
    // UTILIDAD OPERACIONAL = Utilidad Bruta - Gastos de Operación
    const utilidadOperacional = utilidadBruta - gastosDeOperacion;

    // Guardar preferencias (selecciones) para este usuario
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS income_statement_prefs (
          app_user_id TEXT PRIMARY KEY,
          selections JSONB NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      await db.query(
        `INSERT INTO income_statement_prefs (app_user_id, selections, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (app_user_id)
         DO UPDATE SET selections = EXCLUDED.selections, updated_at = NOW();`,
        [userId, JSON.stringify(selections || {})]
      );
    } catch (e) {
      console.error('No se pudieron guardar las preferencias del estado de resultados:', e);
    }

    // Guardar resultados calculados
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS income_statement_results (
          app_user_id VARCHAR(50) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          periodo_inicio DATE NOT NULL,
          periodo_fin DATE NOT NULL,
          ventas_totales NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
          devolucion_sobre_venta NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
          ventas_netas NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
          compras NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
          gastos_de_compra NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
          compras_totales NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
          devolucion_sobre_compra NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
          compras_netas NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
          inventario_inicial NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
          mercancia_disponible NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
          inventario_final NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
          costo_de_venta NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
          utilidad_bruta NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
          gastos_de_operacion NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
          utilidad_operacional NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await db.query(
        `INSERT INTO income_statement_results (
          app_user_id, periodo_inicio, periodo_fin, ventas_totales, devolucion_sobre_venta,
          ventas_netas, compras, gastos_de_compra, compras_totales, devolucion_sobre_compra,
          compras_netas, inventario_inicial, mercancia_disponible, inventario_final,
          costo_de_venta, utilidad_bruta, gastos_de_operacion, utilidad_operacional, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW())
        ON CONFLICT (app_user_id)
        DO UPDATE SET
          periodo_inicio = EXCLUDED.periodo_inicio,
          periodo_fin = EXCLUDED.periodo_fin,
          ventas_totales = EXCLUDED.ventas_totales,
          devolucion_sobre_venta = EXCLUDED.devolucion_sobre_venta,
          ventas_netas = EXCLUDED.ventas_netas,
          compras = EXCLUDED.compras,
          gastos_de_compra = EXCLUDED.gastos_de_compra,
          compras_totales = EXCLUDED.compras_totales,
          devolucion_sobre_compra = EXCLUDED.devolucion_sobre_compra,
          compras_netas = EXCLUDED.compras_netas,
          inventario_inicial = EXCLUDED.inventario_inicial,
          mercancia_disponible = EXCLUDED.mercancia_disponible,
          inventario_final = EXCLUDED.inventario_final,
          costo_de_venta = EXCLUDED.costo_de_venta,
          utilidad_bruta = EXCLUDED.utilidad_bruta,
          gastos_de_operacion = EXCLUDED.gastos_de_operacion,
          utilidad_operacional = EXCLUDED.utilidad_operacional,
          updated_at = NOW();`,
        [
          userId, periodoInicio, periodoFin, ventasTotales, devolucionSobreVenta,
          ventasNetas, compras, gastosDeCompra, comprasTotales, devolucionSobreCompra,
          comprasNetas, inventarioInicial, mercanciaDisponible, inventarioFinal,
          costoDeVenta, utilidadBruta, gastosDeOperacion, utilidadOperacional
        ]
      );
    } catch (e) {
      console.error('No se pudieron guardar los resultados del estado de resultados:', e);
    }

    res.status(200).json({
      periodo: { inicio: periodoInicio, fin: periodoFin },
      ventasTotales,
      devolucionSobreVenta,
      ventasNetas,
      compras,
      gastosDeCompra,
      comprasTotales,
      devolucionSobreCompra,
      comprasNetas,
      inventarioInicial,
      mercanciaDisponible,
      inventarioFinal,
      costoDeVenta,
      utilidadBruta,
      gastosDeOperacion,
      utilidadOperacional,
      detalle: {
        ventasTotales,
        devolucionSobreVenta,
        compras,
        gastosDeCompra,
        devolucionSobreCompra,
        inventarioInicial,
        inventarioFinal,
        gastosDeOperacion: gastosDetalle,
      },
    });
  } catch (error) {
    console.error('Error en estado de resultados custom:', error);
    res.status(500).json({ error: 'Error interno al generar estado de resultados personalizado' });
  }
};

// Obtener preferencias (selecciones) guardadas de estado de resultados
exports.getIncomeStatementPreferences = async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'Se requiere userId' });
  }
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS income_statement_prefs (
        app_user_id TEXT PRIMARY KEY,
        selections JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    const { rows } = await db.query(
      `SELECT selections FROM income_statement_prefs WHERE app_user_id = $1;`,
      [userId]
    );
    const selections = rows[0]?.selections || {};
    res.status(200).json({ selections });
  } catch (error) {
    console.error('Error al obtener preferencias de estado de resultados:', error);
    res.status(500).json({ error: 'Error interno al obtener preferencias' });
  }
};

// Obtener últimos resultados guardados del estado de resultados
exports.getIncomeStatementResults = async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'Se requiere userId' });
  }
  try {
    const { rows } = await db.query(
      `SELECT * FROM income_statement_results WHERE app_user_id = $1;`,
      [userId]
    );
    if (rows.length === 0) {
      return res.status(200).json({ results: null });
    }
    const result = rows[0];
    res.status(200).json({
      results: {
        periodo: {
          inicio: result.periodo_inicio,
          fin: result.periodo_fin,
        },
        ventasTotales: parseFloat(result.ventas_totales),
        devolucionSobreVenta: parseFloat(result.devolucion_sobre_venta),
        ventasNetas: parseFloat(result.ventas_netas),
        compras: parseFloat(result.compras),
        gastosDeCompra: parseFloat(result.gastos_de_compra),
        comprasTotales: parseFloat(result.compras_totales),
        devolucionSobreCompra: parseFloat(result.devolucion_sobre_compra),
        comprasNetas: parseFloat(result.compras_netas),
        inventarioInicial: parseFloat(result.inventario_inicial),
        mercanciaDisponible: parseFloat(result.mercancia_disponible),
        inventarioFinal: parseFloat(result.inventario_final),
        costoDeVenta: parseFloat(result.costo_de_venta),
        utilidadBruta: parseFloat(result.utilidad_bruta),
        gastosDeOperacion: parseFloat(result.gastos_de_operacion),
        utilidadOperacional: parseFloat(result.utilidad_operacional),
        updatedAt: result.updated_at,
      }
    });
  } catch (error) {
    console.error('Error al obtener resultados de estado de resultados:', error);
    res.status(500).json({ error: 'Error interno al obtener resultados' });
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

    // Consulta para obtener saldos de las cuentas relevantes
    const query = `
      SELECT 
        c.id,
        c.codigo,
        c.nombre,
        c.naturaleza,
        COALESCE(SUM(l.debito), 0) as total_debito,
        COALESCE(SUM(l.credito), 0) as total_credito
      FROM catalogo c
      LEFT JOIN libro_diario l ON c.id = l.cuenta_id
      LEFT JOIN asientos a ON l.asiento_id = a.id
      WHERE c.app_user_id = $1
        ${dateFilter}
      GROUP BY c.id, c.codigo, c.nombre, c.naturaleza
      ORDER BY c.codigo ASC;
    `;

    const result = await db.query(query, params);
    const cuentas = result.rows;

    // Inicializar variables para el cálculo según la plantilla
    let ventasTotales = 0;
    let devolucionSobreVenta = 0;
    let compras = 0;
    let gastosDeCompra = 0;
    let devolucionSobreCompra = 0;
    let inventarioInicial = 0;
    let inventarioFinal = 0;
    let gastosDeOperacion = 0;

    // Procesar cada cuenta según su código
    cuentas.forEach((cuenta) => {
      const saldo = parseFloat(cuenta.total_debito) - parseFloat(cuenta.total_credito);
      const codigo = cuenta.codigo;

      // Ventas totales (ingresos por ventas - código 4101 o similares)
      if (codigo.startsWith('410') || codigo.startsWith('41')) {
        ventasTotales += Math.abs(saldo);
      }
      // Devoluciones sobre venta (código 42xx o cuentas de devolución)
      else if (codigo.includes('devol') && codigo.startsWith('4')) {
        devolucionSobreVenta += Math.abs(saldo);
      }
      // Compras (código 510x o cuentas de compras)
      else if (codigo.startsWith('510') && !codigo.includes('1')) {
        compras += Math.abs(saldo);
      }
      // Costo de mercadería vendida
      else if (codigo.startsWith('5101') || (codigo.startsWith('51') && cuenta.nombre.toLowerCase().includes('costo'))) {
        // Este será calculado, no sumado directamente
      }
      // Gastos de compra (fletes, seguros sobre compra, etc.)
      else if (codigo.startsWith('51') && (cuenta.nombre.toLowerCase().includes('flete') || cuenta.nombre.toLowerCase().includes('seguro'))) {
        gastosDeCompra += Math.abs(saldo);
      }
      // Devoluciones sobre compra
      else if (codigo.includes('devol') && codigo.startsWith('5')) {
        devolucionSobreCompra += Math.abs(saldo);
      }
      // Inventario inicial (activo corriente - mercancías)
      else if (codigo.startsWith('11') && cuenta.nombre.toLowerCase().includes('inventario inicial')) {
        inventarioInicial += Math.abs(saldo);
      }
      // Inventario final (activo corriente - mercancías)
      else if (codigo.startsWith('11') && cuenta.nombre.toLowerCase().includes('inventario final')) {
        inventarioFinal += Math.abs(saldo);
      }
      // Gastos de operación (código 6xxx y 7xxx)
      else if (codigo.startsWith('6') || codigo.startsWith('7')) {
        gastosDeOperacion += Math.abs(saldo);
      }
    });

    // Realizar los cálculos según la plantilla
    const ventasNetas = ventasTotales - devolucionSobreVenta;
    const comprasTotales = compras + gastosDeCompra;
    const comprasNetas = comprasTotales - devolucionSobreCompra;
    const mercanciaDisponible = comprasNetas + inventarioInicial;
    const costoDeVenta = mercanciaDisponible - inventarioFinal;
    const utilidadBruta = ventasNetas - costoDeVenta;
    const utilidadOperacional = utilidadBruta - gastosDeOperacion;

    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];

    res.status(200).json({
      periodo: {
        inicio: startDate || startOfYear,
        fin: endDate || today.toISOString().split('T')[0],
      },
      ventasTotales,
      devolucionSobreVenta,
      ventasNetas,
      compras,
      gastosDeCompra,
      comprasTotales,
      devolucionSobreCompra,
      comprasNetas,
      inventarioInicial,
      mercanciaDisponible,
      inventarioFinal,
      costoDeVenta,
      utilidadBruta,
      gastosDeOperacion,
      utilidadOperacional,
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

// Actualizar utilidades del Balance General
exports.updateBalanceSheetUtilidades = async (req, res) => {
  const { userId, utilidades } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'Se requiere userId' });
  }
  if (utilidades === undefined || utilidades === null) {
    return res.status(400).json({ error: 'Se requiere el valor de utilidades' });
  }

  try {
    await db.query(
      `INSERT INTO balance_sheet_prefs (app_user_id, utilidades, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (app_user_id)
       DO UPDATE SET utilidades = $2, updated_at = CURRENT_TIMESTAMP`,
      [userId, utilidades]
    );
    res.status(200).json({ success: true, message: 'Utilidades actualizadas correctamente' });
  } catch (error) {
    console.error('Error al actualizar utilidades:', error);
    res.status(500).json({ error: 'Error interno al actualizar utilidades' });
  }
};
