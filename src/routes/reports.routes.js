const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reports.controller');

// Balance General / Estado de Situación Financiera
router.get('/balance-sheet', reportsController.getBalanceSheet);

// Estado de Resultados / P&L
router.get('/income-statement', reportsController.getIncomeStatement);

// Estado de Cambios en Patrimonio
router.get('/equity-changes', reportsController.getEquityChanges);

// Estado de Flujos de Caja
router.get('/cash-flow', reportsController.getCashFlow);

module.exports = router;
