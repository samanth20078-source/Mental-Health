import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils.ts';
import { db } from '../lib/firebase.ts';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const EMOTIONS = [
  'Calm', 'Happy', 'Anxious', 'Overwhelmed', 'Tired', 'Energetic', 
  'Sad', 'Focused', 'Stressed', 'Grateful', 'Frustrated', 'Content'
];

export const MoodTracker = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [score, setScore] = useState<number>(3);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const toggleEmotion = (emotion: string) => {
    setSelectedEmotions(prev => 
      prev.includes(emotion) 
        ? prev.filter(e => e !== emotion)
        : [...prev, emotion]
    );
  };

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);
    
    try {
      const logRef = doc(collection(db, 'mood_logs'));
      await setDoc(logRef, {
        uid: user.uid,
        score,
        emotions: selectedEmotions,
        notes,
        createdAt: serverTimestamp()
      });
      
      setIsSuccess(true);
      setTimeout(() => navigate('/'), 1500);
    } catch (error) {
      console.error('Failed to log mood', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="p-6 md:p-12 max-w-2xl mx-auto min-h-[60vh] flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 size={40} />
        </div>
        <h2 className="text-2xl font-semibold text-slate-900 mb-2">Check-in Complete</h2>
        <p className="text-slate-500 text-center">Thank you for taking a moment to reflect. Your observation has been recorded securely.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-12 max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-200 bg-slate-100 rounded-full transition-colors text-slate-600"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 tracking-tight">How are you feeling?</h1>
          <p className="text-slate-500 mt-1">Take a moment to observe your current state.</p>
        </div>
      </header>

      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 space-y-10">
        
        <section>
          <h3 className="text-sm font-medium text-slate-900 uppercase tracking-wider mb-6 text-center">Energy & Wellbeing Level</h3>
          <div className="flex justify-between items-center gap-2 md:gap-4 max-w-md mx-auto">
            {[1, 2, 3, 4, 5].map((val) => (
              <button
                key={val}
                onClick={() => setScore(val)}
                className={cn(
                  "w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-lg font-medium transition-all duration-300 transform active:scale-95",
                  score === val 
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110" 
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {val}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-4 max-w-md mx-auto px-2">
            <span>Low / Struggling</span>
            <span>Balanced</span>
            <span>High / Thriving</span>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-medium text-slate-900 mb-4">What feelings are present right now?</h3>
          <div className="flex flex-wrap gap-2 md:gap-3">
            {EMOTIONS.map(emotion => (
              <button
                key={emotion}
                onClick={() => toggleEmotion(emotion)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300",
                  selectedEmotions.includes(emotion)
                    ? "bg-blue-100 text-blue-800 border-2 border-blue-200"
                    : "bg-white border-2 border-slate-100 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                {emotion}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-medium text-slate-900 mb-4">Any additional observations? <span className="text-slate-400 font-normal">(Optional)</span></h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Jot down what's on your mind, contexts, or triggers..."
            className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-shadow"
          />
        </section>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full py-4 px-6 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center justify-center"
        >
          {isSubmitting ? (
            <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            "Save Check-in"
          )}
        </button>

      </div>
    </div>
  );
};
