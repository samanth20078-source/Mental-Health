import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { accessManager } from '../lib/professional/AccessManager';

export function PrivacyCenter() {
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  const activeConsents = user ? accessManager.getPatientConsents(user.uid) : [];

  const handleRevoke = (consentId: string) => {
    if (user) {
      accessManager.revokeConsent(consentId, user.uid);
      // force re-render via a tiny hack or state in a real app
      window.location.reload(); 
    }
  };

  const handleDeleteData = async () => {
    if (!user) return;
    const confirmed = window.confirm("Are you sure? This will permanently delete all your mood logs, assessments, and AI conversations. This action cannot be undone.");
    if (!confirmed) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/user/data', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete data');
      }
      setDeleteSuccess(true);
    } catch (err: any) {
      setDeleteError(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = () => {
    alert("Data export functionality will download a JSON archive of your mood logs and assessments.");
    // In a real app, this would trigger an API endpoint returning a signed URL to a zip file.
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-serif text-slate-800 mb-6">Privacy & Data Center</h1>
      
      <section className="mb-10">
        <h2 className="text-xl font-medium text-slate-700 mb-4">Your Stored Data</h2>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <ul className="space-y-4">
            <li className="flex justify-between items-center border-b pb-4">
              <div>
                <h3 className="font-medium text-slate-800">Account Profile</h3>
                <p className="text-sm text-slate-500">Email, authentication state</p>
              </div>
              <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">Encrypted</span>
            </li>
            <li className="flex justify-between items-center border-b pb-4">
              <div>
                <h3 className="font-medium text-slate-800">Mood & Assessments</h3>
                <p className="text-sm text-slate-500">Daily check-ins, clinical questionnaires</p>
              </div>
              <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">Encrypted</span>
            </li>
            <li className="flex justify-between items-center">
              <div>
                <h3 className="font-medium text-slate-800">AI Conversations</h3>
                <p className="text-sm text-slate-500">Chat history with the wellness assistant</p>
              </div>
              <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">Encrypted</span>
            </li>
          </ul>
          
          <div className="mt-6 pt-6 border-t flex justify-end">
            <button 
              onClick={handleExport}
              className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
            >
              Export All Data (JSON)
            </button>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-medium text-slate-700 mb-4">Professional Access</h2>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          {activeConsents.length === 0 ? (
            <p className="text-slate-500 text-sm">No professionals currently have access to your data.</p>
          ) : (
            <div className="space-y-4">
              {activeConsents.map(consent => (
                <div key={consent.id} className="flex justify-between items-center p-4 bg-slate-50 rounded border">
                  <div>
                    <h3 className="font-medium">{consent.professionalName}</h3>
                    <p className="text-xs text-slate-500">Status: <span className="font-semibold">{consent.status}</span></p>
                    <p className="text-xs text-slate-500">Types: {consent.grantedDataTypes.join(', ') || 'None'}</p>
                  </div>
                  {consent.status === 'GRANTED' && (
                    <button 
                      onClick={() => handleRevoke(consent.id)}
                      className="text-red-600 text-sm hover:underline"
                    >
                      Revoke Access
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-medium text-red-600 mb-4">Danger Zone</h2>
        <div className="bg-red-50 p-6 rounded-lg shadow-sm border border-red-100">
          <h3 className="font-medium text-red-800 mb-2">Delete Account & Data</h3>
          <p className="text-sm text-red-600 mb-4">
            Permanently delete all your personal data, mood logs, and conversations. 
            This action cannot be undone. Any active professional access will be immediately revoked.
          </p>
          
          {deleteError && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
              {deleteError}
            </div>
          )}
          
          {deleteSuccess ? (
            <div className="p-3 bg-green-100 text-green-700 rounded text-sm font-medium">
              Data successfully deleted. You will be signed out.
            </div>
          ) : (
            <button 
              onClick={handleDeleteData}
              disabled={isDeleting}
              className="bg-red-600 text-white px-4 py-2 rounded font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete My Data'}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
