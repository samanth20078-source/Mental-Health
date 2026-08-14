import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils.ts';
import { db } from '../lib/firebase.ts';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const QUESTIONS = [
  "Over the last two weeks, how often have you felt little interest or pleasure in doing things?",
  "How often have you felt down, depressed, or hopeless?",
  "How often have you had trouble falling or staying asleep, or sleeping too much?",
  "How often have you felt tired or had little energy?",
  "How often have you had poor appetite or overeating?"
];

const OPTIONS = [
  { value: 0, label: "Not at all" },
  { value: 1, label: "Several days" },
  { value: 2, label: "More than half the days" },
  { value: 3, label: "Nearly every day" }
];

export const Assessment = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const isComplete = Object.keys(answers).length === QUESTIONS.length;

  const handleSubmit = async () => {
    if (!isComplete || !user) return;
    setIsSubmitting(true);
    
    // Calculate total score
    const score = Object.values(answers).reduce((a, b) => a + b, 0);
    
    try {
      const assessmentRef = doc(collection(db, 'assessments'));
      await setDoc(assessmentRef, {
        uid: user.uid,
        type: 'General Wellbeing', 
        score, 
        answers: JSON.stringify(answers),
        createdAt: serverTimestamp()
      });
      
      setIsSuccess(true);
      setTimeout(() => navigate('/history'), 1500);
    } catch (error) {
      console.error('Failed to save assessment', error);
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
        <h2 className="text-2xl font-semibold text-slate-900 mb-2">Check-in Saved</h2>
        <p className="text-slate-500 text-center">Your periodic wellbeing assessment has been recorded.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-12 max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-200 bg-slate-100 rounded-full transition-colors text-slate-600"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 tracking-tight">Wellbeing Check-in</h1>
          <p className="text-slate-500 mt-1">Reflect on your experiences over the past two weeks.</p>
        </div>
      </header>

      <div className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-100 space-y-12">
        {QUESTIONS.map((question, qIndex) => (
          <div key={qIndex} className="space-y-4">
            <h3 className="text-base md:text-lg font-medium text-slate-800 leading-relaxed">
              <span className="text-slate-400 font-normal mr-2">{qIndex + 1}.</span>
              {question}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setAnswers(prev => ({ ...prev, [qIndex]: opt.value }))}
                  className={cn(
                    "p-4 text-left rounded-2xl border-2 transition-all duration-300",
                    answers[qIndex] === opt.value
                      ? "border-blue-600 bg-blue-50 text-blue-900"
                      : "border-slate-100 bg-white text-slate-600 hover:border-slate-200 hover:bg-slate-50"
                  )}
                >
                  <span className="block font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="pt-8 border-t border-slate-100">
          <button
            onClick={handleSubmit}
            disabled={!isComplete || isSubmitting}
            className="w-full py-4 px-6 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center justify-center"
          >
            {isSubmitting ? (
              <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : isComplete ? (
              "Save Assessment"
            ) : (
              "Please answer all questions"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
