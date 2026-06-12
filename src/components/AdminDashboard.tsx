import React, { useState, useEffect } from 'react';
import { Users, BookOpen, FileQuestion, Clock, CheckCircle, UploadCloud, FileText, Download, Database } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { seedQuestionsDB } from '../lib/seedQuestions';

interface AdminDashboardProps {
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'students' | 'subjects' | 'questions' | 'exam' | 'results'>('students');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [results, setResults] = useState<any[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  // Student Form
  const [student, setStudent] = useState({ id: '', firstName: '', lastName: '' });
  
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'candidates'), {
        candidate_id: student.id,
        first_name: student.firstName,
        last_name: student.lastName,
        created_at: new Date().toISOString()
      });
      showMessage('success', 'Student added successfully to the database.');
      setStudent({ id: '', firstName: '', lastName: '' });
    } catch (err: any) {
      showMessage('error', err.message);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split('\n').filter(line => line.trim() !== '');
      if (lines.length === 0) return;

      let successCount = 0;
      let errorCount = 0;

      const startIndex = lines[0].toLowerCase().includes('id') || lines[0].toLowerCase().includes('reg') ? 1 : 0;

      for (let i = startIndex; i < lines.length; i++) {
          const parts = lines[i].split(',').map(s => s.trim());
          if (parts.length >= 3) {
             const [id, firstName, lastName] = parts;
             if (id && firstName && lastName) {
                try {
                   await addDoc(collection(db, 'candidates'), {
                       candidate_id: id,
                       first_name: firstName,
                       last_name: lastName,
                       created_at: new Date().toISOString()
                   });
                   successCount++;
                } catch (err) {
                   console.error("Error adding student:", err);
                   errorCount++;
                }
             } else {
                 errorCount++;
             }
          }
      }

      if (successCount > 0) {
          showMessage('success', `Successfully added ${successCount} students via bulk upload.${errorCount > 0 ? ` Failed on ${errorCount} rows.` : ''}`);
      } else {
          showMessage('error', 'Failed to add any students. Please check the CSV format (ID, First Name, Last Name).');
      }
      e.target.value = '';
    };

    reader.readAsText(file);
  };

  // Subject Form
  const [subjectTitle, setSubjectTitle] = useState('');
  
  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'subjects'), {
          name: subjectTitle,
          created_at: new Date().toISOString()
      });
      showMessage('success', 'Subject added successfully.');
      setSubjectTitle('');
    } catch (err: any) {
      showMessage('error', err.message);
    }
  };

  // Timing/Exam settings Map to 'exams' table
  const [examConfig, setExamConfig] = useState({ title: '', duration: 60, marks: 100 });
  const handleAddExam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'exams'), {
        title: examConfig.title,
        duration_minutes: examConfig.duration,
        total_marks: examConfig.marks,
        created_at: new Date().toISOString()
      });
      showMessage('success', 'Exam configuration saved successfully.');
      setExamConfig({ title: '', duration: 60, marks: 100 });
    } catch (err: any) {
      showMessage('error', err.message);
    }
  };

  // Question Form
  const [question, setQuestion] = useState({ type: 'mcq', text: '', options: '', answer: '', points: 1 });
  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const opts = question.options ? question.options.split(',').map(s => s.trim()) : null;
      await addDoc(collection(db, 'questions'), {
        question_type: question.type,
        question_text: question.text,
        options: opts,
        correct_answer: question.answer,
        points: question.points,
        subject: 'General',
        created_at: new Date().toISOString()
      });
      showMessage('success', 'Question banked successfully.');
      setQuestion({ type: 'mcq', text: '', options: '', answer: '', points: 1 });
    } catch (err: any) {
      showMessage('error', err.message);
    }
  };

  const [isSeeding, setIsSeeding] = useState(false);
  const handleSeedQuestions = async () => {
     setIsSeeding(true);
     const res = await seedQuestionsDB();
     setIsSeeding(false);
     if (res.success) {
        showMessage('success', res.message);
     } else {
        showMessage('error', res.message);
     }
  };

  useEffect(() => {
    if (activeTab === 'results') {
      const fetchResults = async () => {
        setLoadingResults(true);
        try {
          const resultsQuery = query(collection(db, 'exam_results'), orderBy('created_at', 'desc'));
          const snapshot = await getDocs(resultsQuery);
          const resultsData: any[] = [];
          snapshot.forEach(doc => {
            resultsData.push({ id: doc.id, ...doc.data() });
          });
          setResults(resultsData);
        } catch (error) {
          console.error("Error fetching results:", error);
          showMessage('error', 'Failed to load exam results.');
        } finally {
          setLoadingResults(false);
        }
      };
      fetchResults();
    }
  }, [activeTab]);

  const downloadCSV = () => {
    if (results.length === 0) return;
    const header = "REG NO,NAME,SCORE\n";
    const rows = results.map(row => `${row.candidate_id},${row.candidate_name},${row.score}`);
    const csvContent = "data:text/csv;charset=utf-8," + header + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "exam_results.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
         <div className="p-6">
            <h2 className="text-xl font-bold text-red-500">Admin Portal</h2>
            <p className="text-xs text-slate-400 mt-1">DITM Control Center</p>
         </div>
         <nav className="flex-1 px-4 space-y-2">
            <button onClick={() => setActiveTab('students')} className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors justify-start ${activeTab === 'students' ? 'bg-red-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
                <Users className="w-5 h-5 mr-3 flex-shrink-0" /> Manage Students
            </button>
            <button onClick={() => setActiveTab('subjects')} className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors justify-start ${activeTab === 'subjects' ? 'bg-red-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
                <BookOpen className="w-5 h-5 mr-3 flex-shrink-0" /> Manage Subjects
            </button>
            <button onClick={() => setActiveTab('exam')} className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors justify-start ${activeTab === 'exam' ? 'bg-red-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
                <Clock className="w-5 h-5 mr-3 flex-shrink-0" /> Exam Configuration
            </button>
            <button onClick={() => setActiveTab('questions')} className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors justify-start ${activeTab === 'questions' ? 'bg-red-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
                <FileQuestion className="w-5 h-5 mr-3 flex-shrink-0" /> Question Bank
            </button>
            <button onClick={() => setActiveTab('results')} className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors justify-start ${activeTab === 'results' ? 'bg-red-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
                <FileText className="w-5 h-5 mr-3 flex-shrink-0" /> Exam Results
            </button>
         </nav>
         <div className="p-4">
             <button onClick={onLogout} className="w-full py-2 text-sm text-slate-400 hover:text-white border border-slate-700 rounded-lg transition-colors">Logout</button>
         </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-slate-800 mb-8 capitalize">{activeTab.replace('_', ' ')} Settings</h1>
            
            {message.text && (
                <div className={`p-4 rounded-lg mb-6 flex items-center shadow-sm ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                    {message.type === 'success' && <CheckCircle className="w-5 h-5 mr-2 text-green-600" />}
                    {message.text}
                </div>
            )}

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                {activeTab === 'students' && (
                    <div className="space-y-8">
                        <form onSubmit={handleAddStudent} className="space-y-5">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 mb-1">Add Allowed Candidate</h3>
                                <p className="text-sm text-slate-500 mb-6">Manually provision student access for the CBT system (supports up to 1500 concurrent connections).</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Registration Number</label>
                                    <input required type="text" value={student.id} onChange={(e) => setStudent({...student, id: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500" placeholder="e.g. DIT-001" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                                    <input required type="text" value={student.firstName} onChange={(e) => setStudent({...student, firstName: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500" placeholder="John" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                                    <input required type="text" value={student.lastName} onChange={(e) => setStudent({...student, lastName: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500" placeholder="Doe" />
                                </div>
                            </div>
                            <div className="pt-4">
                                <button type="submit" className="bg-slate-900 text-white px-8 py-3 rounded-lg font-medium hover:bg-slate-800 transition-colors">Provision Student</button>
                            </div>
                        </form>

                        <div className="border-t border-slate-200 pt-8 mt-8">
                            <h3 className="text-lg font-bold text-slate-800 mb-1">Bulk Upload Candidates</h3>
                            <p className="text-sm text-slate-500 mb-4">Upload a CSV file to add multiple students at once. Format should be: <code className="bg-slate-100 px-1 py-0.5 rounded text-xs text-slate-700">Reg No, First Name, Last Name</code>.</p>
                            
                            <label className="flex items-center justify-center w-full max-w-lg h-32 px-4 transition bg-white border-2 border-slate-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-red-400 hover:bg-slate-50 focus:outline-none">
                                <span className="flex flex-col items-center space-y-2">
                                    <UploadCloud className="w-6 h-6 text-slate-400 group-hover:text-red-500" />
                                    <span className="font-medium text-slate-600 text-sm">
                                        Drop your CSV file here, or click to browse
                                    </span>
                                </span>
                                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                            </label>
                        </div>
                    </div>
                )}

                {activeTab === 'subjects' && (
                    <form onSubmit={handleAddSubject} className="space-y-5">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-1">Add Examination Subject</h3>
                            <p className="text-sm text-slate-500 mb-6">Define a core subject identifier.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Subject Name</label>
                            <input required type="text" value={subjectTitle} onChange={(e) => setSubjectTitle(e.target.value)} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500" placeholder="e.g. Mathematics 101" />
                        </div>
                        <div className="pt-4">
                             <button type="submit" className="bg-slate-900 text-white px-8 py-3 rounded-lg font-medium hover:bg-slate-800 transition-colors">Save Subject</button>
                        </div>
                    </form>
                )}

                {activeTab === 'exam' && (
                    <form onSubmit={handleAddExam} className="space-y-5">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-1">Configure Global Exam & Timing</h3>
                            <p className="text-sm text-slate-500 mb-6">Adjust duration and global scoring parameters.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Exam Title</label>
                            <input required type="text" value={examConfig.title} onChange={(e) => setExamConfig({...examConfig, title: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500" placeholder="e.g. End of Semester Examinations" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Global Duration (Minutes)</label>
                                <input required type="number" min="1" value={examConfig.duration} onChange={(e) => setExamConfig({...examConfig, duration: parseInt(e.target.value)})} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Total Expected Marks</label>
                                <input required type="number" min="1" value={examConfig.marks} onChange={(e) => setExamConfig({...examConfig, marks: parseInt(e.target.value)})} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500" />
                            </div>
                        </div>
                        <div className="pt-4">
                            <button type="submit" className="bg-slate-900 text-white px-8 py-3 rounded-lg font-medium hover:bg-slate-800 transition-colors">Apply Configuration</button>
                        </div>
                    </form>
                )}

                {activeTab === 'questions' && (
                     <div className="space-y-8">
                         <form onSubmit={handleAddQuestion} className="space-y-5">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 mb-1">Question Bank Master</h3>
                                <p className="text-sm text-slate-500 mb-6">Insert new standardized questions.</p>
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Points / Weight</label>
                                    <input required type="number" min="1" value={question.points} onChange={(e) => setQuestion({...question, points: parseInt(e.target.value)})} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Question Format</label>
                                    <select required value={question.type} onChange={(e) => setQuestion({...question, type: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white">
                                        <option value="mcq">Multiple Choice Question (MCQ)</option>
                                        <option value="tf">True / False</option>
                                        <option value="fill">Fill in the Blank</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Question Query</label>
                                <textarea required rows={3} value={question.text} onChange={(e) => setQuestion({...question, text: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-y" placeholder="Describe the question in detail..." />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Options (Comma separated) - Required for MCQ</label>
                                <input type="text" value={question.options} onChange={(e) => setQuestion({...question, options: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500" placeholder="Option A, Option B, Option C, Option D" />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Correct Answer (Exact string)</label>
                                <input required type="text" value={question.answer} onChange={(e) => setQuestion({...question, answer: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500" placeholder="Enter the exact correct response" />
                            </div>
                             <div className="pt-4">
                                <button type="submit" className="bg-slate-900 text-white px-8 py-3 rounded-lg font-medium hover:bg-slate-800 transition-colors">Publish to Bank</button>
                            </div>
                         </form>
                         <div className="border-t border-slate-200 pt-8 mt-8">
                             <h3 className="text-lg font-bold text-slate-800 mb-1">Auto-Generate Course Questions</h3>
                             <p className="text-sm text-slate-500 mb-4">Click below to auto-generate 150 standard questions for EXCEL, MICROSOFT WORD, POWERPOINT, and ACCESS (600 total) into the database.</p>
                             <button
                                 onClick={handleSeedQuestions}
                                 disabled={isSeeding}
                                 className="flex items-center px-6 py-3 bg-red-50 text-red-700 font-medium rounded-lg border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50"
                             >
                                 <Database className="w-5 h-5 mr-2" />
                                 {isSeeding ? 'Seeding Database...' : 'Seed 600 Standard Questions'}
                             </button>
                         </div>
                     </div>
                )}

                {activeTab === 'results' && (
                    <div className="space-y-5">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 mb-1">Candidate Exam Results</h3>
                                <p className="text-sm text-slate-500">View and download completed exam results.</p>
                            </div>
                            <button onClick={downloadCSV} className="bg-slate-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-slate-800 transition-colors flex items-center">
                                <Download className="w-4 h-4 mr-2" /> Download CSV
                            </button>
                        </div>
                        {loadingResults ? (
                            <div className="py-8 text-center text-slate-500">Loading results...</div>
                        ) : results.length === 0 ? (
                            <div className="py-8 text-center text-slate-500">No results found.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200">
                                            <th className="py-3 px-4 text-sm font-semibold text-slate-600">Reg No</th>
                                            <th className="py-3 px-4 text-sm font-semibold text-slate-600">Name</th>
                                            <th className="py-3 px-4 text-sm font-semibold text-slate-600">Score</th>
                                            <th className="py-3 px-4 text-sm font-semibold text-slate-600">Percentage</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {results.map((result) => (
                                            <tr key={result.id} className="border-b border-slate-100 hover:bg-slate-50">
                                                <td className="py-3 px-4 text-sm text-slate-800">{result.candidate_id}</td>
                                                <td className="py-3 px-4 text-sm text-slate-800">{result.candidate_name}</td>
                                                <td className="py-3 px-4 text-sm font-medium text-slate-800">{result.score} / {result.total_points}</td>
                                                <td className="py-3 px-4 text-sm text-slate-600">{result.percentage}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
