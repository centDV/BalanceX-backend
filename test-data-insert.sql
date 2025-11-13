-- ############################################################################
-- SCRIPT DE DATOS DE PRUEBA - BalanceX Backend
-- Inserta un usuario, catálogo de cuentas y muchos asientos para pruebas
-- ############################################################################

-- ############################################################################
-- 1. INSERTAR USUARIO DE PRUEBA
-- ############################################################################
INSERT INTO users (id, first_name, last_name, email, company_name)
VALUES (
    '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d',
    'Test',
    'Company',
    'test@balancex.local',
    'Test Company S.A.'
) ON CONFLICT (id) DO NOTHING;

-- ############################################################################
-- 2. INSERTAR CATÁLOGO DE CUENTAS (del archivo catalogo_comercial.csv)
-- ############################################################################

-- ACTIVOS
INSERT INTO catalogo (app_user_id, codigo, nombre, naturaleza, es_cuenta_mayor, parent_id)
VALUES ('6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d', '1', 'ACTIVOS', 'D', TRUE, NULL);

-- ACTIVOS CORRIENTES
INSERT INTO catalogo (app_user_id, codigo, nombre, naturaleza, es_cuenta_mayor, parent_id)
SELECT '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d', '11', 'ACTIVOS CORRIENTES', 'D', TRUE, id
FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '1';

-- CAJA
INSERT INTO catalogo (app_user_id, codigo, nombre, naturaleza, es_cuenta_mayor, parent_id)
SELECT '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d', '110', 'CAJA (CUENTA MAYOR)', 'D', TRUE, id
FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '11';

-- Caja - Efectivo
INSERT INTO catalogo (app_user_id, codigo, nombre, naturaleza, es_cuenta_mayor, parent_id)
SELECT '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d', '1101', 'Caja - Efectivo', 'D', FALSE, id
FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '110';

-- Bancos - Cuenta corriente
INSERT INTO catalogo (app_user_id, codigo, nombre, naturaleza, es_cuenta_mayor, parent_id)
SELECT '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d', '1102', 'Bancos - Cuenta corriente', 'D', FALSE, id
FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '110';

-- CUENTAS POR COBRAR
INSERT INTO catalogo (app_user_id, codigo, nombre, naturaleza, es_cuenta_mayor, parent_id)
SELECT '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d', '120', 'CUENTAS POR COBRAR', 'D', TRUE, id
FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '11';

-- Cuentas por cobrar comerciales
INSERT INTO catalogo (app_user_id, codigo, nombre, naturaleza, es_cuenta_mayor, parent_id)
SELECT '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d', '1201', 'Cuentas por cobrar comerciales', 'D', FALSE, id
FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '120';

-- Provisión incobrables
INSERT INTO catalogo (app_user_id, codigo, nombre, naturaleza, es_cuenta_mayor, parent_id)
SELECT '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d', '1202', 'Provisión incobrables', 'D', FALSE, id
FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '120';

-- ACTIVOS NO CORRIENTES
INSERT INTO catalogo (app_user_id, codigo, nombre, naturaleza, es_cuenta_mayor, parent_id)
SELECT '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d', '13', 'ACTIVOS NO CORRIENTES', 'D', TRUE, id
FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '1';

-- PROPIEDAD PLANTA Y EQUIPO
INSERT INTO catalogo (app_user_id, codigo, nombre, naturaleza, es_cuenta_mayor, parent_id)
SELECT '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d', '130', 'PROPIEDAD PLANTA Y EQUIPO', 'D', TRUE, id
FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '13';

-- Terrenos
INSERT INTO catalogo (app_user_id, codigo, nombre, naturaleza, es_cuenta_mayor, parent_id)
SELECT '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d', '1301', 'Terrenos', 'D', FALSE, id
FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '130';

-- Edificios y construcciones
INSERT INTO catalogo (app_user_id, codigo, nombre, naturaleza, es_cuenta_mayor, parent_id)
SELECT '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d', '1302', 'Edificios y construcciones', 'D', FALSE, id
FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '130';

-- Mobiliario y equipo
INSERT INTO catalogo (app_user_id, codigo, nombre, naturaleza, es_cuenta_mayor, parent_id)
SELECT '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d', '1303', 'Mobiliario y equipo', 'D', FALSE, id
FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '130';

-- PASIVOS
INSERT INTO catalogo (app_user_id, codigo, nombre, naturaleza, es_cuenta_mayor, parent_id)
VALUES ('6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d', '2', 'PASIVOS', 'C', TRUE, NULL);

-- PASIVOS CORRIENTES
INSERT INTO catalogo (app_user_id, codigo, nombre, naturaleza, es_cuenta_mayor, parent_id)
SELECT '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d', '21', 'PASIVOS CORRIENTES', 'C', TRUE, id
FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '2';

-- PROVEEDORES
INSERT INTO catalogo (app_user_id, codigo, nombre, naturaleza, es_cuenta_mayor, parent_id)
SELECT '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d', '210', 'PROVEEDORES', 'C', TRUE, id
FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '21';

-- Proveedores nacionales
INSERT INTO catalogo (app_user_id, codigo, nombre, naturaleza, es_cuenta_mayor, parent_id)
SELECT '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d', '2101', 'Proveedores nacionales', 'C', FALSE, id
FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '210';

-- Proveedores extranjeros
INSERT INTO catalogo (app_user_id, codigo, nombre, naturaleza, es_cuenta_mayor, parent_id)
SELECT '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d', '2102', 'Proveedores extranjeros', 'C', FALSE, id
FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '210';

-- PASIVOS NO CORRIENTES
INSERT INTO catalogo (app_user_id, codigo, nombre, naturaleza, es_cuenta_mayor, parent_id)
SELECT '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d', '220', 'PASIVOS NO CORRIENTES', 'C', TRUE, id
FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '2';

-- Obligaciones financieras a largo plazo
INSERT INTO catalogo (app_user_id, codigo, nombre, naturaleza, es_cuenta_mayor, parent_id)
SELECT '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d', '2201', 'Obligaciones financieras a largo plazo', 'C', FALSE, id
FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '220';

-- PATRIMONIO
INSERT INTO catalogo (app_user_id, codigo, nombre, naturaleza, es_cuenta_mayor, parent_id)
VALUES ('6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d', '3', 'PATRIMONIO', 'C', TRUE, NULL);

-- CAPITAL SOCIAL
INSERT INTO catalogo (app_user_id, codigo, nombre, naturaleza, es_cuenta_mayor, parent_id)
SELECT '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d', '310', 'CAPITAL SOCIAL', 'C', TRUE, id
FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '3';

-- Capital suscrito
INSERT INTO catalogo (app_user_id, codigo, nombre, naturaleza, es_cuenta_mayor, parent_id)
SELECT '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d', '3101', 'Capital suscrito', 'C', FALSE, id
FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '310';

-- RESULTADOS ACUMULADOS
INSERT INTO catalogo (app_user_id, codigo, nombre, naturaleza, es_cuenta_mayor, parent_id)
SELECT '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d', '320', 'RESULTADOS ACUMULADOS', 'C', TRUE, id
FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '3';

-- Resultado del ejercicio
INSERT INTO catalogo (app_user_id, codigo, nombre, naturaleza, es_cuenta_mayor, parent_id)
SELECT '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d', '3201', 'Resultado del ejercicio', 'C', FALSE, id
FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '320';

-- INGRESOS
INSERT INTO catalogo (app_user_id, codigo, nombre, naturaleza, es_cuenta_mayor, parent_id)
VALUES ('6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d', '4', 'INGRESOS', 'C', TRUE, NULL);

-- INGRESOS OPERACIONALES
INSERT INTO catalogo (app_user_id, codigo, nombre, naturaleza, es_cuenta_mayor, parent_id)
SELECT '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d', '410', 'INGRESOS OPERACIONALES', 'C', TRUE, id
FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '4';

-- Ingresos por ventas
INSERT INTO catalogo (app_user_id, codigo, nombre, naturaleza, es_cuenta_mayor, parent_id)
SELECT '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d', '4101', 'Ingresos por ventas', 'C', FALSE, id
FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '410';

-- OTROS INGRESOS
INSERT INTO catalogo (app_user_id, codigo, nombre, naturaleza, es_cuenta_mayor, parent_id)
SELECT '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d', '420', 'OTROS INGRESOS', 'C', TRUE, id
FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '4';

-- Ingresos financieros
INSERT INTO catalogo (app_user_id, codigo, nombre, naturaleza, es_cuenta_mayor, parent_id)
SELECT '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d', '4201', 'Ingresos financieros', 'C', FALSE, id
FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '420';

-- GASTOS
INSERT INTO catalogo (app_user_id, codigo, nombre, naturaleza, es_cuenta_mayor, parent_id)
VALUES ('6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d', '5', 'GASTOS', 'D', TRUE, NULL);

-- COSTOS DE VENTAS
INSERT INTO catalogo (app_user_id, codigo, nombre, naturaleza, es_cuenta_mayor, parent_id)
SELECT '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d', '510', 'COSTOS DE VENTAS', 'D', TRUE, id
FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '5';

-- Costo de mercadería vendida
INSERT INTO catalogo (app_user_id, codigo, nombre, naturaleza, es_cuenta_mayor, parent_id)
SELECT '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d', '5101', 'Costo de mercadería vendida', 'D', FALSE, id
FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '510';

-- GASTOS DE ADMINISTRACIÓN
INSERT INTO catalogo (app_user_id, codigo, nombre, naturaleza, es_cuenta_mayor, parent_id)
SELECT '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d', '610', 'GASTOS DE ADMINISTRACIÓN', 'D', TRUE, id
FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '5';

-- Sueldos y salarios
INSERT INTO catalogo (app_user_id, codigo, nombre, naturaleza, es_cuenta_mayor, parent_id)
SELECT '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d', '6101', 'Sueldos y salarios', 'D', FALSE, id
FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '610';

-- GASTOS DE VENTAS
INSERT INTO catalogo (app_user_id, codigo, nombre, naturaleza, es_cuenta_mayor, parent_id)
SELECT '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d', '620', 'GASTOS DE VENTAS', 'D', TRUE, id
FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '5';

-- Comisiones
INSERT INTO catalogo (app_user_id, codigo, nombre, naturaleza, es_cuenta_mayor, parent_id)
SELECT '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d', '6201', 'Comisiones', 'D', FALSE, id
FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '620';

-- GASTOS FINANCIEROS
INSERT INTO catalogo (app_user_id, codigo, nombre, naturaleza, es_cuenta_mayor, parent_id)
SELECT '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d', '710', 'GASTOS FINANCIEROS', 'D', TRUE, id
FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '5';

-- Intereses pagados
INSERT INTO catalogo (app_user_id, codigo, nombre, naturaleza, es_cuenta_mayor, parent_id)
SELECT '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d', '7101', 'Intereses pagados', 'D', FALSE, id
FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '710';

-- ############################################################################
-- 3. INSERTAR MUCHOS ASIENTOS DE PRUEBA CON MOVIMIENTOS CONTABLES REALISTAS
-- ############################################################################

-- Asiento 1: Aporte de capital inicial (100,000)
INSERT INTO asientos (app_user_id, fecha, descripcion, referencia)
VALUES ('6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d', '2025-01-01', 'Aporte de capital inicial', 'CAP-001');

INSERT INTO libro_diario (asiento_id, cuenta_id, debito, credito)
SELECT a.id, c.id, 100000.00, 0.00
FROM asientos a, catalogo c
WHERE a.app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND a.referencia = 'CAP-001'
  AND c.app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND c.codigo = '1102'
LIMIT 1;

INSERT INTO libro_diario (asiento_id, cuenta_id, debito, credito)
SELECT a.id, c.id, 0.00, 100000.00
FROM asientos a, catalogo c
WHERE a.app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND a.referencia = 'CAP-001'
  AND c.app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND c.codigo = '3101'
LIMIT 1;

-- Asiento 2: Compra de equipo (50,000)
INSERT INTO asientos (app_user_id, fecha, descripcion, referencia)
VALUES ('6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d', '2025-01-05', 'Compra de mobiliario y equipo', 'FAC-100');

INSERT INTO libro_diario (asiento_id, cuenta_id, debito, credito)
SELECT a.id, c.id, 50000.00, 0.00
FROM asientos a, catalogo c
WHERE a.app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND a.referencia = 'FAC-100'
  AND c.app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND c.codigo = '1303'
LIMIT 1;

INSERT INTO libro_diario (asiento_id, cuenta_id, debito, credito)
SELECT a.id, c.id, 0.00, 50000.00
FROM asientos a, catalogo c
WHERE a.app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND a.referencia = 'FAC-100'
  AND c.app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND c.codigo = '1102'
LIMIT 1;

-- Asiento 3-12: 10 Ventas (comprador paga en efectivo/banco)
DO $$
DECLARE
    i INT;
    v_asiento_id INT;
    v_caja_id INT;
    v_ventas_id INT;
    v_costo_id INT;
    v_inventario_id INT;
BEGIN
    SELECT id INTO v_caja_id FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '1102';
    SELECT id INTO v_ventas_id FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '4101';
    SELECT id INTO v_costo_id FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '5101';
    
    FOR i IN 1..10 LOOP
        -- Asiento de venta
        INSERT INTO asientos (app_user_id, fecha, descripcion, referencia)
        VALUES (
            '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d',
            '2025-01-10'::DATE + (i-1) * INTERVAL '1 day',
            'Venta de mercancía Cliente ' || i,
            'VTA-' || LPAD(i::TEXT, 3, '0')
        ) RETURNING id INTO v_asiento_id;
        
        -- Débito a Caja, Crédito a Ventas (monto: 5000 + variación)
        INSERT INTO libro_diario (asiento_id, cuenta_id, debito, credito)
        VALUES (v_asiento_id, v_caja_id, 5000.00 + (i * 500), 0.00);
        
        INSERT INTO libro_diario (asiento_id, cuenta_id, debito, credito)
        VALUES (v_asiento_id, v_ventas_id, 0.00, 5000.00 + (i * 500));
        
        -- Asiento paralelo: Costo de venta (Crédito a Inventario, Débito a Costo)
        INSERT INTO asientos (app_user_id, fecha, descripcion, referencia)
        VALUES (
            '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d',
            '2025-01-10'::DATE + (i-1) * INTERVAL '1 day',
            'Costo de venta Cliente ' || i,
            'CVT-' || LPAD(i::TEXT, 3, '0')
        ) RETURNING id INTO v_asiento_id;
        
        INSERT INTO libro_diario (asiento_id, cuenta_id, debito, credito)
        VALUES (v_asiento_id, v_costo_id, (5000.00 + (i * 500)) * 0.6, 0.00);
        
        -- Crédito a cuenta de inventario (simulada con cuentas por cobrar como placeholder)
        SELECT id INTO v_inventario_id FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '1201';
        INSERT INTO libro_diario (asiento_id, cuenta_id, debito, credito)
        VALUES (v_asiento_id, v_inventario_id, 0.00, (5000.00 + (i * 500)) * 0.6);
    END LOOP;
END $$;

-- Asiento 13-18: 6 Compras a proveedores
DO $$
DECLARE
    i INT;
    v_asiento_id INT;
    v_proveedores_id INT;
    v_costo_id INT;
BEGIN
    SELECT id INTO v_proveedores_id FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '2101';
    SELECT id INTO v_costo_id FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '5101';
    
    FOR i IN 1..6 LOOP
        -- Asiento de compra (compra a crédito)
        INSERT INTO asientos (app_user_id, fecha, descripcion, referencia)
        VALUES (
            '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d',
            '2025-01-15'::DATE + (i-1) * INTERVAL '2 days',
            'Compra a Proveedor ' || i,
            'CMP-' || LPAD(i::TEXT, 3, '0')
        ) RETURNING id INTO v_asiento_id;
        
        -- Débito a Costo, Crédito a Proveedores
        INSERT INTO libro_diario (asiento_id, cuenta_id, debito, credito)
        VALUES (v_asiento_id, v_costo_id, 3000.00 + (i * 200), 0.00);
        
        INSERT INTO libro_diario (asiento_id, cuenta_id, debito, credito)
        VALUES (v_asiento_id, v_proveedores_id, 0.00, 3000.00 + (i * 200));
    END LOOP;
END $$;

-- Asiento 19-24: 6 Pagos a proveedores
DO $$
DECLARE
    i INT;
    v_asiento_id INT;
    v_proveedores_id INT;
    v_caja_id INT;
BEGIN
    SELECT id INTO v_proveedores_id FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '2101';
    SELECT id INTO v_caja_id FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '1102';
    
    FOR i IN 1..6 LOOP
        -- Asiento de pago a proveedor
        INSERT INTO asientos (app_user_id, fecha, descripcion, referencia)
        VALUES (
            '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d',
            '2025-02-01'::DATE + (i-1) * INTERVAL '3 days',
            'Pago a Proveedor ' || i,
            'PAG-' || LPAD(i::TEXT, 3, '0')
        ) RETURNING id INTO v_asiento_id;
        
        -- Débito a Proveedores, Crédito a Caja
        INSERT INTO libro_diario (asiento_id, cuenta_id, debito, credito)
        VALUES (v_asiento_id, v_proveedores_id, 3000.00 + (i * 200), 0.00);
        
        INSERT INTO libro_diario (asiento_id, cuenta_id, debito, credito)
        VALUES (v_asiento_id, v_caja_id, 0.00, 3000.00 + (i * 200));
    END LOOP;
END $$;

-- Asiento 25-29: 5 Gastos de nómina
DO $$
DECLARE
    i INT;
    v_asiento_id INT;
    v_sueldos_id INT;
    v_caja_id INT;
BEGIN
    SELECT id INTO v_sueldos_id FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '6101';
    SELECT id INTO v_caja_id FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '1102';
    
    FOR i IN 1..5 LOOP
        -- Asiento de pago de sueldos
        INSERT INTO asientos (app_user_id, fecha, descripcion, referencia)
        VALUES (
            '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d',
            '2025-01-31'::DATE + (i-1) * INTERVAL '30 days',
            'Pago de nómina - Período ' || i,
            'NON-' || LPAD(i::TEXT, 3, '0')
        ) RETURNING id INTO v_asiento_id;
        
        -- Débito a Sueldos, Crédito a Caja
        INSERT INTO libro_diario (asiento_id, cuenta_id, debito, credito)
        VALUES (v_asiento_id, v_sueldos_id, 8000.00, 0.00);
        
        INSERT INTO libro_diario (asiento_id, cuenta_id, debito, credito)
        VALUES (v_asiento_id, v_caja_id, 0.00, 8000.00);
    END LOOP;
END $$;

-- Asiento 30-34: 5 Gastos de comisiones de ventas
DO $$
DECLARE
    i INT;
    v_asiento_id INT;
    v_comisiones_id INT;
    v_caja_id INT;
BEGIN
    SELECT id INTO v_comisiones_id FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '6201';
    SELECT id INTO v_caja_id FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '1102';
    
    FOR i IN 1..5 LOOP
        -- Asiento de pago de comisiones
        INSERT INTO asientos (app_user_id, fecha, descripcion, referencia)
        VALUES (
            '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d',
            '2025-02-05'::DATE + (i-1) * INTERVAL '7 days',
            'Comisiones de ventas - Trimestre ' || i,
            'COM-' || LPAD(i::TEXT, 3, '0')
        ) RETURNING id INTO v_asiento_id;
        
        -- Débito a Comisiones, Crédito a Caja
        INSERT INTO libro_diario (asiento_id, cuenta_id, debito, credito)
        VALUES (v_asiento_id, v_comisiones_id, 2500.00, 0.00);
        
        INSERT INTO libro_diario (asiento_id, cuenta_id, debito, credito)
        VALUES (v_asiento_id, v_caja_id, 0.00, 2500.00);
    END LOOP;
END $$;

-- Asiento 35-39: 5 Gastos por intereses de deuda
DO $$
DECLARE
    i INT;
    v_asiento_id INT;
    v_intereses_id INT;
    v_caja_id INT;
BEGIN
    SELECT id INTO v_intereses_id FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '7101';
    SELECT id INTO v_caja_id FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '1102';
    
    FOR i IN 1..5 LOOP
        -- Asiento de pago de intereses
        INSERT INTO asientos (app_user_id, fecha, descripcion, referencia)
        VALUES (
            '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d',
            '2025-02-15'::DATE + (i-1) * INTERVAL '30 days',
            'Pago de intereses - Mes ' || i,
            'INT-' || LPAD(i::TEXT, 3, '0')
        ) RETURNING id INTO v_asiento_id;
        
        -- Débito a Intereses, Crédito a Caja
        INSERT INTO libro_diario (asiento_id, cuenta_id, debito, credito)
        VALUES (v_asiento_id, v_intereses_id, 500.00 + (i * 50), 0.00);
        
        INSERT INTO libro_diario (asiento_id, cuenta_id, debito, credito)
        VALUES (v_asiento_id, v_caja_id, 0.00, 500.00 + (i * 50));
    END LOOP;
END $$;

-- Asiento 40-44: 5 Ingresos por intereses financieros
DO $$
DECLARE
    i INT;
    v_asiento_id INT;
    v_ingresos_financieros_id INT;
    v_caja_id INT;
BEGIN
    SELECT id INTO v_ingresos_financieros_id FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '4201';
    SELECT id INTO v_caja_id FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '1102';
    
    FOR i IN 1..5 LOOP
        -- Asiento de ingresos financieros (intereses recibidos)
        INSERT INTO asientos (app_user_id, fecha, descripcion, referencia)
        VALUES (
            '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d',
            '2025-02-28'::DATE + (i-1) * INTERVAL '30 days',
            'Ingresos por intereses - Mes ' || i,
            'IFIN-' || LPAD(i::TEXT, 3, '0')
        ) RETURNING id INTO v_asiento_id;
        
        -- Débito a Caja, Crédito a Ingresos Financieros
        INSERT INTO libro_diario (asiento_id, cuenta_id, debito, credito)
        VALUES (v_asiento_id, v_caja_id, 300.00 + (i * 25), 0.00);
        
        INSERT INTO libro_diario (asiento_id, cuenta_id, debito, credito)
        VALUES (v_asiento_id, v_ingresos_financieros_id, 0.00, 300.00 + (i * 25));
    END LOOP;
END $$;

-- Asiento 45-49: 5 Cobros a clientes por cuentas por cobrar
DO $$
DECLARE
    i INT;
    v_asiento_id INT;
    v_cuentas_cobrar_id INT;
    v_caja_id INT;
BEGIN
    SELECT id INTO v_cuentas_cobrar_id FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '1201';
    SELECT id INTO v_caja_id FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d' AND codigo = '1102';
    
    FOR i IN 1..5 LOOP
        -- Asiento de cobro a clientes
        INSERT INTO asientos (app_user_id, fecha, descripcion, referencia)
        VALUES (
            '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d',
            '2025-03-05'::DATE + (i-1) * INTERVAL '5 days',
            'Cobro a Cliente ' || i,
            'COB-' || LPAD(i::TEXT, 3, '0')
        ) RETURNING id INTO v_asiento_id;
        
        -- Débito a Caja, Crédito a Cuentas por Cobrar
        INSERT INTO libro_diario (asiento_id, cuenta_id, debito, credito)
        VALUES (v_asiento_id, v_caja_id, 3000.00 + (i * 200), 0.00);
        
        INSERT INTO libro_diario (asiento_id, cuenta_id, debito, credito)
        VALUES (v_asiento_id, v_cuentas_cobrar_id, 0.00, 3000.00 + (i * 200));
    END LOOP;
END $$;

-- ############################################################################
-- 4. CONFIRMACIÓN
-- ############################################################################
SELECT 
    (SELECT COUNT(*) FROM asientos WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d') AS total_asientos,
    (SELECT COUNT(*) FROM libro_diario WHERE asiento_id IN (SELECT id FROM asientos WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d')) AS total_movimientos,
    (SELECT COUNT(*) FROM catalogo WHERE app_user_id = '6dc7b6f6-12ec-43b3-97b7-60fc8e344c4d') AS total_cuentas;
