import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const CompanyDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [companyProfile, setCompanyProfile] = useState(null);
  const [internships, setInternships] = useState([]);
  const [applications, setApplications] = useState([]);
  const [showPostForm, setShowPostForm] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [companyLogos, setCompanyLogos] = useState({});
  const [matchedStudents, setMatchedStudents] = useState(null);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [selectedInternship, setSelectedInternship] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    stipend: '',
    requiredSkills: ''
  });

  const [profileForm, setProfileForm] = useState({
    companyName: '',
    industry: '',
    location: '',
    website: '',
    description: ''
  });

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchCompanyProfile();
    fetchCompanyInternships();
    fetchApplications();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success('Logged out successfully');
  };

  const goToHome = () => {
    navigate('/');
  };

  const fetchCompanyProfile = async () => {
    try {
      const response = await fetch(`${API_URL}/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setCompanyProfile(data.profile || { companyName: user?.name });
      if (data.profile) {
        setProfileForm({
          companyName: data.profile.companyName || user?.name || '',
          industry: data.profile.industry || '',
          location: data.profile.location || '',
          website: data.profile.website || '',
          description: data.profile.description || ''
        });
      }
      const companyName = data.profile?.companyName || user?.name;
      if (companyName) {
        fetchCompanyLogo(companyName);
      }
    } catch (error) {
      console.error('Error fetching company profile:', error);
    }
  };

  const fetchCompanyLogo = async (companyName) => {
    try {
      const response = await fetch(`${API_URL}/company-logo/${companyName}`);
      const data = await response.json();
      setCompanyLogos(prev => ({ ...prev, [companyName]: data.logo }));
    } catch (error) {
      console.error('Error fetching logo:', error);
    }
  };

  const fetchCompanyInternships = async () => {
    try {
      const response = await fetch(`${API_URL}/company/internships`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setInternships(data);
      data.forEach(internship => {
        if (internship.companyName) {
          fetchCompanyLogo(internship.companyName);
        }
      });
    } catch (error) {
      console.error('Error fetching internships:', error);
    }
  };

  const fetchApplications = async () => {
    try {
      const response = await fetch(`${API_URL}/company/applications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setApplications(data);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateApplicationStatus = async (applicationId, status) => {
    try {
      const response = await fetch(`${API_URL}/company/applications/${applicationId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        toast.success(`Application ${status}!`);
        fetchApplications();
        if (status === 'accepted') {
          // Refresh matched students after acceptance
          if (selectedInternship) {
            getMatchedStudents(selectedInternship);
          }
        }
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      toast.error('Error updating status');
    }
  };

  const updateCompanyProfile = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/company/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileForm)
      });
      
      if (response.ok) {
        toast.success('Company profile updated successfully!');
        setShowProfileForm(false);
        fetchCompanyProfile();
      } else {
        toast.error('Failed to update profile');
      }
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  const postInternship = async (e) => {
    e.preventDefault();
    
    const requiredSkillsArray = formData.requiredSkills
      .split(',')
      .map(skill => skill.trim())
      .filter(skill => skill);
    
    try {
      const response = await fetch(`${API_URL}/internships`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          location: formData.location,
          salary: formData.stipend,
          requiredSkills: requiredSkillsArray,
          companyName: companyProfile?.companyName || user?.name,
          postedBy: user?.name
        })
      });
      
      if (response.ok) {
        toast.success('Internship posted successfully! Students will see this based on skill matching.');
        setShowPostForm(false);
        setFormData({
          title: '',
          description: '',
          location: '',
          stipend: '',
          requiredSkills: ''
        });
        fetchCompanyInternships();
      } else {
        toast.error('Failed to post internship');
      }
    } catch (error) {
      toast.error('Failed to post internship');
    }
  };

  const getMatchedStudents = async (internshipId) => {
    try {
      setSelectedInternship(internshipId);
      const response = await fetch(`${API_URL}/internships/${internshipId}/matched-students`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setMatchedStudents(data);
      setShowMatchModal(true);
      if (data.totalMatches === 0) {
        toast.info('No students matched the required skills. Try posting with different skills.');
      } else {
        toast.success(`Found ${data.totalMatches} matching students!`);
      }
    } catch (error) {
      toast.error('Error finding matched students');
    }
  };

  const hireStudent = async (studentId) => {
    const offerDetails = prompt('Enter offer details (Role, joining date, etc.):');
    const salaryPackage = prompt('Enter salary package (e.g., 12 LPA):');
    
    if (offerDetails) {
      try {
        const response = await fetch(`${API_URL}/company/hire`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            studentId, 
            offerDetails,
            package: salaryPackage || 'Not disclosed'
          })
        });
        
        if (response.ok) {
          toast.success('Student hired and placement recorded!');
          setShowMatchModal(false);
          fetchApplications();
          // Update the application status to accepted
          const application = applications.find(app => app.studentId === studentId);
          if (application) {
            await updateApplicationStatus(application._id, 'accepted');
          }
        } else {
          toast.error('Failed to hire student');
        }
      } catch (error) {
        toast.error('Error hiring student');
      }
    }
  };

  const stats = [
    { value: internships.filter(i => i.status !== 'closed').length, label: "Active Internships", icon: "💼", color: "from-blue-500 to-cyan-500" },
    { value: applications.length, label: "Applications", icon: "👥", color: "from-purple-500 to-pink-500" },
    { value: applications.filter(a => a.status === 'shortlisted').length, label: "Shortlisted", icon: "⭐", color: "from-amber-500 to-orange-500" },
    { value: applications.filter(a => a.status === 'accepted').length, label: "Hired", icon: "🎉", color: "from-emerald-500 to-teal-500" }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl">🏢</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
      </div>

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-72 bg-white/10 backdrop-blur-xl border-r border-white/20 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white text-xl">🏢</span>
            </div>
            <div>
              <h2 className="text-white font-bold">Company Portal</h2>
              <p className="text-white/60 text-xs">{companyProfile?.companyName || user?.name}</p>
            </div>
          </div>
          
          <nav className="space-y-2">
            {['overview', 'internships', 'applications', 'profile'].map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="text-xl">
                  {tab === 'overview' ? '📊' : tab === 'internships' ? '💼' : tab === 'applications' ? '📝' : '🏢'}
                </span>
                <span className="font-medium capitalize">{tab}</span>
              </button>
            ))}
          </nav>
          
          <div className="absolute bottom-6 left-0 right-0 px-6">
  <button 
    onClick={() => {
      logout();
      window.location.href = '/';
    }}
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
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Welcome, {companyProfile?.companyName || user?.name} 🏢</h1>
            <p className="text-white/60">Manage your internship opportunities and find top talent</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, idx) => (
              <div key={idx} className="group relative overflow-hidden bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10 hover:border-emerald-500/50 transition-all duration-300">
                <div className={`absolute inset-0 bg-gradient-to-r ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity`}></div>
                <div className="relative">
                  <div className="text-3xl mb-2">{stat.icon}</div>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-white/50 text-sm">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Button */}
          <div className="mb-6">
            <button onClick={() => setShowPostForm(true)} className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              ➕ Post New Internship
            </button>
          </div>

          {/* Post Internship Modal */}
          {showPostForm && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 max-w-lg w-full mx-4 border border-white/20">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-white">Post New Internship</h2>
                  <button onClick={() => setShowPostForm(false)} className="text-white/70 text-2xl hover:text-white">✕</button>
                </div>
                <form onSubmit={postInternship} className="space-y-4">
                  <input type="text" placeholder="Internship Title" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-emerald-500" required />
                  <textarea placeholder="Description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30" rows="3" required />
                  <input type="text" placeholder="Location" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30" required />
                  <input type="text" placeholder="Stipend (e.g., ₹25,000/month)" value={formData.stipend} onChange={(e) => setFormData({...formData, stipend: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30" required />
                  <div>
                    <input type="text" placeholder="Required Skills (comma separated)" value={formData.requiredSkills} onChange={(e) => setFormData({...formData, requiredSkills: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30" required />
                    <p className="text-white/40 text-xs mt-1">e.g., React, Node.js, Python, MongoDB</p>
                  </div>
                  <div className="flex gap-3 pt-3">
                    <button type="submit" className="flex-1 px-4 py-2 bg-emerald-500 rounded-lg text-white font-medium hover:bg-emerald-600 transition">Post Internship</button>
                    <button type="button" onClick={() => setShowPostForm(false)} className="flex-1 px-4 py-2 border border-white/20 rounded-lg text-white/70 hover:bg-white/10 transition">Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Content Area */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div>
                <div className="bg-gradient-to-r from-emerald-600/30 to-teal-600/30 rounded-xl p-5 mb-6">
                  <h2 className="text-white font-semibold">📊 Company Overview</h2>
                  <p className="text-white/60 text-sm mt-1">You have posted {internships.length} internships and received {applications.length} applications</p>
                </div>
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <h3 className="text-white font-medium mb-3">📋 Recent Internships</h3>
                    {internships.slice(0, 3).map((inv, i) => (
                      <div key={i} className="p-3 bg-white/5 rounded-lg mb-2 hover:bg-white/10 transition">
                        <p className="text-white font-medium">{inv.title}</p>
                        <p className="text-white/40 text-xs">{inv.location} • {inv.salary}</p>
                      </div>
                    ))}
                    {internships.length === 0 && <p className="text-white/40 text-center py-4">No internships posted yet</p>}
                  </div>
                  <div>
                    <h3 className="text-white font-medium mb-3">📝 Recent Applications</h3>
                    {applications.slice(0, 3).map((app, i) => (
                      <div key={i} className="p-3 bg-white/5 rounded-lg mb-2 hover:bg-white/10 transition">
                        <p className="text-white font-medium">{app.studentName}</p>
                        <p className="text-white/40 text-xs">{app.internshipTitle} • <span className="capitalize">{app.status}</span></p>
                      </div>
                    ))}
                    {applications.length === 0 && <p className="text-white/40 text-center py-4">No applications received yet</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Internships Tab */}
            {activeTab === 'internships' && (
              <div className="space-y-4">
                <h3 className="text-white font-semibold text-lg">Your Internships</h3>
                {internships.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-6xl mb-3">📭</div>
                    <p className="text-white/60">No internships posted yet</p>
                    <button onClick={() => setShowPostForm(true)} className="mt-4 px-4 py-2 bg-emerald-500 rounded-lg text-white">Post Your First Internship</button>
                  </div>
                ) : (
                  internships.map((inv, i) => (
                    <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-emerald-500/50 transition-all">
                      <div className="flex justify-between items-start flex-wrap gap-3">
                        <div>
                          <h3 className="text-white font-semibold text-lg">{inv.title}</h3>
                          <p className="text-white/50 text-sm">{inv.location} • {inv.salary}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {inv.requiredSkills?.map((skill, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full text-xs">{skill}</span>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => getMatchedStudents(inv._id)} className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg text-sm hover:bg-purple-500/30 transition">
                            🎯 Find Matches
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Applications Tab */}
            {activeTab === 'applications' && (
              <div className="space-y-4">
                <h3 className="text-white font-semibold text-lg">Applications Received</h3>
                {applications.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-6xl mb-3">📭</div>
                    <p className="text-white/60">No applications received yet</p>
                  </div>
                ) : (
                  applications.map((app, i) => (
                    <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition">
                      <div className="flex justify-between items-start flex-wrap gap-3">
                        <div>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                              {app.studentName?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-white font-semibold">{app.studentName}</p>
                              <p className="text-white/50 text-sm">{app.studentEmail}</p>
                              <p className="text-white/40 text-xs">Applied for: {app.internshipTitle}</p>
                              {app.matchPercentage > 0 && (
                                <p className="text-emerald-400 text-xs mt-1">Skill Match: {app.matchPercentage}%</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <select 
                            value={app.status} 
                            onChange={(e) => updateApplicationStatus(app._id, e.target.value)}
                            className={`px-3 py-1.5 border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                              app.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                              app.status === 'reviewed' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                              app.status === 'shortlisted' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                              app.status === 'accepted' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                              'bg-red-500/20 text-red-400 border-red-500/30'
                            }`}
                          >
                            <option value="pending">⏳ Pending</option>
                            <option value="reviewed">👀 Reviewed</option>
                            <option value="shortlisted">⭐ Shortlisted</option>
                            <option value="accepted">🎉 Accept</option>
                            <option value="rejected">❌ Reject</option>
                          </select>
                          {app.status === 'shortlisted' && (
                            <button onClick={() => hireStudent(app.studentId)} className="px-3 py-1 bg-emerald-500 rounded-lg text-white text-sm hover:bg-emerald-600 transition">
                              Hire Student
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div>
                <div className="flex items-center gap-4 mb-6">
                  {companyLogos[companyProfile?.companyName || user?.name] ? (
                    <img src={companyLogos[companyProfile?.companyName || user?.name]} alt="Logo" className="w-16 h-16 rounded-full bg-white p-2" />
                  ) : (
                    <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center text-3xl text-white">
                      🏢
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-bold text-white">{companyProfile?.companyName || user?.name}</h2>
                    <p className="text-white/60">{companyProfile?.industry || 'Technology'}</p>
                  </div>
                </div>

                {showProfileForm ? (
                  <form onSubmit={updateCompanyProfile} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div><label className="block text-white/70 text-sm mb-1">Company Name</label><input type="text" value={profileForm.companyName} onChange={(e) => setProfileForm({...profileForm, companyName: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white" /></div>
                      <div><label className="block text-white/70 text-sm mb-1">Industry</label><input type="text" value={profileForm.industry} onChange={(e) => setProfileForm({...profileForm, industry: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white" /></div>
                      <div><label className="block text-white/70 text-sm mb-1">Location</label><input type="text" value={profileForm.location} onChange={(e) => setProfileForm({...profileForm, location: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white" /></div>
                      <div><label className="block text-white/70 text-sm mb-1">Website</label><input type="url" value={profileForm.website} onChange={(e) => setProfileForm({...profileForm, website: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white" /></div>
                      <div className="md:col-span-2"><label className="block text-white/70 text-sm mb-1">Description</label><textarea value={profileForm.description} onChange={(e) => setProfileForm({...profileForm, description: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white" rows="3" /></div>
                    </div>
                    <div className="flex gap-3">
                      <button type="submit" className="px-4 py-2 bg-emerald-500 rounded-lg text-white">Save Changes</button>
                      <button type="button" onClick={() => setShowProfileForm(false)} className="px-4 py-2 border border-white/20 rounded-lg text-white/70">Cancel</button>
                    </div>
                  </form>
                ) : (
                  <div>
                    <div className="grid md:grid-cols-2 gap-4 mb-5">
                      <div className="bg-white/5 rounded-lg p-4"><p className="text-white/50 text-sm">Industry</p><p className="text-white">{companyProfile?.industry || 'Not specified'}</p></div>
                      <div className="bg-white/5 rounded-lg p-4"><p className="text-white/50 text-sm">Location</p><p className="text-white">{companyProfile?.location || 'Not specified'}</p></div>
                      <div className="bg-white/5 rounded-lg p-4"><p className="text-white/50 text-sm">Website</p>{companyProfile?.website ? <a href={companyProfile.website} target="_blank" className="text-emerald-400 hover:underline">Visit →</a> : <p className="text-white">Not specified</p>}</div>
                      <div className="bg-white/5 rounded-lg p-4"><p className="text-white/50 text-sm">Total Internships</p><p className="text-white">{internships.length}</p></div>
                      {companyProfile?.description && <div className="md:col-span-2 bg-white/5 rounded-lg p-4"><p className="text-white/50 text-sm">About Company</p><p className="text-white">{companyProfile.description}</p></div>}
                    </div>
                    <button onClick={() => setShowProfileForm(true)} className="px-4 py-2 bg-emerald-500 rounded-lg text-white">Edit Profile</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Matched Students Modal */}
      {showMatchModal && matchedStudents && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 max-w-5xl w-full mx-4 max-h-[85vh] overflow-auto border border-white/20">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold text-white">🎯 Skill-Based Matches</h2>
                <p className="text-white/60 text-sm">Internship: {matchedStudents.internshipTitle}</p>
                <p className="text-white/40 text-xs mt-1">Required Skills: {matchedStudents.requiredSkills?.join(', ') || 'None'}</p>
                <p className="text-emerald-400 text-sm mt-1">✅ {matchedStudents.totalMatches} students matched (≥40% skill match)</p>
              </div>
              <button onClick={() => setShowMatchModal(false)} className="text-white/70 text-2xl hover:text-white">✕</button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-white">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm">Student</th>
                    <th className="px-4 py-3 text-left text-sm">Skills</th>
                    <th className="px-4 py-3 text-left text-sm">Match %</th>
                    <th className="px-4 py-3 text-left text-sm">Performance</th>
                    <th className="px-4 py-3 text-left text-sm">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {matchedStudents.matchedStudents.map((student, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{student.studentName}</p>
                          <p className="text-white/40 text-xs">{student.studentEmail}</p>
                          <p className="text-white/40 text-xs">{student.branch} • Year {student.year}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {student.studentSkills.slice(0, 3).map((skill, i) => (
                            <span key={i} className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full text-xs">{skill}</span>
                          ))}
                          {student.studentSkills.length > 3 && (
                            <span className="text-xs text-white/40">+{student.studentSkills.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-white/20 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                student.matchPercentage >= 80 ? 'bg-green-500' :
                                student.matchPercentage >= 60 ? 'bg-yellow-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${student.matchPercentage}%` }}
                            ></div>
                          </div>
                          <span className="font-semibold">{student.matchPercentage}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${
                          student.performanceScore >= 80 ? 'text-green-400' :
                          student.performanceScore >= 60 ? 'text-yellow-400' : 'text-orange-400'
                        }`}>
                          {student.performanceScore}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button 
                          onClick={() => hireStudent(student.studentId)}
                          className="px-3 py-1 bg-emerald-500 rounded-lg text-white text-sm hover:bg-emerald-600 transition"
                        >
                          Hire
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {matchedStudents.matchedStudents.length === 0 && (
              <div className="text-center py-8">
                <p className="text-white/60">No students matched the required skills.</p>
                <p className="text-white/40 text-sm mt-1">Try posting internships with different skill requirements.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyDashboard;