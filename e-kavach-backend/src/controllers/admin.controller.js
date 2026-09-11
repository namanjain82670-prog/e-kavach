const adminService = require('../services/admin.service');

class AdminController {
  async getDashboardSummary(req, res, next) {
    try {
      const summary = await adminService.getDashboardSummary();
      res.json({ success: true, summary });
    } catch (err) {
      next(err);
    }
  }

  async getBeds(req, res, next) {
    try {
      const beds = await adminService.getBeds();
      res.json({ success: true, beds });
    } catch (err) {
      next(err);
    }
  }

  async updateBed(req, res, next) {
    try {
      const updated = await adminService.updateBed(req.params.id, req.body);
      res.json({ success: true, message: 'Bed occupancy updated successfully', bed: updated });
    } catch (err) {
      next(err);
    }
  }

  async getPharmacy(req, res, next) {
    try {
      const pharmacy = await adminService.getPharmacy();
      res.json({ success: true, pharmacy });
    } catch (err) {
      next(err);
    }
  }

  async updatePharmacy(req, res, next) {
    try {
      const updated = await adminService.updatePharmacy(req.params.id, req.body);
      res.json({ success: true, message: 'Pharmacy stock updated successfully', item: updated });
    } catch (err) {
      next(err);
    }
  }

  async getStaff(req, res, next) {
    try {
      const staff = await adminService.getStaff();
      res.json({ success: true, staff });
    } catch (err) {
      next(err);
    }
  }

  async getDoctors(req, res, next) {
    try {
      const doctors = await adminService.getDoctors();
      res.json({ success: true, doctors });
    } catch (err) {
      next(err);
    }
  }

  async getPatients(req, res, next) {
    try {
      const patients = await adminService.getPatients();
      res.json({ success: true, patients });
    } catch (err) {
      next(err);
    }
  }

  async createPatient(req, res, next) {
    try {
      const patient = await adminService.createPatient(req.body);
      res.status(201).json({ success: true, message: 'Patient registered in hospital registry successfully', patient });
    } catch (err) {
      next(err);
    }
  }

  async getHospitalNetwork(req, res, next) {
    try {
      const network = await adminService.getHospitalNetwork();
      res.json({ success: true, network });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminController();
