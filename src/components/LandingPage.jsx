import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (user) {
      switch(user.role) {
        case 'student': navigate('/student-dashboard'); break;
        case 'company': navigate('/company-dashboard'); break;
        case 'institute': navigate('/institute-dashboard'); break;
        case 'mentor': navigate('/mentor-dashboard'); break;
        default: break;
      }
    }
  }, [user, navigate]);

  const scrollToSection = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const features = [
    { icon: "🎯", title: "Smart Matching", desc: "AI-powered algorithm matches students with perfect internships based on skills" },
    { icon: "📊", title: "Performance Analytics", desc: "Real-time tracking of intern performance and progress with detailed insights" },
    { icon: "💼", title: "PPO Management", desc: "Seamless conversion from intern to full-time employee with one click" },
    { icon: "📝", title: "Task Management", desc: "Assign and track tasks with automated evaluation and feedback system" },
    { icon: "🏆", title: "Skill Assessment", desc: "Comprehensive skill evaluation and certification for students" },
    { icon: "📈", title: "Placement Reports", desc: "Detailed analytics and reports for institutes to track success rates" }
  ];

  const stats = [
    { number: "10K+", label: "Active Students", icon: "👨‍🎓" },
    { number: "500+", label: "Partner Companies", icon: "🏢" },
    { number: "200+", label: "Institutes", icon: "🏛️" },
    { number: "100+", label: "Expert Mentors", icon: "👨‍🏫" },
    { number: "85%", label: "Placement Rate", icon: "📈" }
  ];

  const roles = [
    { title: "For Students", icon: "👨‍🎓", color: "from-blue-500 to-cyan-500", roleParam: "student", features: ["Personalized skill assessment", "Smart internship matching", "Real-time progress tracking", "Expert mentorship", "Placement assistance"] },
    { title: "For Companies", icon: "🏢", color: "from-emerald-500 to-teal-500", roleParam: "company", features: ["Post internship opportunities", "AI-powered candidate筛选", "Performance analytics", "PPO management", "Talent pipeline building"] },
    { title: "For Institutes", icon: "🏛️", color: "from-purple-500 to-pink-500", roleParam: "institute", features: ["Student verification", "Internship tracking", "Generate reports", "Monitor placements", "Academic integration"] },
    { title: "For Mentors", icon: "👨‍🏫", color: "from-indigo-500 to-blue-500", roleParam: "mentor", features: ["Guide and mentor students", "Assign tasks and projects", "Track student progress", "Provide feedback", "Help students grow"] }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-2000"></div>
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full animate-float"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 5}s`
            }}
          />
        ))}
      </div>

      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled ? 'bg-white/10 backdrop-blur-xl border-b border-white/20 shadow-lg' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-xl font-bold">IB</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                InternBridge
              </span>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              {['Home', 'Features', 'How It Works', 'For Roles'].map((item) => (
                <button
                  key={item}
                  onClick={() => scrollToSection(item.toLowerCase().replace(/ /g, '-'))}
                  className="text-white/80 hover:text-white transition-colors duration-300 font-medium"
                >
                  {item}
                </button>
              ))}
            </div>
            
            <div className="hidden md:flex space-x-4">
              {!user ? (
                <>
                  <Link to="/login">
                    <button className="px-5 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300">
                      Sign In
                    </button>
                  </Link>
                  <Link to="/register">
                    <button className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                      Get Started
                    </button>
                  </Link>
                </>
              ) : (
                <Link to={`/${user.role}-dashboard`}>
                  <button className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold shadow-lg">
                    Dashboard
                  </button>
                </Link>
              )}
            </div>

            <div className="md:hidden">
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-white text-2xl">
                {mobileMenuOpen ? '✕' : '☰'}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white/10 backdrop-blur-xl border-t border-white/20">
            <div className="px-4 py-3 space-y-2">
              <button onClick={() => { scrollToSection('home'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 text-white/80">Home</button>
              <button onClick={() => { scrollToSection('features'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 text-white/80">Features</button>
              <button onClick={() => { scrollToSection('how-it-works'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 text-white/80">How It Works</button>
              <button onClick={() => { scrollToSection('for-roles'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 text-white/80">For Roles</button>
              <div className="pt-4 space-y-2">
                <Link to="/login" className="block w-full text-center px-4 py-2 text-white border border-white/20 rounded-xl" onClick={() => setMobileMenuOpen(false)}>Sign In</Link>
                <Link to="/register" className="block w-full text-center px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white" onClick={() => setMobileMenuOpen(false)}>Get Started</Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section id="home" className="relative min-h-screen flex items-center pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
              <span className="text-sm text-white/80">✨ Welcome to InternBridge</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              Bridge Your
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"> Internship</span>
              <br />
              to
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent"> Placement</span>
            </h1>
            <p className="text-xl text-white/70 max-w-2xl mx-auto mb-10">
              Join India's fastest growing internship platform. Connect with top companies, 
              gain real-world experience, and secure your dream job.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              {!user && (
                <>
                  <Link to="/register">
                    <button className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 flex items-center gap-2">
                      Start Your Journey
                      <span>→</span>
                    </button>
                  </Link>
                  <Link to="/login">
                    <button className="px-8 py-4 border border-white/30 text-white rounded-xl font-semibold hover:bg-white/10 transition-all duration-300">
                      Sign In
                    </button>
                  </Link>
                </>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mt-16 pt-8 border-t border-white/10">
              {stats.map((stat, idx) => (
                <div key={idx} className="text-center">
                  <div className="text-3xl mb-2">{stat.icon}</div>
                  <div className="text-2xl font-bold text-white">{stat.number}</div>
                  <div className="text-sm text-white/50">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Why Choose
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"> InternBridge</span>
            </h2>
            <p className="text-xl text-white/60 max-w-3xl mx-auto">
              We provide everything you need to succeed in your career journey
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="group bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-purple-500/50 transition-all duration-300 hover:-translate-y-2">
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform inline-block">{feature.icon}</div>
                <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-white/60 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              How
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"> InternBridge</span> Works
            </h2>
            <p className="text-xl text-white/60">Simple 4-step process to launch your career</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: "01", title: "Sign Up", desc: "Create your profile and showcase your skills", icon: "📝" },
              { step: "02", title: "Apply", desc: "Browse and apply for internships", icon: "🎯" },
              { step: "03", title: "Learn & Grow", desc: "Complete tasks and get mentored", icon: "📚" },
              { step: "04", title: "Get Hired", desc: "Earn PPO and start your career", icon: "🎉" }
            ].map((item, idx) => (
              <div key={idx} className="relative text-center group">
                <div className="w-24 h-24 mx-auto bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg relative group-hover:scale-110 transition-transform duration-300">
                  <span className="text-4xl">{item.icon}</span>
                  <div className="absolute -top-3 -right-3 w-8 h-8 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white font-bold text-sm border border-white/30">
                    {item.step}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                <p className="text-white/60">{item.desc}</p>
                {idx < 3 && (
                  <div className="hidden md:block absolute top-1/3 -right-3 text-2xl text-white/30">→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section id="for-roles" className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Tailored
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"> Dashboards</span> for Everyone
            </h2>
            <p className="text-xl text-white/60">Personalized experience for students, companies, institutes, and mentors</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {roles.map((role, idx) => (
              <div key={idx} className="group bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10 hover:border-purple-500/50 transition-all duration-300 hover:-translate-y-2">
                <div className={`bg-gradient-to-r ${role.color} p-5 text-center`}>
                  <div className="text-5xl mb-2">{role.icon}</div>
                  <h3 className="text-xl font-bold text-white">{role.title}</h3>
                </div>
                <div className="p-5">
                  <ul className="space-y-2 mb-5">
                    {role.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-center text-white/70 text-sm">
                        <span className="text-green-400 mr-2">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link to={`/register?role=${role.roleParam}`}>
                    <button className={`w-full py-2 bg-gradient-to-r ${role.color} rounded-xl text-white font-semibold hover:shadow-lg transition-all duration-300`}>
                      Join Now →
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative">
        <div className="max-w-4xl mx-auto text-center px-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl blur-3xl opacity-30"></div>
            <div className="relative bg-white/5 backdrop-blur-sm rounded-3xl p-12 border border-white/20">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Transform Your Career?
              </h2>
              <p className="text-xl text-white/70 mb-8">
                Join 10,000+ students who have already launched their careers with InternBridge
              </p>
              {!user && (
                <Link to="/register">
                  <button className="px-10 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 inline-flex items-center gap-2">
                    Create Free Account
                    <span>→</span>
                  </button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold">IB</span>
                </div>
                <h3 className="text-xl font-bold text-white">InternBridge</h3>
              </div>
              <p className="text-white/50">Bridging internships to placements since 2024</p>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><button onClick={() => scrollToSection('home')} className="text-white/50 hover:text-white transition">Home</button></li>
                <li><button onClick={() => scrollToSection('features')} className="text-white/50 hover:text-white transition">Features</button></li>
                <li><button onClick={() => scrollToSection('how-it-works')} className="text-white/50 hover:text-white transition">How It Works</button></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">For Users</h4>
              <ul className="space-y-2">
                <li><Link to="/login" className="text-white/50 hover:text-white transition">Student Login</Link></li>
                <li><Link to="/login" className="text-white/50 hover:text-white transition">Company Login</Link></li>
                <li><Link to="/login" className="text-white/50 hover:text-white transition">Institute Login</Link></li>
                <li><Link to="/login" className="text-white/50 hover:text-white transition">Mentor Login</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Contact</h4>
              <ul className="space-y-2 text-white/50">
                <li className="flex items-center gap-2">📧 support@internbridge.com</li>
                <li className="flex items-center gap-2">📞 +91 98765 43210</li>
                <li className="flex items-center gap-2">📍 Mumbai, India</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/10 pt-8 text-center text-white/40 text-sm">
            <p>&copy; 2024 InternBridge. All rights reserved. | Made with ❤️ for students</p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); opacity: 0; }
          50% { transform: translateY(-20px); opacity: 1; }
        }
        .animate-float {
          animation: float linear infinite;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;






