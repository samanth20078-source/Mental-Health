import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Link } from 'react-router-dom';
import { PlusCircle, FileText, ArrowRight, Activity, CalendarDays } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { db } from '../lib/firebase.ts';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

interface MoodLog {
  id: string;
  score: number;
  emotions: string[];
  notes: string;
  createdAt: number;
}

export const Dashboard = () => {
  const { user } = useAuth();
  const [recentMoods, setRecentMoods] = useState<MoodLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      try {
        const q = query(
          collection(db, 'mood_logs'),
          where('uid', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(3)
        );
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now()
          } as MoodLog;
        });
        setRecentMoods(data);
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [user]);

  if (loading) {
    return <div className="p-8 flex items-center justify-center min-h-screen bg-slate-50"><p className="text-slate-500 animate-pulse">Loading overview...</p></div>;
  }

  return (
    <div className="p-6 md:p-12 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 tracking-tight">
          Good to see you, {user?.displayName?.split(' ')[0] || 'User'}.
        </h1>
        <p className="text-slate-500 mt-2">Here is a summary of your recent observations.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Quick Actions */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
              <Activity size={24} />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Daily Check-in</h2>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
              Take a moment to observe your current state. Tracking regularly helps identify patterns and triggers over time.
            </p>
          </div>
          <Link 
            to="/log-mood"
            className="flex items-center justify-between bg-slate-900 hover:bg-slate-800 text-white px-6 py-4 rounded-2xl transition-colors font-medium group"
          >
            <span className="flex items-center gap-2"><PlusCircle size={20} /> Log Observation</span>
            <ArrowRight size={20} className="opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </Link>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
              <FileText size={24} />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Periodic Assessment</h2>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
              Complete a structured wellbeing questionnaire to establish a broader baseline of your mental health trends over the last two weeks.
            </p>
          </div>
          <Link 
            to="/assessment"
            className="flex items-center justify-between bg-emerald-50 hover:bg-emerald-100 text-emerald-900 px-6 py-4 rounded-2xl transition-colors font-medium group border border-emerald-100"
          >
            <span>Start Check-in</span>
            <ArrowRight size={20} className="opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </Link>
        </div>

      </div>

      {/* Recent History Preview */}
      <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg font-medium text-slate-900 flex items-center gap-2">
            <CalendarDays size={20} className="text-slate-400" />
            Recent Observations
          </h2>
          <Link to="/history" className="text-sm font-medium text-blue-600 hover:text-blue-700">View all</Link>
        </div>

        {recentMoods.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-slate-100 bg-slate-50/50">
            <p className="text-slate-500 text-sm">No observations recorded yet. Start by logging your first check-in above.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentMoods.map((log) => (
              <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-lg font-bold text-slate-700 border border-slate-200 shadow-sm">
                    {log.score}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {format(new Date(log.createdAt), 'EEEE, MMM do')}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                
                {log.emotions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 sm:justify-end">
                    {log.emotions.slice(0, 3).map(e => (
                      <span key={e} className="px-2.5 py-1 bg-white text-slate-600 text-[11px] font-medium rounded-lg border border-slate-200">
                        {e}
                      </span>
                    ))}
                    {log.emotions.length > 3 && (
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[11px] font-medium rounded-lg">
                        +{log.emotions.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
};
