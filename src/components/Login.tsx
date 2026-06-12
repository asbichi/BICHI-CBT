import React, { useState } from 'react';
import { User, Shield, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onStudentLogin: (regNo: string) => void;
  onAdminLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onStudentLogin, onAdminLogin }) => {
  const [activeTab, setActiveTab] = useState<'student' | 'admin'>('student');
  const [regNo, setRegNo] = useState('');
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (regNo.trim().length > 0) {
      onStudentLogin(regNo.trim());
    } else {
      setError('Please enter a valid Registration Number');
    }
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminUser === 'Bichi' && adminPass === 'Asbichi12#') {
      onAdminLogin();
      setError('');
    } else {
      setError('Invalid admin credentials');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        <div className="bg-red-600 p-6 text-center">
            <h1 className="text-2xl font-bold text-white tracking-tight">Dialogue Institute of Technology and Management</h1>
            <p className="text-red-100 mt-2 text-sm">CBT Platform Portal</p>
        </div>
        
        <div className="flex border-b border-slate-200">
            <button 
                onClick={() => { setActiveTab('student'); setError(''); }}
                className={`flex-1 py-4 text-sm font-semibold transition-colors flex justify-center items-center ${activeTab === 'student' ? 'text-red-600 border-b-2 border-red-600 bg-red-50/50' : 'text-slate-500 hover:text-slate-700 bg-white'}`}
            >
                <User className="w-4 h-4 mr-2" /> Student Login
            </button>
            <button 
                onClick={() => { setActiveTab('admin'); setError(''); }}
                className={`flex-1 py-4 text-sm font-semibold transition-colors flex justify-center items-center ${activeTab === 'admin' ? 'text-red-600 border-b-2 border-red-600 bg-red-50/50' : 'text-slate-500 hover:text-slate-700 bg-white'}`}
            >
                <Shield className="w-4 h-4 mr-2" /> Admin Login
            </button>
        </div>

        <div className="p-8">
            {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm text-center">
                    {error}
                </div>
            )}

            {activeTab === 'student' ? (
                <form onSubmit={handleStudentSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Registration Number</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-slate-400" />
                            </div>
                            <input 
                                type="text" 
                                value={regNo}
                                onChange={(e) => setRegNo(e.target.value)}
                                className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:ring-red-500 focus:border-red-500 sm:text-sm text-slate-800"
                                placeholder="Enter Reg Number (e.g. DIT-001)"
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-2">Your registration number serves as your secure login ticket.</p>
                    </div>
                    <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center">
                        Access Examination <ArrowRight className="w-4 h-4 ml-2" />
                    </button>
                </form>
            ) : (
                <form onSubmit={handleAdminSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                        <input 
                            type="text" 
                            value={adminUser}
                            onChange={(e) => setAdminUser(e.target.value)}
                            className="block w-full px-3 py-3 border border-slate-300 rounded-lg focus:ring-red-500 focus:border-red-500 sm:text-sm text-slate-800"
                            placeholder="Admin Username"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                        <div className="relative">
                            <input 
                                type={showPassword ? "text" : "password"} 
                                value={adminPass}
                                onChange={(e) => setAdminPass(e.target.value)}
                                className="block w-full pl-3 pr-10 py-3 border border-slate-300 rounded-lg focus:ring-red-500 focus:border-red-500 sm:text-sm text-slate-800"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                            >
                                {showPassword ? (
                                    <EyeOff className="h-5 w-5" aria-hidden="true" />
                                ) : (
                                    <Eye className="h-5 w-5" aria-hidden="true" />
                                )}
                            </button>
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center">
                        Login as Admin <Shield className="w-4 h-4 ml-2 text-slate-400" />
                    </button>
                </form>
            )}
        </div>
      </div>
    </div>
  );
};
