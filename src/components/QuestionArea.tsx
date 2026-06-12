import React from 'react';
import { Question } from '../types';
import { FormField } from './FormField';

interface QuestionAreaProps {
  question: Question;
  currentIndex: number;
  totalQuestions: number;
  answer: string | string[];
  onAnswerChange: (answer: string | string[]) => void;
}

export const QuestionArea: React.FC<QuestionAreaProps> = ({
  question,
  currentIndex,
  totalQuestions,
  answer,
  onAnswerChange
}) => {
  return (
    <div className="max-w-4xl mx-auto w-full pb-20">
      
      {/* Question Header */}
      <div className="mb-8 border-b border-slate-200 pb-4">
          <div className="flex justify-between items-center mb-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold border border-blue-100 uppercase tracking-wide">
                  Question {currentIndex + 1} of {totalQuestions}
              </span>
              <span className="text-slate-500 text-sm font-medium">
                  {question.points} {question.points === 1 ? 'Point' : 'Points'}
              </span>
          </div>
          <h2 className="text-2xl font-medium text-slate-800 leading-relaxed font-sans">
              {question.text}
          </h2>
      </div>

      {/* Answer Area */}
      <div className="bg-white p-2">
          <FormField 
            question={question} 
            answer={answer} 
            onAnswerChange={onAnswerChange} 
          />
      </div>

    </div>
  );
};
