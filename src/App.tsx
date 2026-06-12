/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Dashboard } from './components/Dashboard';
import { SecurityAlerts } from './components/SecurityAlerts';
import { SubmissionModal } from './components/SubmissionModal';
import { Results } from './components/Results';
import { Header } from './components/Header';
import { Navigator } from './components/Navigator';
import { QuestionArea } from './components/QuestionArea';
import { FooterControls } from './components/FooterControls';
import { Login } from './components/Login';
import { AdminDashboard } from './components/AdminDashboard';

import { useTimer } from './hooks/useTimer';
import { useSecurity } from './hooks/useSecurity';
import { mockQuestions, CANDIDATE_INFO, EXAM_DURATION_SECONDS } from './data';
import { AnswerStatus, CandidateResult, CandidateInfo, Question } from './types';

import { db } from './lib/firebase';
import { collection, query, where, getDocs, limit, orderBy, addDoc } from 'firebase/firestore';

type AppState = 'login' | 'dashboard' | 'exam' | 'results' | 'admin';

export default function App() {
  const [appState, setAppState] = useState<AppState>('login');
  const [candidateInfo, setCandidateInfo] = useState<CandidateInfo>(CANDIDATE_INFO);
  const [examDuration, setExamDuration] = useState(EXAM_DURATION_SECONDS);
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<CandidateResult | null>(null);

  // Exam State
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [examStatus, setExamStatus] = useState<Record<string, AnswerStatus>>({});

  const { securityStats, warnings, requestFullscreen, dismissWarning } = useSecurity();
  
  const handleTimerExpire = useCallback(() => {
     handleFinalSubmit();
  }, [answers, examStatus]); // Requires deps if referenced inside, let's keep it simple

  const { 
      formattedTime, 
      start: startTimer, 
      stop: stopTimer, 
      secondsRemaining,
      isWarning,
      isCritical
  } = useTimer(examDuration, handleTimerExpire);

  // Update logic to handle late-bound callback closure issue
  useEffect(() => {
    if (secondsRemaining <= 0 && appState === 'exam') {
        handleFinalSubmit();
    }
  }, [secondsRemaining, appState]);

  const handleStudentLogin = async (regNo: string) => {
      try {
          // Attempt to fetch candidate info
          const qC = query(collection(db, 'candidates'), where('candidate_id', '==', regNo), limit(1));
          const querySnapshot = await getDocs(qC);
          if (!querySnapshot.empty) {
             const data = querySnapshot.docs[0].data();
             setCandidateInfo({
                 name: `${data.first_name} ${data.last_name}`,
                 id: data.candidate_id,
                 examTitle: CANDIDATE_INFO.examTitle,
                 subject: 'ICT Core Subjects'
             });
          } else {
               setCandidateInfo({ ...CANDIDATE_INFO, id: regNo, subject: 'ICT Core Subjects' });
          }

          // Fetch exam questions
          const questionsSnapshot = await getDocs(collection(db, 'questions'));
          const allQuestions: Question[] = [];
          questionsSnapshot.forEach(doc => {
             const d = doc.data();
             allQuestions.push({
                 id: doc.id,
                 type: d.question_type,
                 text: d.question_text,
                 options: d.options || [],
                 correctAnswer: d.correct_answer,
                 points: d.points || 1,
                 subject: d.subject || 'General'
             });
          });

          // Group by subjects
          const bySubject: Record<string, Question[]> = {
              'EXCEL': [],
              'MICROSOFT WORD': [],
              'POWERPOINT': [],
              'ACCESS': []
          };
          
          allQuestions.forEach(q => {
             if (q.subject && bySubject[q.subject.toUpperCase()]) {
                 bySubject[q.subject.toUpperCase()].push(q);
             } else if (q.subject && q.subject.toUpperCase() === 'WORD') {
                 bySubject['MICROSOFT WORD'].push(q);
             }
          });

          let selectedQuestions: Question[] = [];
          Object.keys(bySubject).forEach(sub => {
              const qs = bySubject[sub];
              // Shuffle
              for (let i = qs.length - 1; i > 0; i--) {
                  const j = Math.floor(Math.random() * (i + 1));
                  [qs[i], qs[j]] = [qs[j], qs[i]];
              }
              // Pick 60
              selectedQuestions = selectedQuestions.concat(qs.slice(0, 60));
          });
          
          // Optionally, shuffle the entire set or just set it
          if (selectedQuestions.length === 0) {
              // Fallback to mock if db is empty
              selectedQuestions = mockQuestions;
          }
          
          setExamQuestions(selectedQuestions);
          
          // Initialize Exam Array
          const initialStatus: Record<string, AnswerStatus> = {};
          selectedQuestions.forEach((q, i) => {
              initialStatus[q.id] = i === 0 ? 'unanswered' : 'not-visited';
          });
          setExamStatus(initialStatus);

          // Attempt to fetch configured exam timing
          const examQ = query(collection(db, 'exams'), orderBy('created_at', 'desc'), limit(1));
          const examSnapshot = await getDocs(examQ);
          if (!examSnapshot.empty) {
              const examData = examSnapshot.docs[0].data();
              if (examData.duration_minutes) {
                  setExamDuration(examData.duration_minutes * 60);
                  setCandidateInfo(prev => ({ ...prev, examTitle: examData.title }));
              }
          }

      } catch (e) {
          console.error("Login Error:", e);
          setCandidateInfo({ ...CANDIDATE_INFO, id: regNo });
          setExamQuestions(mockQuestions);
      }
      setAppState('dashboard');
  };

  const handleAdminLogin = () => {
      setAppState('admin');
  };

  const handleStart = async () => {
      await requestFullscreen();
      setAppState('exam');
      startTimer();
  };

  const handleAnswerChange = (newAnswer: string | string[]) => {
      const q = examQuestions[currentQuestionIndex];
      if (!q) return;
      setAnswers(prev => ({ ...prev, [q.id]: newAnswer }));
      
      const hasAnswer = Array.isArray(newAnswer) ? newAnswer.length > 0 : !!newAnswer;
      if (examStatus[q.id] !== 'marked-for-review') {
          setExamStatus(prev => ({ 
              ...prev, 
              [q.id]: hasAnswer ? 'answered' : 'unanswered' 
          }));
      }
  };

  const handleClear = () => {
    const q = examQuestions[currentQuestionIndex];
    if (!q) return;
    const newAnswers = { ...answers };
    delete newAnswers[q.id];
    setAnswers(newAnswers);
    setExamStatus(prev => ({ ...prev, [q.id]: 'unanswered' }));
  };

  const handleMarkReview = () => {
     const q = examQuestions[currentQuestionIndex];
     if (!q) return;
     const current = examStatus[q.id];
     setExamStatus(prev => ({ 
         ...prev, 
         [q.id]: current === 'marked-for-review' ? (answers[q.id] ? 'answered' : 'unanswered') : 'marked-for-review' 
     }));
  };

  const navigateTo = (index: number) => {
     setCurrentQuestionIndex(index);
     const qId = examQuestions[index].id;
     if (examStatus[qId] === 'not-visited') {
         setExamStatus(prev => ({ ...prev, [qId]: 'unanswered' }));
     }
  };

  const handleNext = () => {
      if (currentQuestionIndex < examQuestions.length - 1) {
          navigateTo(currentQuestionIndex + 1);
      }
  };

  const handlePrevious = () => {
      if (currentQuestionIndex > 0) {
          navigateTo(currentQuestionIndex - 1);
      }
  };

  const handleFinalSubmit = async () => {
      stopTimer();
      setShowSubmitModal(false);
      setIsSubmitting(true);
      
      let score = 0;
      let totalPoints = 0;
      let correctCount = 0;
      let incorrectCount = 0;
      let unansweredCount = 0;
      const mcqBreakdown: Record<string, boolean> = {};

      examQuestions.forEach(q => {
          totalPoints += q.points;
          const ans = answers[q.id];
          
          if (!ans || (Array.isArray(ans) && ans.length === 0)) {
              unansweredCount++;
              mcqBreakdown[q.id] = false;
              return;
          }

          let isCorrect = false;

          if (q.type === 'mcq' || q.type === 'tf' || q.type === 'fill') {
              if (typeof ans === 'string' && typeof q.correctAnswer === 'string') {
                  isCorrect = ans.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim();
              }
          } else if (q.type === 'mrx') {
              if (Array.isArray(ans) && Array.isArray(q.correctAnswer)) {
                  if (ans.length === q.correctAnswer.length) {
                       isCorrect = ans.every(a => (q.correctAnswer as string[]).includes(a));
                  }
              }
          } else if (q.type === 'essay') {
              isCorrect = typeof ans === 'string' && ans.length > 50;
          }

          if (isCorrect) {
              score += q.points;
              correctCount++;
          } else {
              incorrectCount++;
          }
          mcqBreakdown[q.id] = isCorrect;
      });

      const timeSpent = examDuration - secondsRemaining;
      
      const examResult: CandidateResult = {
          score,
          totalPoints,
          percentage: (score / totalPoints) * 100,
          timeSpent,
          correctCount,
          incorrectCount,
          unansweredCount,
          mcqBreakdown
      };

      try {
        await addDoc(collection(db, 'exam_results'), {
          candidate_id: candidateInfo.id,
          candidate_name: candidateInfo.name,
          exam_title: candidateInfo.examTitle,
          subject: candidateInfo.subject,
          score: examResult.score,
          total_points: examResult.totalPoints,
          percentage: examResult.percentage,
          time_spent_seconds: examResult.timeSpent,
          correct_count: examResult.correctCount,
          incorrect_count: examResult.incorrectCount,
          unanswered_count: examResult.unansweredCount,
          mcq_breakdown: examResult.mcqBreakdown,
          created_at: new Date().toISOString()
        });
      } catch (err) {
        console.error('Failed to submit exam data:', err);
      }

      setIsSubmitting(false);
      setResult(examResult);
      setAppState('results');
  };

  if (appState === 'login') {
      return <Login onStudentLogin={handleStudentLogin} onAdminLogin={handleAdminLogin} />;
  }

  if (appState === 'admin') {
      return <AdminDashboard onLogout={() => setAppState('login')} />;
  }

  if (appState === 'dashboard') {
      return (
          <Dashboard 
             candidate={candidateInfo} 
             onStart={handleStart} 
             examDuration={examDuration}
             totalQuestions={examQuestions.length}
          />
      );
  }

  if (appState === 'results' && result) {
      return <Results result={result} candidate={candidateInfo} />;
  }

  const currentQuestion = examQuestions[currentQuestionIndex];
  if (!currentQuestion) return null;

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans">
      <Header 
         candidate={candidateInfo}
         formattedTime={formattedTime}
         isWarning={isWarning}
         isCritical={isCritical}
         isFullscreen={securityStats.isFullscreen}
      />
      
      <div className="flex flex-1 overflow-hidden relative">
          
          {/* Main Question Area */}
          <main className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center justify-start">
              <div className="w-full max-w-4xl mb-6">
                  <div className="flex justify-between items-end mb-2">
                      <span className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
                          Progress
                      </span>
                      <span className="text-sm font-medium text-slate-500">
                          {Object.keys(answers).filter(id => Array.isArray(answers[id]) ? answers[id].length > 0 : !!answers[id]).length} of {examQuestions.length} Answered
                      </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5">
                      <div 
                          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out" 
                          style={{ width: `${(Object.keys(answers).filter(id => Array.isArray(answers[id]) ? answers[id].length > 0 : !!answers[id]).length / Math.max(examQuestions.length, 1)) * 100}%` }}
                      ></div>
                  </div>
              </div>
              <QuestionArea 
                  question={currentQuestion}
                  currentIndex={currentQuestionIndex}
                  totalQuestions={examQuestions.length}
                  answer={answers[currentQuestion.id] || ''}
                  onAnswerChange={handleAnswerChange}
              />
          </main>

          {/* Side Navigator */}
          <Navigator 
              questions={examQuestions}
              currentQuestionIndex={currentQuestionIndex}
              examStatus={examStatus}
              onNavigate={navigateTo}
              isPanelOpen={isPanelOpen}
              togglePanel={() => setIsPanelOpen(!isPanelOpen)}
          />

      </div>

      <FooterControls 
          onPrevious={handlePrevious}
          onNext={handleNext}
          onMarkReview={handleMarkReview}
          onClear={handleClear}
          onSubmit={() => setShowSubmitModal(true)}
          isFirst={currentQuestionIndex === 0}
          isLast={currentQuestionIndex === examQuestions.length - 1}
          currentStatus={examStatus[currentQuestion.id] || 'not-visited'}
      />

      {showSubmitModal && !isSubmitting && (
          <SubmissionModal 
              examStatus={examStatus}
              totalQuestions={examQuestions.length}
              onConfirm={handleFinalSubmit}
              onCancel={() => setShowSubmitModal(false)}
          />
      )}

      {isSubmitting && (
         <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
             <div className="bg-white p-6 rounded-xl shadow-xl flex flex-col items-center">
                 <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                 <p className="text-slate-800 font-medium font-sans">Submitting examination data securely...</p>
             </div>
         </div>
      )}

      <SecurityAlerts warnings={warnings} onDismiss={dismissWarning} />

    </div>
  );
}

