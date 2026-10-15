import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [internships, setInternships] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [companyLogos, setCompanyLogos] = useState({});
  const [studentSkills, setStudentSkills] = useState([]);
  const [totalInternships, setTotalInternships] = useState(0);
  const [matchedCount, setMatchedCount] = useState(0);
  const [applying, setApplying] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);


const [aiRecommendations, setAiRecommendations] = useState(null);
const [showAIRecommendations, setShowAIRecommendations] = useState(false);
const [loadingAI, setLoadingAI] = useState(false);


  const [formData, setFormData] = useState({
    skills: '',
    education: '',
    branch: '',
    year: '',
    phone: '',
    bio: ''
  });

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchProfile();
    fetchInternships();
    fetchMyApplications();
    fetchTasks();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success('Logged out successfully');
  };

  const goToHome = () => {
    navigate('/');
  };

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${API_URL}/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setProfile(data.profile);
      if (data.profile) {
        setFormData({
          skills: data.profile.skills?.join(', ') || '',
          education: data.profile.education || '',
          branch: data.profile.branch || '',
          year: data.profile.year || '',
          phone: data.profile.phone || '',
          bio: data.profile.bio || ''
        });
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchInternships = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/internships/matched`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setInternships(data.internships || []);
      setStudentSkills(data.studentSkills || []);
      setTotalInternships(data.totalInternships || 0);
      setMatchedCount(data.matchedCount || 0);
      (data.internships || []).forEach(internship => {
        if (internship.companyName) {
          fetchCompanyLogo(internship.companyName);
        }
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyLogo = async (companyName) => {
    try {
      const response = await fetch(`${API_URL}/company-logo/${companyName}`);
      const data = await response.json();
      setCompanyLogos(prev => ({ ...prev, [companyName]: data.logo }));
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchMyApplications = async () => {
    try {
      const response = await fetch(`${API_URL}/student/applications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setMyApplications(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await fetch(`${API_URL}/student/tasks`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const submitTask = async (taskId, submissionUrl) => {
    try {
      const response = await fetch(`${API_URL}/student/tasks/${taskId}/submit`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ submissionUrl })
      });
      if (response.ok) {
        toast.success('Task submitted!');
        fetchTasks();
      }
    } catch (error) {
      toast.error('Error submitting task');
    }
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    try {
      const skillsArray = formData.skills.split(',').map(s => s.trim()).filter(s => s);
      const response = await fetch(`${API_URL}/student/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          skills: skillsArray,
          education: formData.education,
          branch: formData.branch,
          year: parseInt(formData.year) || null,
          phone: formData.phone,
          bio: formData.bio
        })
      });
      if (response.ok) {
        toast.success('Profile updated!');
        setShowProfileForm(false);
        fetchProfile();
        fetchInternships();
      }
    } catch (error) {
      toast.error('Update failed');
    }
  };

  const applyForInternship = async (internshipId) => {
    setApplying(true);
    toast.loading('Applying...', { id: 'apply' });
    try {
      const response = await fetch(`${API_URL}/internships/${internshipId}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(`Applied! ${data.matchPercentage || 0}% match`, { id: 'apply' });
        fetchMyApplications();
      } else {
        toast.error(data.message || 'Failed', { id: 'apply' });
      }
    } catch (error) {
      toast.error('Network error', { id: 'apply' });
    } finally {
      setApplying(false);
    }
  };

  const stats = [
    { value: matchedCount, label: "Personalized Matches", icon: "🎯", color: "from-emerald-500 to-teal-500" },
    { value: internships.length, label: "Available", icon: "💼", color: "from-blue-500 to-cyan-500" },
    { value: myApplications.length, label: "Applications", icon: "📝", color: "from-violet-500 to-purple-500" },
    { value: tasks.length, label: "Tasks", icon: "📋", color: "from-amber-500 to-orange-500" }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl">🚀</span>
          </div>
        </div>
      </div>
    );
  }







const getAIRecommendations = async () => {
  try {
    setLoadingAI(true);
    
    // Check token
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please login first');
      setLoadingAI(false);
      return;
    }
    
    console.log('Fetching AI recommendations...');
    
    const response = await fetch(`${API_URL}/ai/company-recommendations`, {
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      setAiRecommendations(data);
      setShowAIRecommendations(true);
      
      if (data.recommendations?.length === 0) {
        toast.info('No companies match your skills. Add more skills to your profile!');
      } else {
        toast.success(`Found ${data.recommendations.length} companies matching your skills!`);
      }
    } else {
      console.error('API Error:', data);
      toast.error(data.message || 'Failed to get recommendations');
    }
  } catch (error) {
    console.error('Network Error:', error);
    toast.error('Network error. Please check if backend is running.');
  } finally {
    setLoadingAI(false);
  }
};












  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
      </div>

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-72 bg-white/10 backdrop-blur-xl border-r border-white/20 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <span className="text-white text-xl">👨‍🎓</span>
            </div>
            <div>
              <h2 className="text-white font-bold">Student Portal</h2>
              <p className="text-white/60 text-xs">{user?.name?.split(' ')[0]}</p>
            </div>
          </div>
          
          <nav className="space-y-2">
            {[
              { id: 'overview', label: 'Dashboard', icon: '📊' },
              { id: 'profile', label: 'My Profile', icon: '👤' },
              { id: 'internships', label: 'Opportunities', icon: '💼' },
              { id: 'applications', label: 'Applications', icon: '📝' },
              { id: 'tasks', label: 'My Tasks', icon: '✅' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                  activeTab === item.id
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
          
          <div className="absolute bottom-6 left-0 right-0 px-6">
  <button 
    onClick={handleLogout}
    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/20 transition-all"
  >
    <span className="text-xl">🚪</span>
    <span className="font-medium">Logout</span>
  </button>
</div>
        </div>
      </aside>

      {/* Mobile Menu Button */}
      <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white/10 backdrop-blur rounded-lg">
        <span className="text-white text-2xl">☰</span>
      </button>

      {/* Main Content */}
      <main className="lg:ml-72 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Welcome, {user?.name} 👋</h1>
            <p className="text-white/60">Track your internship journey and career growth</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, idx) => (
              <div key={idx} className="group relative overflow-hidden bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10 hover:border-purple-500/50 transition-all duration-300">
                <div className={`absolute inset-0 bg-gradient-to-r ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity`}></div>
                <div className="relative">
                  <div className="text-3xl mb-2">{stat.icon}</div>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-white/50 text-sm">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Content Area */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div>
                <div className="bg-gradient-to-r from-purple-600/30 to-pink-600/30 rounded-xl p-6 mb-6">
                  <h2 className="text-xl font-bold text-white mb-2">Your Journey So Far</h2>
                  <p className="text-white/70">You've explored {internships.length} internships and applied to {myApplications.length} positions. Keep going!</p>
                </div>




{/* AI Recommendations Button */}
    <div className="mb-6">
      <button 
        onClick={getAIRecommendations}
        className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
      >
        <span className="text-xl">🤖</span>
        AI Company Recommendations
      </button>
      <p className="text-white/40 text-xs mt-2">
        Get personalized company recommendations based on your skills
      </p>
    </div>
    {/* 👆 YAHAN TAK AI BUTTON 👆 */}










                <div className="grid md:grid-cols-2 gap-6">
                
                  <div className="bg-white/5 rounded-xl p-5">
                    <h3 className="text-white font-semibold mb-3">📋 Recent Activity</h3>
                    <div className="space-y-3">
                      {myApplications.slice(0, 3).map((app, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                          <div>
                            <p className="text-white font-medium">{app.internshipTitle}</p>
                            <p className="text-white/50 text-sm">{app.companyName}</p>
                          </div>
                          <span className="text-yellow-400 text-sm capitalize">{app.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-3xl font-bold text-white">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{user?.name}</h2>
                    <p className="text-white/60">{user?.email}</p>
                    <p className="text-white/40 text-sm">{profile?.branch} • Year {profile?.year}</p>
                  </div>
                </div>
                
                {showProfileForm ? (
                  <form onSubmit={updateProfile} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div><label className="text-white/70 text-sm mb-1 block">Skills (comma separated)</label><input type="text" value={formData.skills} onChange={(e) => setFormData({...formData, skills: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-500" /></div>
                      <div><label className="text-white/70 text-sm mb-1 block">Education</label><input type="text" value={formData.education} onChange={(e) => setFormData({...formData, education: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white" /></div>
                      <div><label className="text-white/70 text-sm mb-1 block">Branch</label><input type="text" value={formData.branch} onChange={(e) => setFormData({...formData, branch: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white" /></div>
                      <div><label className="text-white/70 text-sm mb-1 block">Year</label><input type="number" value={formData.year} onChange={(e) => setFormData({...formData, year: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white" /></div>
                      <div><label className="text-white/70 text-sm mb-1 block">Phone</label><input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white" /></div>
                      <div className="md:col-span-2"><label className="text-white/70 text-sm mb-1 block">Bio</label><textarea value={formData.bio} onChange={(e) => setFormData({...formData, bio: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white" rows="3" /></div>
                    </div>
                    <div className="flex gap-3">
                      <button type="submit" className="px-5 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white font-medium">Save Changes</button>
                      <button type="button" onClick={() => setShowProfileForm(false)} className="px-5 py-2 border border-white/20 rounded-lg text-white/70">Cancel</button>
                    </div>
                  </form>
                ) : (
                  <div>
                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                      <div className="bg-white/5 rounded-lg p-4"><p className="text-white/50 text-sm mb-1">Skills</p><div className="flex flex-wrap gap-2">{profile?.skills?.map((s, i) => <span key={i} className="px-2 py-1 bg-purple-500/20 rounded-lg text-white text-sm">{s}</span>)}</div></div>
                      <div className="bg-white/5 rounded-lg p-4"><p className="text-white/50 text-sm mb-1">Education</p><p className="text-white">{profile?.education || 'Not specified'}</p></div>
                      <div className="bg-white/5 rounded-lg p-4"><p className="text-white/50 text-sm mb-1">Branch & Year</p><p className="text-white">{profile?.branch || 'Not specified'} • Year {profile?.year || 'Not specified'}</p></div>
                      <div className="bg-white/5 rounded-lg p-4"><p className="text-white/50 text-sm mb-1">Contact</p><p className="text-white">{profile?.phone || 'Not specified'}</p></div>
                    </div>
                    <button onClick={() => setShowProfileForm(true)} className="px-5 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white font-medium">Edit Profile</button>
                  </div>
                )}
              </div>
            )}

            {/* Internships Tab */}
            {activeTab === 'internships' && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {internships.map((internship, idx) => (
                  <div key={idx} className="group bg-white/5 rounded-xl overflow-hidden border border-white/10 hover:border-purple-500/50 transition-all duration-300">
                    <div className="bg-gradient-to-r from-purple-600/50 to-pink-600/50 p-4">
                      <div className="flex items-center gap-3">
                        {companyLogos[internship.companyName] && (
                          <img src={companyLogos[internship.companyName]} className="w-10 h-10 rounded-full bg-white p-1" alt="" />
                        )}
                        <div className="flex-1">
                          <h3 className="text-white font-bold">{internship.title}</h3>
                          <p className="text-white/60 text-sm">{internship.companyName}</p>
                        </div>
                        {internship.matchPercentage && (
                          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">{internship.matchPercentage}% match</span>
                        )}
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-white/70 text-sm mb-3">{internship.description}</p>
                      <div className="flex items-center gap-3 text-white/50 text-xs mb-3">
                        <span>📍 {internship.location}</span>
                        <span>💰 {internship.salary}</span>
                      </div>
                      <button onClick={() => applyForInternship(internship._id)} disabled={applying} className="w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white font-medium hover:shadow-lg transition-all disabled:opacity-50">
                        {applying ? 'Applying...' : 'Apply Now →'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Applications Tab */}
            {activeTab === 'applications' && (
              <div className="space-y-3">
                {myApplications.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-3">📭</div>
                    <p className="text-white/60">No applications yet</p>
                    <button onClick={() => setActiveTab('internships')} className="mt-4 px-5 py-2 bg-purple-500 rounded-lg text-white">Browse Internships</button>
                  </div>
                ) : (
                  myApplications.map((app, idx) => (
                    <div key={idx} className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-white font-semibold">{app.internshipTitle}</h3>
                          <p className="text-white/50 text-sm">{app.companyName}</p>
                          <p className="text-white/40 text-xs mt-1">Applied: {new Date(app.appliedAt).toLocaleDateString()}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          app.status === 'accepted' ? 'bg-green-500/20 text-green-400' :
                          app.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          app.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {app.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tasks Tab */}
            {activeTab === 'tasks' && (
              <div className="space-y-3">
                {tasks.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-3">✅</div>
                    <p className="text-white/60">No tasks assigned yet</p>
                  </div>
                ) : (
                  tasks.map((task, idx) => (
                    <div key={idx} className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-white font-semibold">{task.title}</h3>
                          <p className="text-white/60 text-sm">{task.description}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          task.status === 'reviewed' ? 'bg-green-500/20 text-green-400' :
                          task.status === 'submitted' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {task.status}
                        </span>
                      </div>
                      {task.status === 'pending' && (
                        <button onClick={() => {
                          const url = prompt('Enter submission URL:');
                          if (url) submitTask(task._id, url);
                        }} className="px-4 py-1.5 bg-purple-500 rounded-lg text-white text-sm">Submit Task</button>
                      )}
                      {task.feedback && (
                        <div className="mt-3 p-3 bg-white/5 rounded-lg">
                          <p className="text-white/50 text-xs">Feedback: {task.feedback}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </main>





{/* AI Recommendations Modal */}
{showAIRecommendations && aiRecommendations && (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
    <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 max-w-4xl w-full mx-4 max-h-[85vh] overflow-auto border border-white/20">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-3xl">🧠</span>
            <h2 className="text-2xl font-bold text-white">AI Company Recommendations</h2>
            <span className="px-2 py-1 bg-purple-500/30 text-purple-300 rounded-full text-xs">AI</span>
          </div>
          <p className="text-white/60 text-sm mt-1">
            Based on your skills: {aiRecommendations.studentSkills?.join(', ') || 'Add skills to get recommendations'}
          </p>
          <p className="text-white/40 text-xs mt-1">
            🔍 AI analyzed {aiRecommendations.totalCompanies || 0} companies
          </p>
        </div>
        <button 
          onClick={() => setShowAIRecommendations(false)} 
          className="text-white/70 text-2xl hover:text-white"
        >
          ✕
        </button>
      </div>

      {/* ========== AI INSIGHTS SECTION (ADDED) ========== */}
      {aiRecommendations.careerInsights && (
        <div className="bg-gradient-to-r from-purple-600/30 to-pink-600/30 rounded-xl p-4 mb-4 border border-purple-500/30">
          
          {/* Summary */}
          <div className="flex items-start gap-3">
            <span className="text-2xl">🧠</span>
            <div>
              <h3 className="text-white font-semibold">AI Career Insights</h3>
              <p className="text-white/80 text-sm mt-1">
                {aiRecommendations.careerInsights.summary}
              </p>
            </div>
          </div>

          {/* Career Path */}
          {aiRecommendations.careerInsights.careerPath && (
            <div className="mt-3 p-3 bg-purple-500/20 rounded-lg border border-purple-500/30">
              <p className="text-white/60 text-xs">🎯 Suggested Career Path</p>
              <p className="text-white font-medium text-sm">
                {aiRecommendations.careerInsights.careerPath}
              </p>
            </div>
          )}

          {/* Skills to Learn */}
          {aiRecommendations.careerInsights.topSkillsToLearn?.length > 0 && (
            <div className="mt-3">
              <p className="text-white/60 text-xs">📚 Skills to learn for better opportunities:</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {aiRecommendations.careerInsights.topSkillsToLearn.map((skill, i) => (
                  <span key={i} className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">
                    {skill} 🚀
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {aiRecommendations.careerInsights.suggestions?.length > 0 && (
            <div className="mt-3">
              <p className="text-white/60 text-xs">💡 AI Suggestions:</p>
              <div className="space-y-1 mt-1">
                {aiRecommendations.careerInsights.suggestions.map((suggestion, idx) => (
                  <p key={idx} className="text-white/70 text-xs">• {suggestion}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========== RECOMMENDATIONS LIST ========== */}
      {aiRecommendations.recommendations?.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-6xl mb-3">📭</div>
          <p className="text-white/60">No companies match your skills</p>
          <p className="text-white/40 text-sm mt-2">
            Add more skills to your profile to get better AI recommendations
          </p>
          <button 
            onClick={() => { setShowAIRecommendations(false); setActiveTab('profile'); }} 
            className="mt-4 px-4 py-2 bg-purple-500 rounded-lg text-white"
          >
            Update Profile
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {aiRecommendations.recommendations.map((company, idx) => (
            <div key={idx} className={`bg-white/5 rounded-xl p-5 border transition-all ${idx === 0 ? 'border-purple-500/50 bg-purple-500/10' : 'border-white/10 hover:border-purple-500/50'}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  
                  {/* Company Header */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-lg">
                        {company.companyName}
                        {idx === 0 && <span className="ml-2 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">🏆 Best Match</span>}
                      </h3>
                      <p className="text-white/40 text-sm">
                        {company.industry || 'Technology'} • {company.location || 'India'}
                      </p>
                    </div>
                  </div>
                  
                  {/* AI Score */}
                  <div className="mt-3 flex flex-wrap gap-4 text-sm">
                    <span className="text-white/60">
                      🎯 Match: <span className="text-purple-400 font-bold">{company.matchScore}%</span>
                    </span>
                    <span className="text-white/60">
                      📋 {company.internships || 0} internships
                    </span>
                    <span className="text-white/60">
                      🎯 {company.matchedSkills}/{company.totalSkills} skills matched
                    </span>
                  </div>

                  {/* ========== AI SUGGESTIONS FOR THIS COMPANY (ADDED) ========== */}
                  {company.suggestions && company.suggestions.length > 0 && (
                    <div className="mt-3 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                      <p className="text-white/50 text-xs">💡 AI Suggestions:</p>
                      <div className="space-y-1 mt-1">
                        {company.suggestions.slice(0, 3).map((suggestion, idx) => (
                          <p key={idx} className="text-white/70 text-xs">• {suggestion.description}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ========== CAREER INSIGHT FOR THIS COMPANY (ADDED) ========== */}
                  {company.careerInsight && (
                    <div className="mt-3 p-3 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                      <p className="text-indigo-400 text-xs font-medium">
                        {company.careerInsight.title}
                      </p>
                      <p className="text-white/60 text-xs mt-1">
                        {company.careerInsight.description}
                      </p>
                      {company.careerInsight.nextSteps && company.careerInsight.nextSteps.length > 0 && (
                        <div className="mt-2 space-y-0.5">
                          {company.careerInsight.nextSteps.map((step, idx) => (
                            <p key={idx} className="text-white/50 text-xs">• {step}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ========== GROWTH POTENTIAL (ADDED) ========== */}
                  {company.growthPotential && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-white/50 text-xs">📈 Growth Potential:</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        company.growthPotential.level === 'High' ? 'bg-green-500/20 text-green-400' :
                        company.growthPotential.level === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {company.growthPotential.level} ({company.growthPotential.score}%)
                      </span>
                    </div>
                  )}

                  {/* Missing Skills */}
                  {company.missingSkills?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-white/50 text-xs">📚 Skills to learn:</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {company.missingSkills.map((skill, i) => (
                          <span key={i} className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">
                            {skill} 🚀
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Skills */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {company.skills?.map((skill, i) => {
                      const isMatched = aiRecommendations.studentSkills?.some(s => 
                        s.toLowerCase().includes(skill.toLowerCase())
                      );
                      return (
                        <span key={i} className={`px-2 py-1 rounded-full text-xs ${isMatched ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                          {skill} {isMatched ? '✅' : '❌'}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Right Side - Match Score & Apply Button */}
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center border-4 border-purple-500">
                      <span className="text-2xl font-bold text-white">
                        {company.matchScore || 0}%
                      </span>
                    </div>
                  </div>
                  <div className="mt-2">
                    {company.alreadyApplied ? (
                      <span className="text-green-400 text-sm">✅ Applied</span>
                    ) : (
                      <button 
                        onClick={() => {
                          const internship = internships.find(i => i.companyName === company.companyName);
                          if (internship) {
                            applyForInternship(internship._id);
                            setShowAIRecommendations(false);
                          } else {
                            toast.info('No active internships from this company');
                          }
                        }}
                        className="px-4 py-1.5 bg-purple-500 rounded-lg text-white text-sm hover:bg-purple-600 transition"
                      >
                        Apply Now
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-white/10 text-center">
        <p className="text-white/30 text-xs">
          🧠 AI analyzes your skills, suggests improvements, and provides career insights to help you grow
        </p>
      </div>
    </div>
  </div>
)}





    </div>

  );
};

export default StudentDashboard;
