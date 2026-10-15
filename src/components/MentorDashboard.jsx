import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const MentorDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [students, setStudents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', studentId: '', dueDate: '' });
  const [profileForm, setProfileForm] = useState({ expertise: '', company: '', position: '', experience: '', bio: '' });

  const token = localStorage.getItem('token');

  useEffect(() => { fetchProfile(); fetchStudents(); fetchTasks(); }, []);

  useEffect(() => {
    if (studentSearch.length > 0) {
      setFilteredStudents(students.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.email.toLowerCase().includes(studentSearch.toLowerCase())));
    } else { setFilteredStudents([]); }
  }, [studentSearch, students]);

  const handleLogout = () => { logout(); navigate('/'); toast.success('Logged out'); };
  const goToHome = () => navigate('/');

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/profile`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setProfile(data.profile);
      if (data.profile) setProfileForm({
        expertise: data.profile.expertise?.join(', ') || '',
        company: data.profile.company || '',
        position: data.profile.position || '',
        experience: data.profile.experience || '',
        bio: data.profile.bio || ''
      });
    } catch (error) {}
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch(`${API_URL}/mentor/students`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setStudents(data);
    } catch (error) {}
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch(`${API_URL}/mentor/tasks`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setTasks(data);
      setLoading(false);
    } catch (error) {}
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    const expertiseArray = profileForm.expertise.split(',').map(s => s.trim());
    try {
      await fetch(`${API_URL}/mentor/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...profileForm, expertise: expertiseArray, experience: parseInt(profileForm.experience) })
      });
      toast.success('Profile updated!');
      setShowProfileForm(false);
      fetchProfile();
    } catch (error) { toast.error('Failed'); }
  };

  const assignTask = async (e) => {
    e.preventDefault();
    if (!taskForm.studentId) { toast.error('Select a student'); return; }
    try {
      await fetch(`${API_URL}/mentor/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(taskForm)
      });
      toast.success('Task assigned!');
      setShowTaskForm(false);
      setTaskForm({ title: '', description: '', studentId: '', dueDate: '' });
      setStudentSearch('');
      setSelectedStudent(null);
      fetchTasks();
    } catch (error) { toast.error('Failed'); }
  };

  const reviewTask = async (taskId, score, feedback) => {
    try {
      await fetch(`${API_URL}/mentor/tasks/${taskId}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ score, feedback, status: 'reviewed' })
      });
      toast.success('Task reviewed!');
      fetchTasks();
      fetchStudents();
    } catch (error) { toast.error('Failed'); }
  };

  const stats = [
    { value: students.length, label: "Mentees", icon: "👨‍🎓", color: "from-blue-500 to-cyan-500" },
    { value: tasks.length, label: "Tasks Assigned", icon: "📋", color: "from-purple-500 to-pink-500" },
    { value: tasks.filter(t => t.status === 'submitted').length, label: "Pending Review", icon: "⏳", color: "from-amber-500 to-orange-500" },
    { value: tasks.filter(t => t.status === 'reviewed').length, label: "Completed", icon: "✅", color: "from-emerald-500 to-teal-500" }
  ];

  if (loading) return <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center"><div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
      </div>

      <aside className={`fixed top-0 left-0 z-50 h-full w-72 bg-white/10 backdrop-blur-xl border-r border-white/20 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8"><div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-xl flex items-center justify-center"><span className="text-white text-xl">👨‍🏫</span></div><div><h2 className="text-white font-bold">Mentor Portal</h2><p className="text-white/60 text-xs">{user?.name}</p></div></div>
          <nav className="space-y-2">
            {['overview', 'students', 'tasks', 'profile'].map(tab => (
              <button key={tab} onClick={() => { setActiveTab(tab); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === tab ? 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-lg' : 'text-white/70 hover:bg-white/10'}`}>
                <span className="text-xl">{tab === 'overview' ? '📊' : tab === 'students' ? '👨‍🎓' : tab === 'tasks' ? '📋' : '👤'}</span>
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
          <div className="mb-8"><h1 className="text-3xl font-bold text-white mb-2">Welcome, Mentor {user?.name} 👨‍🏫</h1><p className="text-white/60">Guide your students and track their progress</p></div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, idx) => (
              <div key={idx} className="group bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10 hover:border-indigo-500/50 transition-all">
                <div className="relative"><div className="text-3xl mb-2">{stat.icon}</div><div className="text-2xl font-bold text-white">{stat.value}</div><div className="text-white/50 text-sm">{stat.label}</div></div>
              </div>
            ))}
          </div>

          <div className="mb-6"><button onClick={() => setShowTaskForm(true)} className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-xl text-white font-medium">➕ Assign New Task</button></div>

          {showTaskForm && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 max-w-lg w-full mx-4 border border-white/20">
                <h2 className="text-xl font-bold text-white mb-4">Assign New Task</h2>
                <form onSubmit={assignTask} className="space-y-3">
                  <div><input type="text" placeholder="Search student..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white" />{filteredStudents.length > 0 && <div className="absolute z-10 mt-1 w-full bg-white/10 backdrop-blur rounded-lg border border-white/20 max-h-40 overflow-auto">{filteredStudents.map(s => <div key={s._id} onClick={() => { setSelectedStudent(s); setTaskForm({...taskForm, studentId: s._id}); setStudentSearch(s.name); setFilteredStudents([]); }} className="px-4 py-2 hover:bg-white/10 cursor-pointer"><p className="text-white">{s.name}</p><p className="text-white/50 text-xs">{s.email}</p></div>)}</div>}</div>
                  {selectedStudent && <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400 text-sm">Selected: {selectedStudent.name}</div>}
                  <input type="text" placeholder="Task Title" value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white" required />
                  <textarea placeholder="Description" value={taskForm.description} onChange={e => setTaskForm({...taskForm, description: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white" rows="3" required />
                  <input type="date" value={taskForm.dueDate} onChange={e => setTaskForm({...taskForm, dueDate: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white" required />
                  <div className="flex gap-3"><button type="submit" className="flex-1 px-4 py-2 bg-indigo-500 rounded-lg text-white">Assign</button><button type="button" onClick={() => setShowTaskForm(false)} className="flex-1 px-4 py-2 border border-white/20 rounded-lg text-white/70">Cancel</button></div>
                </form>
              </div>
            </div>
          )}

          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
            {activeTab === 'overview' && (
              <div>
                <div className="bg-gradient-to-r from-indigo-600/30 to-blue-600/30 rounded-xl p-5 mb-6"><h2 className="text-white font-semibold">📊 Mentor Dashboard</h2><p className="text-white/60 text-sm mt-1">You have {students.length} mentees and {tasks.length} tasks assigned</p></div>
                <div className="grid md:grid-cols-2 gap-5">
                  <div><h3 className="text-white font-medium mb-3">👨‍🎓 Your Mentees</h3>{students.slice(0, 5).map(s => <div key={s._id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg mb-2"><span className="text-white">{s.name}</span><span className="text-white/50 text-sm">{s.performanceScore}%</span></div>)}</div>
                  <div><h3 className="text-white font-medium mb-3">📋 Recent Tasks</h3>{tasks.slice(0, 5).map(t => <div key={t._id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg mb-2"><span className="text-white">{t.title}</span><span className="text-white/50 text-sm capitalize">{t.status}</span></div>)}</div>
                </div>
              </div>
            )}

            {activeTab === 'students' && (
              <div className="space-y-3">
                {students.map(s => (
                  <div key={s._id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex justify-between items-center"><div><p className="text-white font-semibold">{s.name}</p><p className="text-white/50 text-sm">{s.email}</p><p className="text-white/40 text-xs">{s.branch} • Year {s.year}</p></div><div className="text-right"><p className="text-green-400">{s.performanceScore}%</p><button onClick={() => { setSelectedStudent(s); setTaskForm({...taskForm, studentId: s._id}); setStudentSearch(s.name); setShowTaskForm(true); }} className="mt-2 px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-lg text-sm">Assign Task</button></div></div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'tasks' && (
              <div className="space-y-3">
                {tasks.map(t => (
                  <div key={t._id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex justify-between items-start"><div><h3 className="text-white font-semibold">{t.title}</h3><p className="text-white/60 text-sm">{t.description}</p><p className="text-white/40 text-xs mt-1">Student: {students.find(s => s._id === t.studentId)?.name}</p></div>
                    <span className={`px-2 py-1 rounded-full text-xs ${t.status === 'reviewed' ? 'bg-green-500/20 text-green-400' : t.status === 'submitted' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{t.status}</span></div>
                    {t.status === 'submitted' && !t.feedback && <button onClick={() => { const score = prompt('Score (0-100):'); const feedback = prompt('Feedback:'); if (score && feedback) reviewTask(t._id, parseInt(score), feedback); }} className="mt-3 px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-sm">Review</button>}
                    {t.feedback && <div className="mt-3 p-3 bg-white/5 rounded-lg"><p className="text-white/50 text-sm">Score: {t.score}% - {t.feedback}</p></div>}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'profile' && (
              <div>{showProfileForm ? (
                <form onSubmit={updateProfile} className="space-y-3">
                  <input type="text" placeholder="Expertise (comma separated)" value={profileForm.expertise} onChange={e => setProfileForm({...profileForm, expertise: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white" />
                  <input type="text" placeholder="Company" value={profileForm.company} onChange={e => setProfileForm({...profileForm, company: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white" />
                  <input type="text" placeholder="Position" value={profileForm.position} onChange={e => setProfileForm({...profileForm, position: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white" />
                  <input type="number" placeholder="Experience (years)" value={profileForm.experience} onChange={e => setProfileForm({...profileForm, experience: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white" />
                  <textarea placeholder="Bio" value={profileForm.bio} onChange={e => setProfileForm({...profileForm, bio: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white" rows="3" />
                  <div className="flex gap-3"><button type="submit" className="px-4 py-2 bg-indigo-500 rounded-lg text-white">Save</button><button type="button" onClick={() => setShowProfileForm(false)} className="px-4 py-2 border border-white/20 rounded-lg text-white/70">Cancel</button></div>
                </form>
              ) : (
                <div><div className="grid md:grid-cols-2 gap-4 mb-5"><div className="bg-white/5 rounded-lg p-4"><p className="text-white/50 text-sm">Expertise</p><div className="flex flex-wrap gap-1">{profile?.expertise?.map((e, i) => <span key={i} className="px-2 py-1 bg-white/10 rounded-lg text-white text-xs">{e}</span>)}</div></div><div className="bg-white/5 rounded-lg p-4"><p className="text-white/50 text-sm">Experience</p><p className="text-white">{profile?.experience} years at {profile?.company}</p></div></div><button onClick={() => setShowProfileForm(true)} className="px-4 py-2 bg-indigo-500 rounded-lg text-white">Edit Profile</button></div>
              )}</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default MentorDashboard;