import React, { useState, useEffect } from 'react';
import { 
  PermissionType, 
  PatientDataBundle, 
} from '../../lib/professional/types';
import { accessManager } from '../../lib/professional/AccessManager';

interface Props {
  professionalId: string;
  patientId: string;
}

export const ProfessionalDashboard: React.FC<Props> = ({ professionalId, patientId }) => {
  const [data, setData] = useState<PatientDataBundle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Automatically grant consent for demo purposes so data can be fetched
    accessManager.grantConsent(patientId, professionalId, [
      'SELF_REPORTED', 
      'SENSOR_INSIGHTS', 
      'RAW_SENSOR_DATA', 
      'SAFETY_EVENTS', 
      'AI_SUMMARIES'
    ]);
  }, [professionalId, patientId]);

  const handleFetchData = () => {
    try {
      setError(null);
      // Simulating a professional selecting which data they want to view
      const requestedTypes: PermissionType[] = [
        'SELF_REPORTED', 
        'SENSOR_INSIGHTS', 
        'RAW_SENSOR_DATA', 
        'SAFETY_EVENTS', 
        'AI_SUMMARIES'
      ];
      
      const bundle = accessManager.accessPatientData(professionalId, patientId, requestedTypes);
      setData(bundle);
    } catch (err: any) {
      setError(err.message);
      setData(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-slate-50 min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl font-light text-slate-800">Professional Dashboard</h1>
        <p className="text-slate-500 mt-2">Viewing Patient: {patientId}</p>
        
        <button 
          onClick={handleFetchData}
          className="mt-4 px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 transition-colors"
        >
          Access Patient Data
        </button>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md mb-6">
          <strong>Access Error:</strong> {error}
        </div>
      )}

      {data && (
        <div className="space-y-6">
          
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
