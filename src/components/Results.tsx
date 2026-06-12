import React from 'react';
import { CandidateResult, CandidateInfo } from '../types';
import { CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface ResultsProps {
  result: CandidateResult;
  candidate: CandidateInfo;
}

export const Results: React.FC<ResultsProps> = ({ result, candidate }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200"
      >
        {/* Header Ribbon */}
        <div className="p-6 text-center bg-blue-600 text-white relative overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl"></div>
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/10 rounded-full translate-x-1/2 translate-y-1/2 blur-2xl"></div>
            
            <CheckCircle className="w-16 h-16 mx-auto mb-3 text-white/90" />
            <h1 className="text-3xl font-bold tracking-tight mb-1">
                Examination Completed
            </h1>
           <p className="text-white/80 font-medium">Your responses have been successfully recorded.</p>
        </div>

        <div className="p-8">
            <div className="text-center mb-8">
                <h2 className="text-xl font-bold text-slate-800">{candidate.name}</h2>
                <p className="text-slate-500 font-mono text-sm">{candidate.id}</p>
                <div className="mt-2 inline-block px-3 py-1 bg-blue-100 rounded-full text-sm text-blue-600 font-medium">
                    {candidate.examTitle}
                </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 text-center">
                <p className="text-slate-700">Thank you for completing the examination. The results have been submitted to the administrator. You may now log out or close this window.</p>
            </div>
            
            <div className="mt-8 text-center">
                <button 
                  onClick={() => window.location.reload()}
                  className="bg-slate-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-slate-800 transition-colors"
                >
                    Return to Login
                </button>
            </div>
        </div>
      </motion.div>
    </div>
  );
};
