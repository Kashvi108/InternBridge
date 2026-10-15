import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const InstituteDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [instituteProfile, setInstituteProfile] = useState(null);
  const [students, setStudents] = useState([]);
  const [reports, setReports] = useState(null);
  const [placements, setPlacements] = useState([]);
  const [placementStats, setPlacementStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [profileForm, setProfileForm] = useState({ instituteName: '', address: '', phone: '', email: '', website: '', description: '' });

  const token = localStorage.getItem('token');

  useEffect(() => { 
    fetchInstituteProfile(); 
    fetchStudents(); 
    fetchReports(); 
    fetchPlacements(); 
    fetchPlacementStats(); 
  }, []);

  const handleLogout = () => { logout(); navigate('/'); toast.success('Logged out'); };
  const goToHome = () => navigate('/');

  const fetchInstituteProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/profile`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setInstituteProfile(data.profile || { instituteName: user?.name });
      if (data.profile) setProfileForm({
        instituteName: data.profile.instituteName || user?.name || '',
        address: data.profile.address || '',
        phone: data.profile.phone || '',
        email: data.profile.email || '',
        website: data.profile.website || '',
        description: data.profile.description || ''
      });
    } catch (error) {}
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch(`${API_URL}/institute/students`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setStudents(data);
    } catch (error) {}
  };

  const fetchReports = async () => {
    try {
      const res = await fetch(`${API_URL}/reports/placement`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setReports(data);
    } catch (error) {}
  };

  const fetchPlacements = async () => {
    try {
      const res = await fetch(`${API_URL}/institute/placements`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setPlacements(data.placements || []);
      setPlacementStats(data.statistics);
      setLoading(false);
    } catch (error) {}
  };

  const fetchPlacementStats = async () => {
    try {
      const res = await fetch(`${API_URL}/institute/placement-stats`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setPlacementStats(data);
    } catch (error) {}
  };

  const updateInstituteProfile = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${API_URL}/institute/profile`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(profileForm) });
      toast.success('Profile updated!');
      setShowProfileForm(false);
      fetchInstituteProfile();
    } catch (error) { toast.error('Failed'); }
  };

  const verifyStudent = async (studentId) => {
    try {
      await fetch(`${API_URL}/institute/verify/${studentId}`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } });
      toast.success('Student verified!');
      fetchStudents();
    } catch (error) { toast.error('Failed'); }
  };

  const getPerformanceColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const filteredStudents = students.filter(s => s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || s.email?.toLowerCase().includes(searchTerm.toLowerCase()));

  const stats = [
    { value: students.length, label: "Total Students", icon: "👨‍🎓", color: "from-blue-500 to-cyan-500" },
    { value: students.filter(s => s.isVerified).length, label: "Verified", icon: "✅", color: "from-emerald-500 to-teal-500" },
    { value: `${Math.round(students.reduce((a, s) => a + (s.performanceScore || 0), 0) / (students.length || 1))}%`, label: "Avg Performance", icon: "📈", color: "from-purple-500 to-pink-500" },
    { value: placementStats?.totalPlaced || 0, label: "Students Placed", icon: "🎓", color: "from-orange-500 to-red-500" }
  ];

  if (loading) return <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center"><div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
      </div>

      <aside className={`fixed top-0 left-0 z-50 h-full w-72 bg-white/10 backdrop-blur-xl border-r border-white/20 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8"><div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center"><span className="text-white text-xl">🏛️</span></div><div><h2 className="text-white font-bold">Institute Portal</h2><p className="text-white/60 text-xs">{instituteProfile?.instituteName || user?.name}</p></div></div>
          <nav className="space-y-2">
            {['overview', 'students', 'reports', 'placements', 'profile'].map(tab => (
              <button key={tab} onClick={() => { setActiveTab(tab); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === tab ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' : 'text-white/70 hover:bg-white/10'}`}>
                <span className="text-xl">{tab === 'overview' ? '📊' : tab === 'students' ? '👨‍🎓' : tab === 'reports' ? '📈' : tab === 'placements' ? '🎓' : '🏛️'}</span>
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

      <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white/10 backdrop-blur rounded-lg"><span className="text-white text-2xl">☰</span></button>

      <main className="lg:ml-72 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8"><h1 className="text-3xl font-bold text-white mb-2">Welcome, {instituteProfile?.instituteName || user?.name} 🏛️</h1><p className="text-white/60">Track your students and monitor their progress</p></div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, idx) => (
              <div key={idx} className="group bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10 hover:border-purple-500/50 transition-all">
                <div className="relative"><div className="text-3xl mb-2">{stat.icon}</div><div className="text-2xl font-bold text-white">{stat.value}</div><div className="text-white/50 text-sm">{stat.label}</div></div>
              </div>
            ))}
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
            {activeTab === 'overview' && (
              <div>
                <div className="bg-gradient-to-r from-purple-600/30 to-pink-600/30 rounded-xl p-5 mb-6"><h2 className="text-white font-semibold">🎓 Institute Overview</h2><p className="text-white/60 text-sm mt-1">You have {students.length} students, {placementStats?.totalPlaced || 0} placed successfully</p></div>
                <div className="grid md:grid-cols-2 gap-5">
                  <div><h3 className="text-white font-medium mb-3">🏆 Top Performers</h3>{students.filter(s => s.tasksCompleted > 0).sort((a, b) => b.performanceScore - a.performanceScore).slice(0, 5).map((s, i) => <div key={i} className="flex justify-between items-center p-3 bg-white/5 rounded-lg mb-2"><span className="text-white">{s.name}</span><span className={getPerformanceColor(s.performanceScore)}>{s.performanceScore}%</span></div>)}</div>
                  <div><h3 className="text-white font-medium mb-3">📊 Quick Stats</h3><div className="space-y-2"><div className="flex justify-between p-3 bg-white/5 rounded-lg"><span>Total Tasks Completed</span><span className="text-white font-semibold">{students.reduce((a, s) => a + (s.tasksCompleted || 0), 0)}</span></div><div className="flex justify-between p-3 bg-white/5 rounded-lg"><span>Placement Rate</span><span className="text-white font-semibold">{placementStats?.placementRate || 0}%</span></div></div></div>
                </div>
              </div>
            )}

            {activeTab === 'students' && (
              <div>
                <div className="mb-4"><input type="text" placeholder="Search students..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full md:w-64 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40" /></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-white"><thead className="border-b border-white/10"><tr><th className="text-left py-3 px-4">Student</th><th className="text-left py-3 px-4">Branch/Year</th><th className="text-left py-3 px-4">Tasks</th><th className="text-left py-3 px-4">Performance</th><th className="text-left py-3 px-4">Status</th><th className="text-left py-3 px-4">Placed</th><th className="text-left py-3 px-4">Action</th></tr></thead>
                  <tbody>{filteredStudents.map((s, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5"><td className="py-3 px-4"><div><p className="font-medium">{s.name}</p><p className="text-white/40 text-xs">{s.email}</p></div></td>
                    <td className="py-3 px-4">{s.branch}<br/><span className="text-white/40 text-xs">Year {s.year}</span></td>
                    <td className="py-3 px-4">{s.tasksCompleted}/{s.totalTasks}</td>
                    <td className="py-3 px-4"><span className={getPerformanceColor(s.performanceScore)}>{s.performanceScore}%</span></td>
                    <td className="py-3 px-4">{s.isVerified ? <span className="text-green-400">✓ Verified</span> : <span className="text-yellow-400">⏳ Pending</span>}</td>
                    <td className="py-3 px-4">{s.isPlaced ? <span className="text-emerald-400">✓ {s.placedCompany}</span> : <span className="text-white/40">-</span>}</td>
                    <td className="py-3 px-4">{!s.isVerified && <button onClick={() => verifyStudent(s._id)} className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg text-sm">Verify</button>}</td></tr>
                  ))}</tbody></table>
                </div>
              </div>
            )}

            {activeTab === 'reports' && reports && (
              <div className="grid md:grid-cols-2 gap-5">
                <div><h3 className="text-white font-semibold mb-3">📊 Placement Overview</h3><div className="space-y-3"><div className="flex justify-between p-3 bg-white/5 rounded-lg"><span>Placement Rate</span><span className="text-white font-semibold">{Math.round(reports.placementRate)}%</span></div><div className="flex justify-between p-3 bg-white/5 rounded-lg"><span>Total Internships</span><span className="text-white font-semibold">{reports.totalInternships}</span></div><div className="flex justify-between p-3 bg-white/5 rounded-lg"><span>Total Placements</span><span className="text-white font-semibold">{reports.totalPlacements}</span></div></div></div>
                <div><h3 className="text-white font-semibold mb-3">📈 Performance Distribution</h3><div className="space-y-2"><div><div className="flex justify-between text-sm mb-1"><span>Excellent (80-100%)</span><span>{students.filter(s => s.performanceScore >= 80).length}</span></div><div className="w-full bg-white/10 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{ width: `${(students.filter(s => s.performanceScore >= 80).length / (students.length || 1)) * 100}%` }}></div></div></div>
                <div><div className="flex justify-between text-sm mb-1"><span>Good (60-79%)</span><span>{students.filter(s => s.performanceScore >= 60 && s.performanceScore < 80).length}</span></div><div className="w-full bg-white/10 rounded-full h-2"><div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${(students.filter(s => s.performanceScore >= 60 && s.performanceScore < 80).length / (students.length || 1)) * 100}%` }}></div></div></div></div></div>
              </div>
            )}

            {activeTab === 'placements' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-xl p-5 border border-emerald-500/30"><div className="text-3xl mb-2">🎓</div><div className="text-2xl font-bold text-white">{placementStats?.totalPlaced || 0}</div><div className="text-white/60 text-sm">Students Placed</div></div>
                  <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-xl p-5 border border-blue-500/30"><div className="text-3xl mb-2">📊</div><div className="text-2xl font-bold text-white">{placementStats?.placementRate || 0}%</div><div className="text-white/60 text-sm">Placement Rate</div></div>
                  <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-5 border border-purple-500/30"><div className="text-3xl mb-2">💰</div><div className="text-2xl font-bold text-white">{placementStats?.avgPackage || 0} LPA</div><div className="text-white/60 text-sm">Average Package</div></div>
                  <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-xl p-5 border border-orange-500/30"><div className="text-3xl mb-2">🏢</div><div className="text-2xl font-bold text-white">{placementStats?.companyWiseStats ? Object.keys(placementStats.companyWiseStats).length : 0}</div><div className="text-white/60 text-sm">Recruiting Companies</div></div>
                </div>

                {placementStats?.topRecruiters?.length > 0 && (
                  <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-4">🏆 Top Recruiters</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {placementStats.topRecruiters.map((recruiter, idx) => (
                        <div key={idx} className="bg-white/5 rounded-lg p-3 text-center"><div className="text-2xl mb-1">🏢</div><div className="text-white font-medium text-sm">{recruiter.name}</div><div className="text-emerald-400 text-xs">{recruiter.count} students</div></div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                  <div className="p-4 border-b border-white/10"><h3 className="text-lg font-semibold text-white">📋 Placement Records</h3></div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-white"><thead className="bg-white/5"><tr><th className="px-4 py-3 text-left text-sm">Student Name</th><th className="px-4 py-3 text-left text-sm">Company</th><th className="px-4 py-3 text-left text-sm">Position</th><th className="px-4 py-3 text-left text-sm">Package</th><th className="px-4 py-3 text-left text-sm">Placed On</th></tr></thead>
                    <tbody className="divide-y divide-white/10">
                      {placements.length === 0 ? <tr><td colSpan="5" className="px-4 py-8 text-center text-white/50">No placements recorded yet</td></tr> : placements.map((p, idx) => (<tr key={idx} className="hover:bg-white/5 transition"><td className="px-4 py-3"><div><p className="font-medium">{p.studentName}</p><p className="text-white/40 text-xs">{p.studentEmail}</p></div></td><td className="px-4 py-3"><span className="text-emerald-400">{p.companyName}</span></td><td className="px-4 py-3">{p.internshipTitle}</td><td className="px-4 py-3"><span className="text-yellow-400">{p.package}</span></td><td className="px-4 py-3 text-white/60">{new Date(p.createdAt).toLocaleDateString()}</td></tr>))}
                    </tbody></table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div>{showProfileForm ? (
                <form onSubmit={updateInstituteProfile} className="space-y-3"><input type="text" placeholder="Institute Name" value={profileForm.instituteName} onChange={e => setProfileForm({...profileForm, instituteName: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white" /><input type="text" placeholder="Address" value={profileForm.address} onChange={e => setProfileForm({...profileForm, address: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white" /><input type="tel" placeholder="Phone" value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white" /><input type="email" placeholder="Email" value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white" /><input type="url" placeholder="Website" value={profileForm.website} onChange={e => setProfileForm({...profileForm, website: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white" /><textarea placeholder="Description" value={profileForm.description} onChange={e => setProfileForm({...profileForm, description: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white" rows="3" /><div className="flex gap-3"><button type="submit" className="px-4 py-2 bg-purple-500 rounded-lg text-white">Save</button><button type="button" onClick={() => setShowProfileForm(false)} className="px-4 py-2 border border-white/20 rounded-lg text-white/70">Cancel</button></div></form>
              ) : (
                <div><div className="grid md:grid-cols-2 gap-4 mb-5"><div className="bg-white/5 rounded-lg p-4"><p className="text-white/50 text-sm">Address</p><p className="text-white">{instituteProfile?.address || 'Not specified'}</p></div><div className="bg-white/5 rounded-lg p-4"><p className="text-white/50 text-sm">Phone</p><p className="text-white">{instituteProfile?.phone || 'Not specified'}</p></div></div><button onClick={() => setShowProfileForm(true)} className="px-4 py-2 bg-purple-500 rounded-lg text-white">Edit Profile</button></div>
              )}</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default InstituteDashboard;