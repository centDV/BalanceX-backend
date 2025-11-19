const db = require('./src/config/db.config');

/**
 * Seed completo desde cero para un nuevo usuario.
 * Uso:
 *   node seed-new-user.js <userId> [email]
 * Ejemplo:
 *   node seed-new-user.js test_user_new_001 new.user@balancex.local
 */
async function seedNewUser() {
  const userId = process.argv[2] || 'test_user_new_001';
  const email = process.argv[3] || `${userId}@balancex.local`;
  console.log(`\n🌱 Inicializando seed desde cero para userId='${userId}'`);

  try {
    await db.query('BEGIN');

    // 0) Limpiar datos previos del usuario (si existieran)
    console.log('🧹 Eliminando datos previos del usuario (si existieran)...');
    await db.query(`DELETE FROM libro_mayor WHERE app_user_id = $1`, [userId]);
    // Eliminar líneas de diario vinculadas a asientos del usuario
    await db.query(`DELETE FROM libro_diario WHERE asiento_id IN (SELECT id FROM asientos WHERE app_user_id = $1)`, [userId]);
    await db.query(`DELETE FROM asientos WHERE app_user_id = $1`, [userId]);
    await db.query(`DELETE FROM catalogo WHERE app_user_id = $1`, [userId]);
    await db.query(`DELETE FROM income_statement_results WHERE app_user_id = $1`, [userId]);
    await db.query(`DELETE FROM income_statement_prefs WHERE app_user_id = $1`, [userId]).catch(() => {});
    await db.query(`DELETE FROM balance_sheet_prefs WHERE app_user_id = $1`, [userId]).catch(() => {});

    // 1) Crear usuario
    console.log('👤 Creando usuario nuevo...');
    await db.query(
      `INSERT INTO users (id, first_name, last_name, email, company_name)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, email = EXCLUDED.email, company_name = EXCLUDED.company_name`,
      [userId, 'Nuevo', 'Usuario', email, 'Empresa Nueva S.A.']
    );

    // 2) Catálogo de cuentas mínimo
    console.log('📋 Insertando catálogo base...');
    const cuentas = [
      { c: '1101', n: 'Caja', nat: 'D' },
      { c: '1102', n: 'Bancos', nat: 'D' },
      { c: '1103', n: 'Cuentas por Cobrar', nat: 'D' },
      { c: '1104', n: 'Inventario', nat: 'D' },
      { c: '1201', n: 'Mobiliario y Equipo', nat: 'D' },
      { c: '2101', n: 'Proveedores', nat: 'C' },
      { c: '2201', n: 'Préstamos Bancarios LP', nat: 'C' },
      { c: '3101', n: 'Capital Social', nat: 'C' },
      { c: '4101', n: 'Ventas', nat: 'C' },
      { c: '4102', n: 'Devoluciones sobre Ventas', nat: 'D' },
      { c: '5101', n: 'Compras', nat: 'D' },
      { c: '5102', n: 'Gastos de Compra', nat: 'D' },
      { c: '5103', n: 'Devoluciones sobre Compra', nat: 'C' },
      { c: '5104', n: 'Inventario Inicial', nat: 'D' },
      { c: '5105', n: 'Inventario Final', nat: 'D' },
      { c: '6101', n: 'Gastos de Venta', nat: 'D' },
      { c: '6102', n: 'Gastos de Administración', nat: 'D' },
    ];
    for (const acct of cuentas) {
      await db.query(
        `INSERT INTO catalogo (app_user_id, codigo, nombre, naturaleza, es_cuenta_mayor, parent_id)
         VALUES ($1, $2, $3, $4, FALSE, NULL)
         ON CONFLICT (app_user_id, codigo) DO NOTHING`,
        [userId, acct.c, acct.n, acct.nat]
      );
    }

    // Helper
    async function idCuenta(codigo) {
      const r = await db.query(`SELECT id FROM catalogo WHERE app_user_id = $1 AND codigo = $2`, [userId, codigo]);
      if (!r.rows.length) throw new Error(`Cuenta ${codigo} no existe`);
      return r.rows[0].id;
    }
    async function crearAsiento(ref, fecha, descripcion, lineas) {
      const ins = await db.query(
        `INSERT INTO asientos (app_user_id, fecha, descripcion, referencia)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [userId, fecha, descripcion, ref]
      );
      const asientoId = ins.rows[0].id;
      for (const l of lineas) {
        await db.query(`INSERT INTO libro_diario (asiento_id, cuenta_id, debito, credito) VALUES ($1, $2, $3, $4)`, [asientoId, l.cuenta_id, l.debito || 0, l.credito || 0]);
      }
      return asientoId;
    }

    // 3) Asientos balanceados (idénticos al escenario probado)
    const id1102 = await idCuenta('1102');
    const id3101 = await idCuenta('3101');
    const id5104 = await idCuenta('5104');
    const id5101 = await idCuenta('5101');
    const id5102 = await idCuenta('5102');
    const id5103 = await idCuenta('5103');
    const id4101 = await idCuenta('4101');
    const id4102 = await idCuenta('4102');
    const id1104 = await idCuenta('1104');
    const id5105 = await idCuenta('5105');
    const id6101 = await idCuenta('6101');
    const id6102 = await idCuenta('6102');

    await crearAsiento('NEW-001', '2025-01-01', 'Apertura de capital inicial', [
      { cuenta_id: id1102, debito: 100000, credito: 0 },
      { cuenta_id: id3101, debito: 0, credito: 100000 },
    ]);

    await crearAsiento('NEW-002', '2025-01-02', 'Registro de inventario inicial (periodic)', [
      { cuenta_id: id5104, debito: 300000, credito: 0 },
      { cuenta_id: id1102, debito: 0, credito: 300000 },
    ]);

    await crearAsiento('NEW-003', '2025-01-15', 'Compra de mercancía al contado', [
      { cuenta_id: id5101, debito: 600000, credito: 0 },
      { cuenta_id: id5102, debito: 10000, credito: 0 },
      { cuenta_id: id1102, debito: 0, credito: 610000 },
    ]);

    await crearAsiento('NEW-004', '2025-01-20', 'Devolución de mercancía defectuosa', [
      { cuenta_id: id1102, debito: 45000, credito: 0 },
      { cuenta_id: id5103, debito: 0, credito: 45000 },
    ]);

    await crearAsiento('NEW-005', '2025-02-10', 'Venta de mercancía al contado', [
      { cuenta_id: id1102, debito: 1500000, credito: 0 },
      { cuenta_id: id4101, debito: 0, credito: 1500000 },
    ]);

    await crearAsiento('NEW-006', '2025-02-15', 'Devolución cliente', [
      { cuenta_id: id4102, debito: 20000, credito: 0 },
      { cuenta_id: id1102, debito: 0, credito: 20000 },
    ]);

    await crearAsiento('NEW-007', '2025-12-31', 'Inventario final reclasificado a 1104', [
      { cuenta_id: id1104, debito: 235000, credito: 0 },
      { cuenta_id: id5105, debito: 0, credito: 235000 },
    ]);

    await crearAsiento('NEW-008', '2025-03-01', 'Pago comisiones de venta', [
      { cuenta_id: id6101, debito: 65000, credito: 0 },
      { cuenta_id: id1102, debito: 0, credito: 65000 },
    ]);

    await crearAsiento('NEW-009', '2025-03-05', 'Pago sueldos administrativos', [
      { cuenta_id: id6102, debito: 80000, credito: 0 },
      { cuenta_id: id1102, debito: 0, credito: 80000 },
    ]);

    // 4) Mayorización rápida
    console.log('📊 Mayorizando cuentas...');
    await db.query(
      `INSERT INTO libro_mayor (app_user_id, cuenta_id, saldo_inicial, saldo_actual, ultima_mayorizacion)
       SELECT 
         c.app_user_id,
         c.id,
         0,
         COALESCE(SUM(CASE WHEN c.naturaleza = 'D' THEN (ld.debito - ld.credito) ELSE (ld.credito - ld.debito) END), 0) AS saldo_actual,
         NOW()
       FROM catalogo c
       LEFT JOIN libro_diario ld ON c.id = ld.cuenta_id
       LEFT JOIN asientos a ON ld.asiento_id = a.id AND a.app_user_id = c.app_user_id
       WHERE c.app_user_id = $1
       GROUP BY c.app_user_id, c.id, c.naturaleza
       ON CONFLICT (app_user_id, cuenta_id)
       DO UPDATE SET saldo_actual = EXCLUDED.saldo_actual, ultima_mayorizacion = EXCLUDED.ultima_mayorizacion`,
      [userId]
    );

    // 5) Guardar resultados del Estado de Resultados
    console.log('🧾 Guardando estado de resultados...');
    await db.query(
      `CREATE TABLE IF NOT EXISTS income_statement_results (
         app_user_id VARCHAR(50) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
         periodo_inicio DATE NOT NULL,
         periodo_fin DATE NOT NULL,
         ventas_totales NUMERIC(15,2) NOT NULL DEFAULT 0,
         devolucion_sobre_venta NUMERIC(15,2) NOT NULL DEFAULT 0,
         ventas_netas NUMERIC(15,2) NOT NULL DEFAULT 0,
         compras NUMERIC(15,2) NOT NULL DEFAULT 0,
         gastos_de_compra NUMERIC(15,2) NOT NULL DEFAULT 0,
         compras_totales NUMERIC(15,2) NOT NULL DEFAULT 0,
         devolucion_sobre_compra NUMERIC(15,2) NOT NULL DEFAULT 0,
         compras_netas NUMERIC(15,2) NOT NULL DEFAULT 0,
         inventario_inicial NUMERIC(15,2) NOT NULL DEFAULT 0,
         mercancia_disponible NUMERIC(15,2) NOT NULL DEFAULT 0,
         inventario_final NUMERIC(15,2) NOT NULL DEFAULT 0,
         costo_de_venta NUMERIC(15,2) NOT NULL DEFAULT 0,
         utilidad_bruta NUMERIC(15,2) NOT NULL DEFAULT 0,
         gastos_de_operacion NUMERIC(15,2) NOT NULL DEFAULT 0,
         utilidad_operacional NUMERIC(15,2) NOT NULL DEFAULT 0,
         updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
       );`
    );

    await db.query(
      `INSERT INTO income_statement_results (
         app_user_id, periodo_inicio, periodo_fin,
         ventas_totales, devolucion_sobre_venta, ventas_netas,
         compras, gastos_de_compra, compras_totales,
         devolucion_sobre_compra, compras_netas,
         inventario_inicial, mercancia_disponible, inventario_final,
         costo_de_venta, utilidad_bruta, gastos_de_operacion, utilidad_operacional, updated_at
       ) VALUES ($1, $2, $3, 1500000, 20000, 1480000, 600000, 10000, 610000, 45000, 565000,
                 300000, 865000, 235000, 630000, 850000, 145000, 705000, NOW())
       ON CONFLICT (app_user_id)
       DO UPDATE SET periodo_inicio = EXCLUDED.periodo_inicio, periodo_fin = EXCLUDED.periodo_fin,
         ventas_totales = EXCLUDED.ventas_totales, devolucion_sobre_venta = EXCLUDED.devolucion_sobre_venta,
         ventas_netas = EXCLUDED.ventas_netas, compras = EXCLUDED.compras, gastos_de_compra = EXCLUDED.gastos_de_compra,
         compras_totales = EXCLUDED.compras_totales, devolucion_sobre_compra = EXCLUDED.devolucion_sobre_compra,
         compras_netas = EXCLUDED.compras_netas, inventario_inicial = EXCLUDED.inventario_inicial,
         mercancia_disponible = EXCLUDED.mercancia_disponible, inventario_final = EXCLUDED.inventario_final,
         costo_de_venta = EXCLUDED.costo_de_venta, utilidad_bruta = EXCLUDED.utilidad_bruta,
         gastos_de_operacion = EXCLUDED.gastos_de_operacion, utilidad_operacional = EXCLUDED.utilidad_operacional,
         updated_at = NOW()`,
      [userId, '2025-01-01', '2025-12-31']
    );

    await db.query('COMMIT');
    console.log('\n✅ Seed completo para nuevo usuario creado.');
    console.log(`   • userId: ${userId}`);
    console.log(`   • email:  ${email}`);
    console.log('   Ahora puedes consultar:');
    console.log(`   http://localhost:3001/api/accounting/balance-sheet?userId=${userId}`);
    process.exit(0);
  } catch (e) {
    await db.query('ROLLBACK');
    console.error('❌ Error en seed nuevo usuario:', e);
    process.exit(1);
  }
}

seedNewUser();
