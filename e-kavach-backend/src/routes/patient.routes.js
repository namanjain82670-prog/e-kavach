const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patient.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Publicly browseable doctors list and quick ID creation + booking
router.get('/doctors', (req, res, next) => patientController.getDoctors(req, res, next));
router.post('/quick-id-and-book', (req, res, next) => patientController.quickIdAndBook(req, res, next));

// All subsequent patient endpoints require authentication
router.use(authenticateToken);

router.get('/me', requireRole('patient'), (req, res, next) => patientController.getMe(req, res, next));
router.get('/abha', (req, res, next) => patientController.getAbha(req, res, next));
router.post('/abha/generate', requireRole('patient'), (req, res, next) => patientController.generateAbha(req, res, next));
router.get('/emergency-pass', (req, res, next) => patientController.getEmergencyPass(req, res, next));
router.get('/health-history', (req, res, next) => patientController.getHealthHistory(req, res, next));
router.post('/records', requireRole('patient', 'doctor'), upload.single('document'), (req, res, next) => patientController.uploadRecord(req, res, next));
router.get('/appointments', (req, res, next) => patientController.getAppointments(req, res, next));
router.post('/appointments', (req, res, next) => patientController.createAppointment(req, res, next));
router.patch('/appointments/:id/cancel', (req, res, next) => patientController.cancelAppointment(req, res, next));
router.delete('/appointments/:id', (req, res, next) => patientController.cancelAppointment(req, res, next));

// Access Control Enforcement: Patients CANNOT approve or decline appointments.
// Only doctors have clinical authorization to approve or decline slots.
router.patch('/appointments/:id/status', (req, res) => {
  return res.status(403).json({
    success: false,
    error: 'Access Denied: Patients cannot approve or decline appointments. Only authorized doctors have clinical access.',
    code: 'DOCTOR_ACCESS_ONLY',
  });
});
router.patch('/appointments/:id/approve', (req, res) => {
  return res.status(403).json({
    success: false,
    error: 'Access Denied: Patients cannot approve appointments. Only authorized doctors have clinical access.',
    code: 'DOCTOR_ACCESS_ONLY',
  });
});
router.patch('/appointments/:id/decline', (req, res) => {
  return res.status(403).json({
    success: false,
    error: 'Access Denied: Patients cannot decline appointments. Only authorized doctors have clinical access.',
    code: 'DOCTOR_ACCESS_ONLY',
  });
});
router.get('/schemes', (req, res, next) => patientController.getSchemes(req, res, next));
router.post('/consent', requireRole('patient'), (req, res, next) => patientController.updateConsent(req, res, next));
router.get('/access-logs', (req, res, next) => patientController.getAccessLogs(req, res, next));

module.exports = router;
