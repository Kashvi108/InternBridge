import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Register = () => {
  const location = useLocation();
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    instituteName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student'
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  // Read role from URL parameter on component mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const roleParam = params.get('role');
    if (roleParam && ['student', 'company', 'institute', 'mentor'].includes(roleParam)) {
      setFormData(prev => ({
        ...prev,
        role: roleParam,
        name: '',
        companyName: '',
        instituteName: ''
      }));
    }
  }, [location.search]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRoleChange = (role) => {
    setFormData({
      ...formData,
      role: role,
      name: '',
      companyName: '',
      instituteName: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.role === 'company' && !formData.companyName) {
      toast.error('Please enter company name');
      return;
    }
    if (formData.role === 'institute' && !formData.instituteName) {
      toast.error('Please enter institute name');
      return;
    }
    if ((formData.role === 'student' || formData.role === 'mentor') && !formData.name) {
      toast.error('Please enter your name');
      return;
    }
    
    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    
    try {
      let registerData = {
        email: formData.email,
        password: formData.password,
        role: formData.role
      };
      
      if (formData.role === 'student') {
        registerData.name = formData.name;
        if (formData.instituteName) {
          registerData.instituteName = formData.instituteName;
        }
      } else if (formData.role === 'company') {
        registerData.name = formData.companyName;
      } else if (formData.role === 'institute') {
        registerData.name = formData.instituteName;
      } else if (formData.role === 'mentor') {
        registerData.name = formData.name;
      }
      
      const user = await register(registerData);
      
      switch(user.role) {
        case 'student': navigate('/student-dashboard'); break;
        case 'company': navigate('/company-dashboard'); break;
        case 'institute': navigate('/institute-dashboard'); break;
        case 'mentor': navigate('/mentor-dashboard'); break;
        default: navigate('/');
      }
    } catch (error) {
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNamePlaceholder = () => {
    switch(formData.role) {
      case 'student': return 'Enter your full name';
      case 'company': return 'Enter your company name';
      case 'institute': return 'Enter your institute name';
      case 'mentor': return 'Enter your full name';
      default: return 'Enter name';
    }
  };

  const getNameLabel = () => {
    switch(formData.role) {
      case 'student': return 'Full Name';
      case 'company': return 'Company Name';
      case 'institute': return 'Institute Name';
      case 'mentor': return 'Full Name';
      default: return 'Name';
    }
  };

  const getNameValue = () => {
    switch(formData.role) {
      case 'student': return formData.name;
      case 'company': return formData.companyName;
      case 'institute': return formData.instituteName;
      case 'mentor': return formData.name;
      default: return formData.name;
    }
  };

  const getNameFieldName = () => {
    switch(formData.role) {
      case 'student': return 'name';
      case 'company': return 'companyName';
      case 'institute': return 'instituteName';
      case 'mentor': return 'name';
      default: return 'name';
    }
  };

  const roleIcons = {
    student: '👨‍🎓',
    company: '🏢',
    institute: '🏛️',
    mentor: '👨‍🏫'
  };

  const roleColors = {
    student: 'from-blue-500 to-cyan-500',
    company: 'from-emerald-500 to-teal-500',
    institute: 'from-purple-500 to-pink-500',
    mentor: 'from-indigo-500 to-blue-500'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-2000"></div>
      </div>

      <div className="relative w-full max-w-md">
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur-xl opacity-30"></div>
        
        <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
          <div className={`h-1 bg-gradient-to-r ${roleColors[formData.role]}`}></div>
          
          <div className="p-8">
            <div className="text-center mb-6">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur-lg opacity-50"></div>
                <div className="relative w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                  <span className="text-3xl">🚀</span>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mt-4">Create Account</h2>
              <p className="text-white/50 text-sm mt-1">Join InternPlace today</p>
            </div>

            {/* Role Selection */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              {['student', 'company', 'institute', 'mentor'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleRoleChange(r)}
                  className={`relative group py-2 rounded-xl font-medium text-sm transition-all duration-300 ${
                    formData.role === r
                      ? `bg-gradient-to-r ${roleColors[r]} text-white shadow-lg scale-105`
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  <span className="text-lg mr-1">{roleIcons[r]}</span>
                  <span className="hidden sm:inline capitalize">{r}</span>
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm font-medium mb-2">{getNameLabel()}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                    {formData.role === 'student' && '👤'}
                    {formData.role === 'company' && '🏢'}
                    {formData.role === 'institute' && '🏛️'}
                    {formData.role === 'mentor' && '👨‍🏫'}
                  </span>
                  <input
                    type="text"
                    name={getNameFieldName()}
                    value={getNameValue()}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    placeholder={getNamePlaceholder()}
                  />
                </div>
              </div>

              {formData.role === 'student' && (
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-2">Institute Name</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">🎓</span>
                    <input
                      type="text"
                      name="instituteName"
                      value={formData.instituteName}
                      onChange={handleChange}
                      placeholder="Your college/university name"
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    />
                  </div>
                  <p className="text-white/30 text-xs mt-1">Your institute will be able to track your progress</p>
                </div>
              )}

              <div>
                <label className="block text-white/70 text-sm font-medium mb-2">Email Address</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">📧</span>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white/70 text-sm font-medium mb-2">Password</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">🔒</span>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    placeholder="Create a password (min 6 characters)"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white/70 text-sm font-medium mb-2">Confirm Password</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">✓</span>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    placeholder="Confirm your password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 bg-gradient-to-r ${roleColors[formData.role]} rounded-xl text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group`}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create Account
                      <span className="text-lg">→</span>
                    </>
                  )}
                </span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-white/50 text-sm">
                Already have an account?{' '}
                <Link to="/login" className="text-purple-400 font-medium hover:text-purple-300 transition-colors hover:underline">
                  Sign In
                </Link>
              </p>
            </div>

            <div className="mt-6 pt-4 text-center">
              <p className="text-white/30 text-xs">
                Join thousands of students and companies
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;