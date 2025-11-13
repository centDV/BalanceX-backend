const express = require('express');
const accountingController = require('../controllers/accounting.controller');

const router = express.Router();

router.get('/catalog', accountingController.getCatalogo);
router.post('/catalog', accountingController.addAccount);
router.post('/catalog/import', accountingController.importCatalog);
router.delete('/catalog/:id', accountingController.deleteAccount);

router.post('/ledgerize', accountingController.ledgerizeAccounts); 
router.get('/ledger', accountingController.getLedger);
router.get('/account-movements', accountingController.getAccountMovements);
router.get('/trial-balance/:userId', accountingController.getTrialBalance);

module.exports = router;