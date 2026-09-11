const db = require('../database/db');
const socketService = require('./socket.service');

class AdminService {
  async getDashboardSummary(hospitalId = 'hosp-apollo-greams') {
    const beds = await db.bed.findMany({ where: { hospitalId } });
    const triageEntries = await db.triageEntry.findMany({ where: { hospitalId } });
    const pharmacyItems = await db.pharmacyItem.findMany({ where: { hospitalId } });
    const staffMembers = await db.staffMember.findMany({ where: { hospitalId } });

    const totalBeds = beds.reduce((acc, b) => acc + b.totalBeds, 0) || 450;
    const occupiedBeds = beds.reduce((acc, b) => acc + b.occupiedBeds, 0) || 382;
    const availableBeds = beds.reduce((acc, b) => acc + b.availableBeds, 0) || 68;

    const icuBed = beds.find((b) => b.wardType === 'ICU') || { totalBeds: 50, occupiedBeds: 46, availableBeds: 4 };
    const ccuBed = beds.find((b) => b.wardType === 'CCU') || { totalBeds: 32, occupiedBeds: 28, availableBeds: 4 };
    const traumaBed = beds.find((b) => b.wardType === 'TRAUMA_BAY') || { totalBeds: 8, occupiedBeds: 6, availableBeds: 2 };

    const redTriage = triageEntries.filter((t) => t.triageColor === 'RED').length;
    const yellowTriage = triageEntries.filter((t) => t.triageColor === 'YELLOW').length;
    const greenTriage = triageEntries.filter((t) => t.triageColor === 'GREEN').length;

    const lowStockItems = pharmacyItems.filter((p) => p.status === 'LOW_STOCK' || p.stockQty <= p.reorderThreshold);
    const onDutyStaff = staffMembers.filter((s) => s.status === 'ON_DUTY').length;

    return {
      hospital: {
        id: hospitalId,
        name: 'Apollo Greams Trauma Hub',
        code: 'AP-HSP-842-TN',
        status: 'OPERATIONAL',
      },
      bedMetrics: {
        total: totalBeds,
        occupied: occupiedBeds,
        available: availableBeds,
        occupancyRate: Math.round((occupiedBeds / totalBeds) * 100),
        icu: {
          total: icuBed.totalBeds,
          occupied: icuBed.occupiedBeds,
          available: icuBed.availableBeds,
          loadPct: Math.round((icuBed.occupiedBeds / icuBed.totalBeds) * 100),
        },
        ccu: {
          total: ccuBed.totalBeds,
          occupied: ccuBed.occupiedBeds,
          available: ccuBed.availableBeds,
        },
        traumaBay: {
          total: traumaBed.totalBeds,
          occupied: traumaBed.occupiedBeds,
          available: traumaBed.availableBeds,
        },
      },
      triageMetrics: {
        totalActive: triageEntries.length,
        red: redTriage,
        yellow: yellowTriage,
        green: greenTriage,
      },
      operationsMetrics: {
        totalStaff: staffMembers.length,
        onDutyStaff,
        lowStockPharmacyCount: lowStockItems.length,
      },
      recentIngress: triageEntries.slice(0, 5),
    };
  }

  async getBeds(hospitalId = 'hosp-apollo-greams') {
    return await db.bed.findMany({ where: { hospitalId } });
  }

  async updateBed(bedId, updateData) {
    const existing = await db.bed.findUnique({ where: { id: bedId } });
    if (!existing) {
      throw new Error(`Bed category with id ${bedId} not found`);
    }

    const occupied = typeof updateData.occupiedBeds === 'number' ? updateData.occupiedBeds : existing.occupiedBeds;
    const total = typeof updateData.totalBeds === 'number' ? updateData.totalBeds : existing.totalBeds;
    const available = Math.max(0, total - occupied);

    const updated = await db.bed.update({
      where: { id: bedId },
      data: {
        ...updateData,
        occupiedBeds: occupied,
        totalBeds: total,
        availableBeds: available,
      },
    });

    // Broadcast live telemetry update
    socketService.broadcastTelemetry('bed:update', updated);

    return updated;
  }

  async getPharmacy(hospitalId = 'hosp-apollo-greams') {
    return await db.pharmacyItem.findMany({ where: { hospitalId } });
  }

  async updatePharmacy(itemId, updateData) {
    const existing = await db.pharmacyItem.findUnique({ where: { id: itemId } });
    if (!existing) {
      throw new Error(`Pharmacy item with id ${itemId} not found`);
    }

    const stock = typeof updateData.stockQty === 'number' ? updateData.stockQty : existing.stockQty;
    const threshold = typeof updateData.reorderThreshold === 'number' ? updateData.reorderThreshold : existing.reorderThreshold;

    let status = 'IN_STOCK';
    if (stock <= 0) status = 'OUT_OF_STOCK';
    else if (stock <= threshold) status = 'LOW_STOCK';

    const updated = await db.pharmacyItem.update({
      where: { id: itemId },
      data: {
        ...updateData,
        stockQty: stock,
        status,
      },
    });

    // Broadcast if stock status changed
    if (status !== existing.status) {
      socketService.broadcastTelemetry('pharmacy:alert', {
        item: updated.name,
        status: updated.status,
        stockQty: updated.stockQty,
      });
    }

    return updated;
  }

  async getStaff(hospitalId = 'hosp-apollo-greams') {
    return await db.staffMember.findMany({ where: { hospitalId } });
  }

  async getDoctors() {
    return await db.doctorProfile.findMany();
  }

  async getPatients() {
    const patients = await db.patientProfile.findMany({
      include: {
        emergencyPass: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return patients;
  }

  async createPatient(data) {
    const profile = await db.patientProfile.create({
      data: {
        name: data.name,
        abhaNumber: data.abhaNumber || data.abha || `9824-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-TN`,
        bloodGroup: data.bloodGroup || 'O+ (Rh Pos)',
        gender: data.gender || (data.ageGender && data.ageGender.includes('F') ? 'Female' : 'Male'),
        hospitalAffiliation: 'Apollo Greams Trauma Hub',
        emergencyToken: `EK-TR-${Math.floor(10000 + Math.random() * 90000)}-V4`,
        chronicConditions: data.conditions || [],
        allergies: data.allergies || [],
        emergencyContacts: [
          { name: data.emergencyContact || 'Primary Relative', relation: 'Family', phone: data.phone || '+91 98401 22819', priority: 1 }
        ]
      }
    });

    try {
      socketService.broadcastTelemetry('patient:registered', {
        id: profile.id,
        name: profile.name,
        abha: profile.abhaNumber,
        timestamp: new Date().toISOString()
      });
    } catch (_e) {}

    return profile;
  }

  async getHospitalNetwork() {
    return await db.hospitalNetworkNode.findMany({
      orderBy: { distanceKm: 'asc' },
    });
  }
}

module.exports = new AdminService();
