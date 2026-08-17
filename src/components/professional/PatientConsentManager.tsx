import React, { useState, useEffect } from 'react';
import { ConsentRecord, DataType } from '../../lib/professional/types';
import { accessManager } from '../../lib/professional/AccessManager';

interface Props {
  patientId: string;
}

export const PatientConsentManager: React.FC<Props> = ({ patientId }) => {
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadConsents = () => {
    try {
      const records = accessManager.getPatientConsents(patientId);
      setConsents(records.sort((a,b) => b.createdAt - a.createdAt));
      setError(null);
    } catch(err:any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadConsents();
  }, [patientId]);

  const handleRespond = (consentId: string, status: 'GRANTED' | 'DENIED', requestedTypes: DataType[]) => {
    try {
      // In a real app, user might uncheck some requestedTypes. Here we just grant what they requested, EXCEPT maybe they deny Raw Sensor Data.
      // For simplicity in this UI, we either grant all requested or deny.
      const granted = status === 'GRANTED' ? requestedTypes : [];
      accessManager.respondToRequest(consentId, patientId, status, granted);
      loadConsents();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRevoke = (consentId: string) => {
    try {
      accessManager.revokeConsent(consentId, patientId);
      loadConsents();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-slate-50 min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl font-light text-slate-800">Data Access & Consent</h1>
        <p className="text-slate-500 mt-2">Manage who has access to your health data.</p>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="space-y-6">
        {consents.length === 0 ? (
          <p className="text-slate-500 italic">No access requests or active consents.</p>
        ) : (
          consents.map(consent => (
            <div key={consent.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-medium text-slate-800">{consent.professionalName}</h3>
                  <p className="text-sm text-slate-500">ID: {consent.professionalId}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium 
                  ${consent.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : ''}
                  ${consent.status === 'GRANTED' ? 'bg-green-100 text-green-800' : ''}
                  ${consent.status === 'DENIED' ? 'bg-red-100 text-red-800' : ''}
                  ${consent.status === 'REVOKED' ? 'bg-slate-100 text-slate-800' : ''}
                  ${consent.status === 'EXPIRED' ? 'bg-slate-100 text-slate-800' : ''}
                `}>
                  {consent.status}
                </span>
              </div>

              <div className="mb-4">
                <p className="text-sm text-slate-600 mb-1"><strong>Reason for Access:</strong></p>
                <p className="text-slate-800 bg-slate-50 p-3 rounded border border-slate-100">{consent.reason}</p>
              </div>

              <div className="mb-6">
                <p className="text-sm text-slate-600 mb-2"><strong>Requested Data:</strong></p>
                <div className="flex flex-wrap gap-2">
                  {consent.requestedDataTypes.map(type => (
                    <span key={type} className="text-xs bg-blue-50 text-blue-800 px-2 py-1 rounded border border-blue-100">
                      {type}
                    </span>
                  ))}
                </div>
              </div>

              {consent.status === 'PENDING' && (
                <div className="flex gap-3 border-t border-slate-100 pt-4">
                  <button 
                    onClick={() => handleRespond(consent.id, 'GRANTED', consent.requestedDataTypes)}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 transition-colors"
                  >
                    Grant Access
                  </button>
                  <button 
                    onClick={() => handleRespond(consent.id, 'DENIED', [])}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500 transition-colors"
                  >
                    Deny Access
                  </button>
                </div>
              )}

              {consent.status === 'GRANTED' && (
                <div className="flex justify-between items-center border-t border-slate-100 pt-4">
                  <p className="text-sm text-slate-500">
                    Expires: {new Date(consent.expiresAt).toLocaleDateString()}
                  </p>
                  <button 
                    onClick={() => handleRevoke(consent.id)}
                    className="px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 transition-colors"
                  >
                    Revoke Access
                  </button>
                </div>
              )}
              
              {['REVOKED', 'DENIED', 'EXPIRED'].includes(consent.status) && (
                <div className="border-t border-slate-100 pt-4">
                   <p className="text-sm text-slate-500">
                    Updated: {new Date(consent.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
