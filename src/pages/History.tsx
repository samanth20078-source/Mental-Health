import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { format, subDays, parseISO } from 'date-fns';
import { BookHeart, ClipboardList } from 'lucide-react';
import { db, perf } from '../lib/firebase.ts';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { trace } from 'firebase/performance';

interface MoodLog {
  id: string;
  score: number;
  emotions: string[];
  notes: string;
  createdAt: number;
}

interface AssessmentLog {
  id: string;
  type: string;
  score: number;
  createdAt: number;
}

export const History = () => {
  const { user } = useAuth();
  const [moods, setMoods] = useState<MoodLog[]>([]);
  const [assessments, setAssessments] = useState<AssessmentLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      const historyTrace = trace(perf, 'fetch_history_data');
      historyTrace.start();
      try {
        const moodQ = query(collection(db, 'mood_logs'), where('uid', '==', user.uid), orderBy('createdAt', 'desc'));
        const assessmentQ = query(collection(db, 'assessments'), where('uid', '==', user.uid), orderBy('createdAt', 'desc'));

        const [moodSnap, assessmentSnap] = await Promise.all([
          getDocs(moodQ),
          getDocs(assessmentQ)
        ]);
        
        setMoods(moodSnap.docs.map(d => {
          const data = d.data();
          return { id: d.id, ...data, createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now() } as MoodLog;
        }));
        setAssessments(assessmentSnap.docs.map(d => {
          const data = d.data();
          return { id: d.id, ...data, createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now() } as AssessmentLog;
        }));
      } catch (error) {
        console.error('Failed to fetch history', error);
      } finally {
        setLoading(false);
        historyTrace.stop();
      }
    };
    fetchData();
  }, [user]);

  if (loading) {
    return <div className="p-8 flex items-center justify-center min-h-[60vh]"><p className="text-slate-500 animate-pulse">Loading historical data...</p></div>;
  }

  // Format data for chart: sort chronologically, map to display strings
  const chartData = [...moods]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map(log => ({
      date: format(new Date(log.createdAt), 'MMM dd'),
      score: log.score,
      fullDate: log.createdAt
    }));

  return (
    <div className="p-6 md:p-12 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 tracking-tight">Insights & History</h1>
        <p className="text-slate-500 mt-2">Review your past observations and identify long-term patterns.</p>
      </header>

      {/* Analytics Chart */}
      <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
        <h2 className="text-lg font-medium text-slate-900 mb-6 flex items-center gap-2">
          <BookHeart size={20} className="text-blue-600" />
          Energy Baseline Trend
        </h2>
        
        {chartData.length >= 2 ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#94a3b8' }} 
                  dy={10}
                />
                <YAxis 
                  domain={[1, 5]} 
                  ticks={[1, 2, 3, 4, 5]} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
                  labelStyle={{ fontWeight: 500, color: '#0f172a', marginBottom: '4px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#2563eb" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorScore)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
            <p className="text-slate-500 text-sm text-center px-4">
              Not enough data to visualize a trend yet.<br/>Log your energy levels over a few days to see your chart.
            </p>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Mood Log List */}
        <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-medium text-slate-900 mb-6 flex items-center gap-2">
            <BookHeart size={20} className="text-slate-400" />
            Recent Observations
          </h2>
          
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {moods.length === 0 ? (
              <p className="text-slate-500 text-sm italic">No observations found.</p>
            ) : (
              moods.map((log) => (
                <div key={log.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-bold text-slate-700 shadow-sm border border-slate-200">
                        {log.score}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{format(new Date(log.createdAt), 'MMM do, yyyy')}</p>
                        <p className="text-xs text-slate-500">{format(new Date(log.createdAt), 'h:mm a')}</p>
                      </div>
                    </div>
                  </div>
                  
                  {log.emotions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {log.emotions.map(e => (
                        <span key={e} className="px-2 py-1 bg-white text-slate-600 text-[11px] font-medium rounded-lg border border-slate-200">
                          {e}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {log.notes && (
                    <p className="text-sm text-slate-600 bg-white p-3 rounded-xl border border-slate-100">
                      "{log.notes}"
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Assessment List */}
        <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-medium text-slate-900 mb-6 flex items-center gap-2">
            <ClipboardList size={20} className="text-emerald-500" />
            Check-in History
          </h2>
          
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {assessments.length === 0 ? (
              <p className="text-slate-500 text-sm italic">No periodic assessments completed yet.</p>
            ) : (
              assessments.map((assessment) => (
                <div key={assessment.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{assessment.type}</p>
                    <p className="text-xs text-slate-500 mt-1">{format(new Date(assessment.createdAt), 'MMMM do, yyyy')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Score</p>
                    <p className="text-xl font-semibold text-slate-900">{assessment.score}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

      </div>
    </div>
  );
};
