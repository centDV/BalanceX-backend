const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reports.controller');

// Balance General / Estado de Situación Financiera
router.get('/balance-sheet', reportsController.getBalanceSheet);
router.post('/balance-sheet/utilidades', reportsController.updateBalanceSheetUtilidades);

// Estado de Resultados / P&L
router.get('/income-statement', reportsController.getIncomeStatement);
// Cuentas seleccionables para estado de resultados personalizado
router.get('/income-statement/accounts', reportsController.getIncomeStatementAccounts);
// Estado de resultados personalizado mediante selección de cuentas
router.post('/income-statement/custom', reportsController.getIncomeStatementCustom);
// Preferencias (selecciones) guardadas del estado de resultados
router.get('/income-statement/preferences', reportsController.getIncomeStatementPreferences);
// Últimos resultados calculados del estado de resultados
router.get('/income-statement/results', reportsController.getIncomeStatementResults);

// Estado de Cambios en Patrimonio
router.get('/equity-changes', reportsController.getEquityChanges);

// Estado de Flujos de Caja
router.get('/cash-flow', reportsController.getCashFlow);

module.exports = router;
