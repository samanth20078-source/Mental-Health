import React, { useState, useEffect } from 'react';
import { 
  DataType, 
  PatientDataBundle, 
  ConsentRecord
} from '../../lib/professional/types';
import { accessManager } from '../../lib/professional/AccessManager';

interface Props {
  professionalId: string;
  professionalName: string;
}

export const ProfessionalDashboard: React.FC<Props> = ({ professionalId, professionalName }) => {
  if (import.meta.env && import.meta.env.PROD && professionalId === 'dr-smith-456') {
    return <div className="p-8 text-red-600 bg-red-50 border border-red-200 rounded-lg m-4">CRITICAL SECURITY ERROR: Demo professional identities cannot be used in a production environment.</div>;
  }
  const [patientIdInput, setPatientIdInput] = useState('');
  const [activePatientId, setActivePatientId] = useState<string | null>(null);
  const [data, setData] = useState<PatientDataBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestMode, setRequestMode] = useState(false);
  const [requestReason, setRequestReason] = useState('');
  const [requestedTypes, setRequestedTypes] = useState<DataType[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const availableTypes: DataType[] = ['SELF_REPORTED', 'SENSOR_INSIGHTS', 'RAW_SENSOR_DATA', 'SAFETY_EVENTS', 'AI_SUMMARIES'];

  const handleFetchData = (pid: string) => {
    try {
      setError(null);
      
      const consent = accessManager.checkActiveConsent(pid, professionalId);
      if (!consent) {
        throw new Error("No active consent found. Please request access.");
      }

      const bundle = accessManager.accessPatientData(professionalId, pid, consent.grantedDataTypes);
      setData(bundle);
      setActivePatientId(pid);
    } catch (err: any) {
      setError(err.message);
      setData(null);
      setActivePatientId(null);
    }
  };

  const handleRequestAccess = () => {
    if (!patientIdInput) return setError("Patient ID is required");
    if (requestedTypes.length === 0) return setError("Select at least one data type");
    if (!requestReason) return setError("Reason is required");

    try {
      accessManager.requestAccess(patientIdInput, professionalId, professionalName, requestedTypes, requestReason);
      setSuccessMsg(`Access request sent to patient ${patientIdInput}`);
      setRequestMode(false);
      setRequestReason('');
      setRequestedTypes([]);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleType = (type: DataType) => {
    setRequestedTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-slate-50 min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl font-light text-slate-800">Professional Dashboard</h1>
        <p className="text-slate-500 mt-2">Welcome, {professionalName} ({professionalId})</p>
      </header>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
        <h2 className="text-xl font-medium mb-4">Access Patient Record</h2>
        <div className="flex gap-4 mb-4">
          <input 
            type="text" 
            placeholder="Enter Patient ID" 
            value={patientIdInput}
            onChange={(e) => setPatientIdInput(e.target.value)}
            className="border p-2 rounded flex-grow"
          />
          <button 
            onClick={() => handleFetchData(patientIdInput)}
            className="px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700"
          >
            Access Data
          </button>
          <button 
            onClick={() => setRequestMode(!requestMode)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            Request Access
          </button>
        </div>

        {requestMode && (
          <div className="bg-blue-50 p-4 rounded mt-4">
            <h3 className="font-medium mb-2">New Access Request</h3>
            <textarea 
              placeholder="Reason for requesting access (e.g., Routine monitoring)"
              value={requestReason}
              onChange={e => setRequestReason(e.target.value)}
              className="w-full border p-2 rounded mb-4"
            />
            <p className="font-medium mb-2">Requested Data Types:</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {availableTypes.map(type => (
                <label key={type} className="flex items-center gap-2 bg-white px-3 py-1 border rounded">
                  <input type="checkbox" checked={requestedTypes.includes(type)} onChange={() => toggleType(type)} />
                  {type}
                </label>
              ))}
            </div>
            <button onClick={handleRequestAccess} className="px-4 py-2 bg-blue-600 text-white rounded">
              Submit Request
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-md mb-6">
          {successMsg}
        </div>
      )}

      {data && activePatientId && (
        <div className="space-y-6">
          <h2 className="text-2xl font-light text-slate-800">Viewing Record: {activePatientId}</h2>
          
          {/* Section 1: Self-Reported */}
          <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-medium text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Self-Reported Information
            </h2>
            {data.selfReported ? (
              <ul className="space-y-3">
                {data.selfReported.map(item => (
                  <li key={item.id} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-sm text-slate-500">{new Date(item.timestamp).toLocaleString()}</p>
                    <p className="text-slate-800 mt-1">"{item.content}"</p>
                    {item.moodScale && <p className="text-sm text-slate-500 mt-2">Mood Scale: {item.moodScale}/10</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-400 italic">No access to self-reported data.</p>
            )}
          </section>

          {/* Section 2: Sensor Insights */}
          <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-medium text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Wearable Sensor Insights
            </h2>
            {data.sensorInsights ? (
              <ul className="space-y-3">
                {data.sensorInsights.map(item => (
                  <li key={item.id} className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                    <p className="text-sm text-emerald-600">{item.featureName} - {new Date(item.timestamp).toLocaleString()}</p>
                    <p className="text-emerald-900 mt-1">{item.insightText}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-400 italic">No access to sensor insights.</p>
            )}
          </section>

          {/* Section 3: AI Summaries */}
          <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-medium text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              AI-Generated Summaries
            </h2>
            {data.aiSummaries ? (
              <ul className="space-y-3">
                {data.aiSummaries.map(item => (
                  <li key={item.id} className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                    <p className="text-sm text-purple-600">v{item.generationVersion} - {new Date(item.timestamp).toLocaleString()}</p>
                    <p className="text-purple-900 mt-1">{item.summaryText}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-400 italic">No access to AI summaries.</p>
            )}
          </section>

          {/* Section 4: Safety Events */}
          <section className="bg-white p-6 rounded-xl shadow-sm border border-red-100">
            <h2 className="text-xl font-medium text-red-800 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              Safety Events
            </h2>
            {data.safetyEvents ? (
              <ul className="space-y-3">
                {data.safetyEvents.map(item => (
                  <li key={item.id} className="bg-red-50 p-3 rounded-lg border border-red-200">
                    <p className="text-sm font-medium text-red-800">{item.severity} SEVERITY</p>
                    <p className="text-red-900 mt-1">Intervention applied: {item.intervention}</p>
                    <p className="text-xs text-red-600 mt-2">{new Date(item.timestamp).toLocaleString()}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-400 italic">No access to safety events.</p>
            )}
          </section>

          {/* Section 5: Raw Sensor Data (Highly Restricted) */}
          <section className="bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-700">
            <h2 className="text-xl font-medium text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Raw Sensor Measurements (Restricted)
            </h2>
            {data.rawSensorData ? (
              <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm text-amber-400 overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr>
                      <th className="pb-2">Timestamp</th>
                      <th className="pb-2">Sensor</th>
                      <th className="pb-2">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rawSensorData.map(item => (
                      <tr key={item.id} className="border-t border-slate-700">
                        <td className="py-2">{new Date(item.timestamp).toLocaleString()}</td>
                        <td className="py-2">{item.sensorType}</td>
                        <td className="py-2">{item.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-400 italic">No access to raw physiological data.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
