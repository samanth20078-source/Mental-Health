import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { ShieldCheck, LogOut } from 'lucide-react';
import { db } from '../lib/firebase.ts';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export const SettingsPage = () => {
  const { user, signOut } = useAuth();
  const [consent, setConsent] = useState<{ dataProcessingConsent: boolean; dataSharingConsent: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConsent = async () => {
      if (!user) return;
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setConsent(docSnap.data() as any);
        } else {
          // Initialize if missing
          const initialConsent = { dataProcessingConsent: false, dataSharingConsent: false, updatedAt: serverTimestamp() };
          await setDoc(docRef, initialConsent);
          setConsent(initialConsent);
        }
      } catch (error) {
        console.error('Failed to load consent', error);
      } finally {
        setLoading(false);
      }
    };
    loadConsent();
  }, [user]);

  const updateConsent = async (type: 'processing' | 'sharing', value: boolean) => {
    if (!user || !consent) return;
    
    const newConsent = {
      dataProcessingConsent: type === 'processing' ? value : consent.dataProcessingConsent,
      dataSharingConsent: type === 'sharing' ? value : consent.dataSharingConsent,
      updatedAt: serverTimestamp()
    };

    setConsent(newConsent); // Optimistic UI update

    try {
      await setDoc(doc(db, 'users', user.uid), newConsent, { merge: true });
    } catch (error) {
      console.error('Failed to update consent', error);
    }
  };

  if (loading) {
    return <div className="p-8 flex items-center justify-center min-h-[50vh]"><p className="text-slate-500 animate-pulse">Loading settings...</p></div>;
  }

  return (
    <div className="p-6 md:p-12 max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-slate-500 mt-2">Manage your account preferences and data privacy controls.</p>
      </header>

      <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 space-y-8">
        <div>
          <h2 className="text-lg font-medium text-slate-900 mb-4">Account Profile</h2>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div>
              <p className="font-medium text-slate-900">{user?.displayName || 'User'}</p>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>
            <button 
              onClick={signOut}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors rounded-xl shadow-sm"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0 mt-1">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-lg font-medium text-slate-900">Privacy & Data Consent</h2>
              <p className="text-slate-500 text-sm mt-1 leading-relaxed">
                Your wellbeing data is encrypted and strictly controlled. You maintain full ownership and can revoke these permissions at any time. We require explicit consent to process logs or share insights.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-start gap-4 p-5 rounded-2xl border border-slate-200 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer">
              <div className="pt-0.5">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                  checked={consent?.dataProcessingConsent || false}
                  onChange={(e) => updateConsent('processing', e.target.checked)}
                />
              </div>
              <div>
                <span className="block font-medium text-slate-900">Personal Insights Processing</span>
                <span className="block text-sm text-slate-500 mt-1 leading-relaxed">
                  Allow the platform to analyze your mood logs and wellbeing check-ins to generate personal historical charts and patterns. Your data is processed anonymously.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-4 p-5 rounded-2xl border border-slate-200 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer">
              <div className="pt-0.5">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                  checked={consent?.dataSharingConsent || false}
                  onChange={(e) => updateConsent('sharing', e.target.checked)}
                />
              </div>
              <div>
                <span className="block font-medium text-slate-900">Professional Data Sharing</span>
                <span className="block text-sm text-slate-500 mt-1 leading-relaxed">
                  Allow authorized healthcare professionals linked to your account to view aggregated historical trends to support your care plan.
                </span>
              </div>
            </label>
          </div>
        </div>
      </section>
    </div>
  );
};
