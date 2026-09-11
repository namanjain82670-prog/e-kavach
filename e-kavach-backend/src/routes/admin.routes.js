const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.use(authenticateToken);
router.use(requireRole('hospital'));

router.get('/dashboard/summary', (req, res, next) => adminController.getDashboardSummary(req, res, next));
router.get('/beds', (req, res, next) => adminController.getBeds(req, res, next));
router.patch('/beds/:id', (req, res, next) => adminController.updateBed(req, res, next));
router.get('/pharmacy', (req, res, next) => adminController.getPharmacy(req, res, next));
router.patch('/pharmacy/:id', (req, res, next) => adminController.updatePharmacy(req, res, next));
router.get('/staff', (req, res, next) => adminController.getStaff(req, res, next));
router.get('/doctors', (req, res, next) => adminController.getDoctors(req, res, next));
router.get('/patients', (req, res, next) => adminController.getPatients(req, res, next));
router.post('/patients', (req, res, next) => adminController.createPatient(req, res, next));
router.get('/hospital-network', (req, res, next) => adminController.getHospitalNetwork(req, res, next));

module.exports = router;
