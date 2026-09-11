import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, loginWithGoogle, logoutFirebase, db } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const roleProfiles = {
  patient: {
    role: 'patient',
    name: 'Rajesh V. Sharma',
    id: 'ABHA-9824-8819-TN',
    tag: 'Verified Health ID',
    hospital: 'Apollo Greams Trauma Hub',
    dashboardRoute: '/patient/dashboard',
  },
  doctor: {
    role: 'doctor',
    name: 'Dr. Kavitha Menon',
    title: 'Chief Interventional Cardio',
    id: 'NMC: MD-44912-TN',
    tag: 'ID-9942',
    hospital: 'Apollo Greams Trauma Hub',
    dashboardRoute: '/doctor/dashboard',
  },
  hospital: {
    role: 'hospital',
    name: 'Dr. R. K. Nambiar',
    title: 'Hospital Administrator',
    id: 'AP-HSP-842-TN',
    tag: 'VERIFIED ADMIN',
    hospital: 'Apollo Greams Trauma Hub',
    dashboardRoute: '/admin/dashboard',
  },
  admin: {
    role: 'hospital',
    name: 'Dr. R. K. Nambiar',
    title: 'Hospital Administrator',
    id: 'AP-HSP-842-TN',
    tag: 'VERIFIED ADMIN',
    hospital: 'Apollo Greams Trauma Hub',
    dashboardRoute: '/admin/dashboard',
  },
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('ekavach_user');
    return saved ? JSON.parse(saved) : roleProfiles.patient;
  });

  const login = async (role, credentials = {}) => {
    const normRole = role === 'admin' ? 'hospital' : (role || 'patient');
    const profile = roleProfiles[normRole] || roleProfiles.patient;
    try {
      const payload = { role: normRole };
      if (credentials.identifier) {
        if (credentials.identifier.includes('@')) {
          payload.email = credentials.identifier;
        } else if (/^\+?[0-9\s-]+$/.test(credentials.identifier) && credentials.identifier.replace(/\D/g, '').length >= 10) {
          payload.phone = credentials.identifier;
        } else {
          payload.identifier = credentials.identifier;
        }
      }
      if (credentials.password) {
        payload.password = credentials.password;
      }
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          const merged = { ...profile, ...data.user, role: normRole, dashboardRoute: profile.dashboardRoute };
          setCurrentUser(merged);
          localStorage.setItem('ekavach_user', JSON.stringify(merged));
          if (data.accessToken) {
            localStorage.setItem('ekavach_token', data.accessToken);
          }
          return profile.dashboardRoute;
        }
      }
    } catch (e) {
      console.warn('Real-time auth sync fallback to local profile:', e);
    }
    setCurrentUser(profile);
    localStorage.setItem('ekavach_user', JSON.stringify(profile));
    return profile.dashboardRoute;
  };

  const register = async (role, details = {}) => {
    const normRole = role === 'admin' ? 'hospital' : (role || 'patient');
    const profile = roleProfiles[normRole] || roleProfiles.patient;
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: details.email || `${normRole}_${Date.now()}@ekavach.gov.in`,
          phone: details.phone || details.contact,
          password: details.password || 'Ekavach@2026',
          role: normRole,
          name: details.name || profile.name,
          additionalDetails: details,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          const merged = { ...profile, ...data.user, name: details.name || profile.name, role: normRole, dashboardRoute: profile.dashboardRoute };
          setCurrentUser(merged);
          localStorage.setItem('ekavach_user', JSON.stringify(merged));
          if (data.accessToken) {
            localStorage.setItem('ekavach_token', data.accessToken);
          }
          return profile.dashboardRoute;
        }
      }
    } catch (e) {
      console.warn('Real-time register sync fallback to local profile:', e);
    }
    const merged = { ...profile, name: details.name || profile.name, role: normRole, dashboardRoute: profile.dashboardRoute };
    setCurrentUser(merged);
    localStorage.setItem('ekavach_user', JSON.stringify(merged));
    return profile.dashboardRoute;
  };

  const [firebaseUser, setFirebaseUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        // Sync or retrieve user profile in Firestore
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const data = userSnap.data();
            const rawRole = data.role || 'patient';
            const role = rawRole === 'admin' ? 'hospital' : rawRole;
            const baseProfile = roleProfiles[role] || roleProfiles.patient;
            const updated = {
              ...baseProfile,
              name: data.name || user.displayName || baseProfile.name,
              email: user.email,
              uid: user.uid,
              id: data.abhaId || baseProfile.id,
              photoURL: user.photoURL,
              role: role,
              dashboardRoute: baseProfile.dashboardRoute,
              isFirebase: true,
            };
            setCurrentUser(updated);
            localStorage.setItem('ekavach_user', JSON.stringify(updated));
          }
        } catch (err) {
          console.warn('Firestore profile sync note:', err);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async (preferredRole = 'patient') => {
    try {
      const gUser = await loginWithGoogle();
      if (!gUser) throw new Error('No user returned from Google sign-in');

      // Honor the explicitly selected role from the active tab;
      // only default to designated admin or doctor if no explicit role was passed
      let role = preferredRole;
      if (!role) {
        if (gUser.email === 'namanjain82670@gmail.com') {
          role = 'hospital';
        } else if (gUser.email?.toLowerCase().includes('doctor') || gUser.displayName?.toLowerCase().includes('dr.')) {
          role = 'doctor';
        } else {
          role = 'patient';
        }
      }

      const normRole = role === 'admin' ? 'hospital' : role;
      const baseProfile = roleProfiles[normRole] || roleProfiles.patient;
      const abhaId = normRole === 'patient' ? `ABHA-${gUser.uid.slice(0, 4).toUpperCase()}-${gUser.uid.slice(4, 8).toUpperCase()}-TN` : baseProfile.id;

      // Upsert profile document in Firestore
      try {
        const userDocRef = doc(db, 'users', gUser.uid);
        await setDoc(
          userDocRef,
          {
            id: gUser.uid,
            uid: gUser.uid,
            email: gUser.email,
            name: gUser.displayName || baseProfile.name,
            role: normRole === 'hospital' ? 'admin' : normRole,
            abhaId: abhaId,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (e) {
        console.warn('Could not upsert Firestore user profile:', e);
      }

      const merged = {
        ...baseProfile,
        name: gUser.displayName || baseProfile.name,
        email: gUser.email,
        uid: gUser.uid,
        id: abhaId,
        photoURL: gUser.photoURL,
        role: normRole,
        dashboardRoute: baseProfile.dashboardRoute,
        isFirebase: true,
      };

      setCurrentUser(merged);
      localStorage.setItem('ekavach_user', JSON.stringify(merged));
      return baseProfile.dashboardRoute;
    } catch (err) {
      console.error('Google Sign-In error:', err);
      throw err;
    }
  };

  const logout = async () => {
    await logoutFirebase();
    localStorage.removeItem('ekavach_user');
    localStorage.removeItem('ekavach_token');
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        firebaseUser,
        signInWithGoogle,
        login,
        register,
        logout,
        roleProfiles,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
