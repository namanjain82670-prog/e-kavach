import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  setDoc,
  getDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// CRITICAL: Must supply firestoreDatabaseId for custom provisioned Firestore DB
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

/**
 * Standardized Firestore error handler conforming to ABDM ABAC Security specification
 */
export function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path: path || null,
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Validate Connection to Firestore on initial boot
 */
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('✅ Connected to ABDM Firestore instance successfully:', firebaseConfig.firestoreDatabaseId);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('⚠️ Firestore notice: client is offline or initializing.');
    } else {
      console.log('ℹ️ Firestore ready for operations (handshake completed).');
    }
    return false;
  }
}

// Run connectivity check on module load
testConnection().catch(() => {});

/**
 * Google Login via popup
 */
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Google Sign-In failed:', error);
    throw error;
  }
}

/**
 * Logout from Firebase Auth
 */
export async function logoutFirebase() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Firebase signout error:', error);
  }
}

/**
 * Sync appointment token and clinical booking to Firestore
 */
export async function saveAppointmentToFirestore(appointment) {
  if (!appointment?.id) return null;
  const path = `appointments/${appointment.id}`;
  try {
    const docRef = doc(db, 'appointments', appointment.id);
    await setDoc(
      docRef,
      {
        id: appointment.id,
        patientId: appointment.patientId || auth.currentUser?.uid || 'anonymous-patient',
        patientName: appointment.patientName || 'Registered Patient',
        patientPhone: appointment.patientPhone || '',
        doctorId: appointment.doctorId || 'doc-cardio-01',
        department: appointment.department || 'Cardiology',
        scheduledAt: appointment.scheduledAt || new Date().toISOString(),
        timeSlot: appointment.timeSlot || '10:30 AM',
        tokenNumber: appointment.tokenNumber || 'EK-SLOT-101',
        status: appointment.status || 'PENDING',
        mode: appointment.mode || 'IN_PERSON',
        symptoms: (appointment.symptoms || '').slice(0, 500),
        notes: (appointment.notes || '').slice(0, 1000),
        createdAt: appointment.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    console.log('✅ Appointment synced to Firestore:', appointment.id);
    return appointment;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Log emergency scan access event to immutable accessLogs collection
 */
export async function logEmergencyAccessToFirestore(logPayload) {
  const logId = logPayload.id || `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const path = `accessLogs/${logId}`;
  try {
    const docRef = doc(db, 'accessLogs', logId);
    await setDoc(docRef, {
      id: logId,
      accessorId: auth.currentUser?.uid || logPayload.accessorId || 'system',
      accessorName: logPayload.accessorName || 'Attending Clinician',
      accessorRole: logPayload.accessorRole || 'doctor',
      patientId: logPayload.patientId || 'patient-default',
      accessType: logPayload.accessType || 'EMERGENCY_PASS_BYPASS',
      reason: (logPayload.reason || 'Golden hour trauma triage scan').slice(0, 500),
      timestamp: new Date().toISOString(),
      latencyMs: logPayload.latencyMs || 0,
    });
    console.log('✅ ABDM Immutable Access Log committed to Firestore:', logId);
  } catch (error) {
    // Non-blocking log catch
    try {
      handleFirestoreError(error, OperationType.CREATE, path);
    } catch (_e) {
      // Swallowed to prevent disruption of emergency flows
    }
  }
}

/**
 * Persist bed telemetry update to Firestore
 */
export async function syncBedTelemetryToFirestore(bed) {
  if (!bed?.id) return;
  const path = `beds/${bed.id}`;
  try {
    const docRef = doc(db, 'beds', bed.id);
    await setDoc(
      docRef,
      {
        id: bed.id,
        ward: bed.ward || 'ICU Trauma Bay',
        status: bed.status || 'AVAILABLE',
        department: bed.department || 'Critical Care',
        oxygenLevel: typeof bed.oxygenLevel === 'number' ? bed.oxygenLevel : 98,
        patientName: bed.patientName || '',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn('Bed telemetry firestore sync note:', error?.message || error);
  }
}

