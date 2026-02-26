import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  User, 
  BookOpen, 
  Target, 
  TrendingUp, 
  Plus, 
  Trash2, 
  BrainCircuit,
  ChevronRight,
  Award,
  Briefcase,
  GraduationCap,
  Sparkles,
  Loader2,
  Github,
  FolderGit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import Markdown from 'react-markdown';
import { getCareerAdvice, type CareerAdvice } from './services/geminiService';
import { cn } from './lib/utils';

// --- Types ---
interface Profile {
  full_name: string;
  current_role: string;
  target_role: string;
  bio: string;
  notion_token?: string;
  linkedin_token?: string;
  github_token?: string;
}

interface Skill {
  id: number;
  name: string;
  level: number;
  category: string;
}

interface Education {
  id: number;
  institution: string;
  degree: string;
  field: string;
  start_date: string;
  end_date: string;
}

interface Goal {
  id: number;
  title: string;
  description: string;
  deadline: string;
  status: 'pending' | 'completed';
}

// --- Components ---

const Card = ({ children, className, title, icon: Icon }: { children: React.ReactNode, className?: string, title?: string, icon?: any }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={cn("bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden", className)}
  >
    {title && (
      <div className="px-6 py-4 border-bottom border-slate-100 flex items-center justify-between bg-slate-50/50">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          {Icon && <Icon size={18} className="text-brand-600" />}
          {title}
        </h3>
      </div>
    )}
    <div className="p-6">{children}</div>
  </motion.div>
);

const Button = ({ children, onClick, variant = 'primary', className, disabled, isLoading }: any) => {
  const variants = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100',
    ghost: 'hover:bg-slate-100 text-slate-600'
  };

  return (
    <button 
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        "px-4 py-2 rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm",
        variants[variant as keyof typeof variants],
        className
      )}
    >
      {isLoading ? <Loader2 size={16} className="animate-spin" /> : children}
    </button>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [education, setEducation] = useState<Education[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [advice, setAdvice] = useState<CareerAdvice | null>(null);
  const [linkedinOptimization, setLinkedinOptimization] = useState<any>(null);
  const [isGeneratingAdvice, setIsGeneratingAdvice] = useState(false);
  const [isOptimizingLinkedin, setIsOptimizingLinkedin] = useState(false);
  const [isUpdatingLinkedin, setIsUpdatingLinkedin] = useState(false);
  const [isExportingToNotion, setIsExportingToNotion] = useState(false);
  const [manualNotionToken, setManualNotionToken] = useState('');
  const [showManualNotion, setShowManualNotion] = useState(false);

  // GitHub states
  const [repos, setRepos] = useState<any[]>([]);
  const [selectedReadme, setSelectedReadme] = useState<string | null>(null);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [isLoadingReadme, setIsLoadingReadme] = useState(false);

  // Form states
  const [newSkill, setNewSkill] = useState({ name: '', level: 3, category: 'Teknik' });
  const [newGoal, setNewGoal] = useState({ title: '', description: '', deadline: '' });
  const [newEdu, setNewEdu] = useState({ institution: '', degree: '', field: '', start_date: '', end_date: '' });

  useEffect(() => {
    fetchData();
    
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTION_AUTH_SUCCESS') {
        fetchData();
        alert('Notion başarıyla bağlandı!');
      }
      if (event.data?.type === 'LINKEDIN_AUTH_SUCCESS') {
        fetchData();
        alert('LinkedIn başarıyla bağlandı!');
      }
      if (event.data?.type === 'GITHUB_AUTH_SUCCESS') {
        fetchData();
        alert('GitHub başarıyla bağlandı!');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const fetchData = async () => {
    try {
      const [pRes, sRes, eRes, gRes] = await Promise.all([
        fetch('/api/profile'),
        fetch('/api/skills'),
        fetch('/api/education'),
        fetch('/api/goals')
      ]);
      setProfile(await pRes.json());
      setSkills(await sRes.json());
      setEducation(await eRes.json());
      setGoals(await gRes.json());
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  const connectNotion = async () => {
    try {
      const res = await fetch('/api/auth/notion/url');
      const data = await res.json();
      
      if (!res.ok) {
        alert(`Hata: ${data.error || 'Notion bağlantı adresi alınamadı.'}\nLütfen NOTION_CLIENT_ID değişkenini kontrol edin.`);
        return;
      }
      
      if (data.url) {
        window.open(data.url, 'notion_auth', 'width=600,height=700');
      }
    } catch (err) {
      console.error("Notion connect error:", err);
      alert('Sunucuyla iletişim kurulurken bir hata oluştu.');
    }
  };

  const saveManualNotionToken = async () => {
    if (!manualNotionToken || manualNotionToken.length < 10) {
      alert("Lütfen geçerli bir Notion Secret girin.");
      return;
    }
    try {
      const res = await fetch('/api/auth/notion/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: manualNotionToken })
      });
      if (res.ok) {
        alert('Notion Secret başarıyla kaydedildi!');
        setManualNotionToken('');
        setShowManualNotion(false);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Kaydedilirken bir hata oluştu.');
      }
    } catch (err) {
      console.error("Manual notion save error:", err);
    }
  };

  const exportToNotion = async () => {
    if (!advice) return;
    setIsExportingToNotion(true);
    try {
      const res = await fetch('/api/notion/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          advice: advice,
          title: `${profile?.full_name} - Kariyer Planı (${new Date().toLocaleDateString()})`
        })
      });
      if (res.ok) {
        alert('Kariyer planı Notion hesabınıza başarıyla eklendi!');
      } else {
        const data = await res.json();
        if (data.error === 'Notion not connected') {
          alert('Lütfen önce Notion hesabınızı bağlayın.');
        } else {
          alert('Notion\'a eklenirken bir hata oluştu.');
        }
      }
    } catch (err) {
      console.error("Notion export error:", err);
    } finally {
      setIsExportingToNotion(false);
    }
  };

  const connectLinkedin = async () => {
    try {
      const res = await fetch('/api/auth/linkedin/url');
      const { url } = await res.json();
      window.open(url, 'linkedin_auth', 'width=600,height=700');
    } catch (err) {
      console.error("Linkedin connect error:", err);
    }
  };

  const updateLinkedinProfile = async () => {
    if (!linkedinOptimization) return;
    setIsUpdatingLinkedin(true);
    try {
      const res = await fetch('/api/linkedin/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          headline: linkedinOptimization.headline,
          about: linkedinOptimization.about
        })
      });
      if (res.ok) {
        alert('LinkedIn profiliniz başarıyla güncellendi!');
      } else {
        alert('LinkedIn güncellenirken bir hata oluştu.');
      }
    } catch (err) {
      console.error("Linkedin update error:", err);
    } finally {
      setIsUpdatingLinkedin(false);
    }
  };

  const optimizeLinkedin = async () => {
    if (!profile) return;
    setIsOptimizingLinkedin(true);
    try {
      const response = await getCareerAdvice({ 
        profile, 
        skills, 
        education, 
        goals,
        isNotionConnected: !!profile.notion_token,
        task: 'linkedin_optimize'
      });

      if (response?.functionCalls) {
        const call = response.functionCalls.find(c => c.name === 'optimizeLinkedInProfile');
        if (call) {
          setLinkedinOptimization(call.args);
          setActiveTab('cv-optimizer');
        }
      }
    } catch (err) {
      console.error("Linkedin optimization error:", err);
    } finally {
      setIsOptimizingLinkedin(false);
    }
  };

  const handleAddSkill = async () => {
    if (!newSkill.name) return;
    const res = await fetch('/api/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSkill)
    });
    if (res.ok) {
      setNewSkill({ name: '', level: 3, category: 'Teknik' });
      fetchData();
    }
  };

  const handleDeleteSkill = async (id: number) => {
    await fetch(`/api/skills/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const handleAddGoal = async () => {
    if (!newGoal.title) return;
    const res = await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newGoal)
    });
    if (res.ok) {
      setNewGoal({ title: '', description: '', deadline: '' });
      fetchData();
    }
  };

  const handleToggleGoal = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
    await fetch(`/api/goals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    fetchData();
  };

  const handleAddEdu = async () => {
    if (!newEdu.institution) return;
    const res = await fetch('/api/education', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEdu)
    });
    if (res.ok) {
      fetchData();
      setNewEdu({ institution: '', degree: '', field: '', start_date: '', end_date: '' });
    }
  };

  const handleDeleteEdu = async (id: number) => {
    const res = await fetch(`/api/education/${id}`, { method: 'DELETE' });
    if (res.ok) fetchData();
  };

  const connectGithub = async () => {
    try {
      const res = await fetch('/api/auth/github/url');
      const { url } = await res.json();
      window.open(url, 'github_auth', 'width=600,height=700');
    } catch (err) {
      console.error("Github connect error:", err);
    }
  };

  const fetchRepos = async () => {
    setIsLoadingRepos(true);
    try {
      const res = await fetch('/api/github/repos');
      if (res.ok) {
        const data = await res.json();
        setRepos(data);
      }
    } catch (err) {
      console.error("Fetch repos error:", err);
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const fetchReadme = async (owner: string, repo: string) => {
    setIsLoadingReadme(true);
    setSelectedReadme(null);
    try {
      const res = await fetch(`/api/github/readme?owner=${owner}&repo=${repo}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedReadme(data.content);
      }
    } catch (err) {
      console.error("Fetch readme error:", err);
    } finally {
      setIsLoadingReadme(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'github' && profile?.github_token) {
      fetchRepos();
    }
  }, [activeTab, profile?.github_token]);

  const generateAdvice = async () => {
    if (!profile) return;
    setIsGeneratingAdvice(true);
    try {
      const response = await getCareerAdvice({ 
        profile, 
        skills, 
        education, 
        goals,
        isNotionConnected: !!profile.notion_token 
      });

      if (!response) {
        alert('Analiz sırasında bir hata oluştu.');
        return;
      }

      // Handle Function Calls (Notion MCP Tool)
      const functionCalls = response.functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        for (const call of functionCalls) {
          if (call.name === 'createNotionPage') {
            const { title, planContent } = call.args as any;
            // Automatically trigger the export logic
            await fetch('/api/notion/export', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                advice: {
                  analysis: "AI tarafından otomatik oluşturulan plan.",
                  shortTerm: [planContent],
                  mediumTerm: ["Plan detayları Notion sayfanızda."],
                  longTerm: ["Başarılar dileriz!"],
                  motivation: "Yolun açık olsun!"
                },
                title: title
              })
            });
            alert('AI kariyer planınızı otomatik olarak Notion hesabınıza ekledi!');
          }
        }
      }

      // Parse JSON response
      if (response.text) {
        const result = JSON.parse(response.text);
        setAdvice(result);
      }
    } catch (err) {
      console.error("Advice generation error:", err);
    } finally {
      setIsGeneratingAdvice(false);
    }
  };

  const skillData = skills.map(s => ({ name: s.name, level: s.level }));

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed h-full z-10">
        <div className="p-6 flex items-center gap-3 border-b border-slate-100">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
            <TrendingUp size={24} />
          </div>
          <h1 className="font-bold text-slate-800 leading-tight">
            Kariyer<br /><span className="text-brand-600">Asistanı</span>
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'profile', label: 'Profilim', icon: User },
            { id: 'skills', label: 'Yetenekler', icon: Award },
            { id: 'education', label: 'Eğitim', icon: GraduationCap },
            { id: 'github', label: 'GitHub Projeleri', icon: Github },
            { id: 'goals', label: 'Hedefler', icon: Target },
            { id: 'cv-optimizer', label: 'CV / LinkedIn', icon: Briefcase },
            { id: 'ai-coach', label: 'AI Kariyer Koçu', icon: BrainCircuit },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                activeTab === item.id 
                  ? "bg-brand-50 text-brand-700 shadow-sm" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              )}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="bg-slate-900 rounded-2xl p-4 text-white">
            <p className="text-xs text-slate-400 mb-1">Mevcut Rol</p>
            <p className="text-sm font-semibold truncate">{profile?.current_role}</p>
            <div className="mt-4 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-brand-500 w-2/3" />
            </div>
            <p className="text-[10px] text-slate-400 mt-2">Hedef: {profile?.target_role}</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8 max-w-6xl mx-auto w-full">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {activeTab === 'dashboard' && 'Hoş Geldin, ' + (profile?.full_name || 'Kullanıcı')}
              {activeTab === 'profile' && 'Profil Bilgileri'}
              {activeTab === 'skills' && 'Yetenek Havuzu'}
              {activeTab === 'education' && 'Eğitim Geçmişi'}
              {activeTab === 'github' && 'GitHub Projeleri'}
              {activeTab === 'goals' && 'Kariyer Hedefleri'}
              {activeTab === 'cv-optimizer' && 'LinkedIn Profil Optimizer'}
              {activeTab === 'ai-coach' && 'AI Kariyer Koçu'}
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              {activeTab === 'dashboard' && 'Kariyer yolculuğundaki ilerlemeni buradan takip edebilirsin.'}
              {activeTab === 'github' && 'GitHub repolarını incele ve README dosyalarını görüntüle.'}
              {activeTab === 'cv-optimizer' && 'LinkedIn profilini profesyonel bir şekilde optimize et.'}
              {activeTab === 'ai-coach' && 'Yapay zeka verilerini analiz ederek sana özel tavsiyeler sunar.'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="secondary" className="hidden sm:flex">
              <Sparkles size={16} className="text-brand-500" />
              Premium'a Geç
            </Button>
            <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.full_name}`} alt="avatar" />
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              <Card className="md:col-span-2" title="Yetenek Analizi" icon={TrendingUp}>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={skillData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                      <YAxis domain={[0, 5]} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                      <Tooltip 
                        cursor={{fill: '#f8fafc'}}
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                      />
                      <Bar dataKey="level" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card title="Aktif Hedefler" icon={Target}>
                <div className="space-y-4">
                  {goals.filter(g => g.status === 'pending').slice(0, 4).map(goal => (
                    <div key={goal.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="mt-1 w-5 h-5 rounded-full border-2 border-brand-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{goal.title}</p>
                        <p className="text-xs text-slate-500">{goal.deadline}</p>
                      </div>
                    </div>
                  ))}
                  {goals.filter(g => g.status === 'pending').length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-8 italic">Aktif hedef bulunmuyor.</p>
                  )}
                  <Button variant="ghost" className="w-full text-xs" onClick={() => setActiveTab('goals')}>
                    Tümünü Gör <ChevronRight size={14} />
                  </Button>
                </div>
              </Card>

              <Card className="md:col-span-3 bg-brand-600 text-white border-none shadow-brand-500/20">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                      <BrainCircuit size={24} />
                      AI Kariyer Koçuna Sor
                    </h3>
                    <p className="text-brand-100 text-sm">
                      Verilerini analiz ederek sana özel bir gelişim planı hazırlamamı ister misin? 
                      Hedeflerine ulaşman için hangi yeteneklere odaklanman gerektiğini söyleyebilirim.
                    </p>
                  </div>
                  <Button 
                    onClick={() => setActiveTab('ai-coach')}
                    className="bg-white text-brand-700 hover:bg-brand-50 px-8 py-3 rounded-2xl shadow-lg"
                  >
                    Analizi Başlat
                  </Button>
                </div>
              </Card>

              <Card className="md:col-span-3 border-none bg-slate-800 text-white">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                      <Briefcase size={24} className="text-brand-400" />
                      LinkedIn Profilini Optimize Et
                    </h3>
                    <p className="text-slate-400 text-sm">
                      Mevcut deneyimlerin ve yeteneklerinle LinkedIn'de nasıl daha fazla dikkat çekebileceğini öğrenmek ister misin?
                    </p>
                  </div>
                  <Button 
                    onClick={optimizeLinkedin}
                    isLoading={isOptimizingLinkedin}
                    className="bg-brand-500 hover:bg-brand-600 text-white border-none px-8 py-3 rounded-2xl shadow-lg"
                  >
                    CV/LinkedIn Optimize Et
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {activeTab === 'cv-optimizer' && (
            <motion.div 
              key="cv-optimizer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {!linkedinOptimization && !isOptimizingLinkedin && (
                <Card className="text-center py-20">
                  <Briefcase size={64} className="mx-auto mb-4 text-slate-200" />
                  <h3 className="text-xl font-bold text-slate-800 mb-2">LinkedIn Profilini Parlat</h3>
                  <p className="text-slate-500 mb-6 max-w-md mx-auto">
                    Yapay zeka profilini analiz ederek sana özel başlık, hakkında yazısı ve deneyim ipuçları hazırlasın.
                  </p>
                  <Button onClick={optimizeLinkedin} isLoading={isOptimizingLinkedin} className="px-12">
                    Hemen Başlat
                  </Button>
                </Card>
              )}

              {isOptimizingLinkedin && (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 size={48} className="animate-spin text-brand-500 mb-4" />
                  <p className="text-slate-600 font-medium">LinkedIn profilin analiz ediliyor...</p>
                </div>
              )}

              {linkedinOptimization && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card title="Önerilen Başlık" icon={Award} className="md:col-span-2">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-lg font-bold text-slate-800">
                      {linkedinOptimization.headline}
                    </div>
                  </Card>

                  <Card title="Hakkında Yazısı" icon={User}>
                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {linkedinOptimization.about}
                    </p>
                  </Card>

                  <Card title="Deneyim İpuçları" icon={Briefcase}>
                    <ul className="space-y-3">
                      {linkedinOptimization.experienceTips.map((tip: string, i: number) => (
                        <li key={i} className="flex gap-2 text-sm text-slate-600">
                          <ChevronRight size={16} className="text-brand-500 flex-shrink-0" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </Card>

                  <Card title="Öne Çıkarılacak Yetenekler" icon={Sparkles} className="md:col-span-2">
                    <div className="flex flex-wrap gap-2">
                      {linkedinOptimization.skillsToHighlight.map((skill: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-brand-50 text-brand-700 rounded-full text-xs font-bold border border-brand-100">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </Card>
                  
                  <div className="md:col-span-2 flex justify-center gap-4 pt-4">
                    {profile?.linkedin_token ? (
                      <Button onClick={updateLinkedinProfile} isLoading={isUpdatingLinkedin} className="bg-brand-600 text-white">
                        LinkedIn Profilini Güncelle
                      </Button>
                    ) : (
                      <Button onClick={connectLinkedin} variant="secondary">
                        LinkedIn'i Bağla
                      </Button>
                    )}
                    <Button variant="secondary" onClick={optimizeLinkedin} isLoading={isOptimizingLinkedin}>
                      Yeniden Analiz Et
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'skills' && (
            <motion.div 
              key="skills"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <Card title="Yeni Yetenek Ekle" icon={Plus}>
                <div className="flex flex-wrap gap-4">
                  <input 
                    type="text" 
                    placeholder="Yetenek adı (örn: React, SQL...)"
                    className="flex-1 min-w-[200px] px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 outline-none"
                    value={newSkill.name}
                    onChange={e => setNewSkill({...newSkill, name: e.target.value})}
                  />
                  <select 
                    className="px-4 py-2 rounded-xl border border-slate-200 outline-none"
                    value={newSkill.level}
                    onChange={e => setNewSkill({...newSkill, level: parseInt(e.target.value)})}
                  >
                    <option value={1}>Başlangıç (1)</option>
                    <option value={2}>Temel (2)</option>
                    <option value={3}>Orta (3)</option>
                    <option value={4}>İleri (4)</option>
                    <option value={5}>Uzman (5)</option>
                  </select>
                  <Button onClick={handleAddSkill}>Ekle</Button>
                </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {skills.map(skill => (
                  <Card key={skill.id} className="relative group">
                    <button 
                      onClick={() => handleDeleteSkill(skill.id)}
                      className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={16} />
                    </button>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                        <Award size={24} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-800">{skill.name}</h4>
                        <div className="flex gap-1 mt-1">
                          {[1, 2, 3, 4, 5].map(i => (
                            <div 
                              key={i} 
                              className={cn(
                                "h-1.5 flex-1 rounded-full",
                                i <= skill.level ? "bg-brand-500" : "bg-slate-100"
                              )} 
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'education' && (
            <motion.div 
              key="education"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <Card title="Eğitim Bilgisi Ekle" icon={Plus}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input 
                    type="text" 
                    placeholder="Üniversite / Kurum"
                    className="px-4 py-2 rounded-xl border border-slate-200 outline-none"
                    value={newEdu.institution}
                    onChange={e => setNewEdu({...newEdu, institution: e.target.value})}
                  />
                  <input 
                    type="text" 
                    placeholder="Bölüm"
                    className="px-4 py-2 rounded-xl border border-slate-200 outline-none"
                    value={newEdu.field}
                    onChange={e => setNewEdu({...newEdu, field: e.target.value})}
                  />
                  <input 
                    type="text" 
                    placeholder="Derece (örn: Lisans, Yüksek Lisans)"
                    className="px-4 py-2 rounded-xl border border-slate-200 outline-none"
                    value={newEdu.degree}
                    onChange={e => setNewEdu({...newEdu, degree: e.target.value})}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="text" 
                      placeholder="Başlangıç (Yıl)"
                      className="px-4 py-2 rounded-xl border border-slate-200 outline-none"
                      value={newEdu.start_date}
                      onChange={e => setNewEdu({...newEdu, start_date: e.target.value})}
                    />
                    <input 
                      type="text" 
                      placeholder="Bitiş (Yıl)"
                      className="px-4 py-2 rounded-xl border border-slate-200 outline-none"
                      value={newEdu.end_date}
                      onChange={e => setNewEdu({...newEdu, end_date: e.target.value})}
                    />
                  </div>
                  <Button onClick={handleAddEdu} className="md:col-span-2">Eğitimi Kaydet</Button>
                </div>
              </Card>

              <div className="space-y-4">
                {education.map(edu => (
                  <Card key={edu.id} className="relative group">
                    <button 
                      onClick={() => handleDeleteEdu(edu.id)}
                      className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={16} />
                    </button>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 flex-shrink-0">
                        <GraduationCap size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800">{edu.institution}</h4>
                        <p className="text-slate-600 text-sm">{edu.degree} - {edu.field}</p>
                        <p className="text-slate-400 text-xs mt-1">{edu.start_date} - {edu.end_date}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'github' && (
            <motion.div 
              key="github"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {!profile?.github_token ? (
                <Card className="text-center py-20">
                  <Github size={64} className="mx-auto mb-4 text-slate-200" />
                  <h3 className="text-xl font-bold text-slate-800 mb-2">GitHub Hesabını Bağla</h3>
                  <p className="text-slate-500 mb-6 max-w-md mx-auto">
                    Projelerini ve repolarını burada görüntülemek için GitHub hesabını bağla.
                  </p>
                  <Button onClick={connectGithub} className="px-12">
                    GitHub ile Bağlan
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <FolderGit2 size={20} className="text-brand-600" />
                        Repoların
                      </h3>
                      <Button variant="ghost" className="p-1 h-auto" onClick={fetchRepos} isLoading={isLoadingRepos}>
                        <TrendingUp size={16} />
                      </Button>
                    </div>
                    {repos.map(repo => (
                      <button
                        key={repo.id}
                        onClick={() => fetchReadme(repo.owner.login, repo.name)}
                        className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-brand-500 hover:bg-brand-50/30 transition-all group"
                      >
                        <h4 className="font-semibold text-slate-800 group-hover:text-brand-700 truncate">{repo.name}</h4>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">{repo.description || 'Açıklama yok'}</p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                          <span>{repo.language || 'Unknown'}</span>
                          <span>⭐ {repo.stargazers_count}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  <div className="lg:col-span-2">
                    <Card title="README.md" icon={BookOpen} className="h-full min-h-[500px]">
                      {isLoadingReadme ? (
                        <div className="flex flex-col items-center justify-center h-full py-20">
                          <Loader2 size={32} className="animate-spin text-brand-500 mb-2" />
                          <p className="text-slate-500 text-sm">README yükleniyor...</p>
                        </div>
                      ) : selectedReadme ? (
                        <div className="markdown-body prose prose-slate max-w-none">
                          <Markdown>{selectedReadme}</Markdown>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full py-20 text-slate-400">
                          <BookOpen size={48} className="mb-4 opacity-20" />
                          <p className="italic">Bir repo seçerek README dosyasını görüntüle.</p>
                        </div>
                      )}
                    </Card>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'goals' && (
            <motion.div 
              key="goals"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <Card title="Yeni Hedef Belirle" icon={Plus}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input 
                    type="text" 
                    placeholder="Hedef başlığı"
                    className="px-4 py-2 rounded-xl border border-slate-200 outline-none"
                    value={newGoal.title}
                    onChange={e => setNewGoal({...newGoal, title: e.target.value})}
                  />
                  <input 
                    type="date" 
                    className="px-4 py-2 rounded-xl border border-slate-200 outline-none"
                    value={newGoal.deadline}
                    onChange={e => setNewGoal({...newGoal, deadline: e.target.value})}
                  />
                  <textarea 
                    placeholder="Açıklama (isteğe bağlı)"
                    className="md:col-span-2 px-4 py-2 rounded-xl border border-slate-200 outline-none h-24"
                    value={newGoal.description}
                    onChange={e => setNewGoal({...newGoal, description: e.target.value})}
                  />
                  <Button onClick={handleAddGoal} className="md:col-span-2">Hedefi Kaydet</Button>
                </div>
              </Card>

              <div className="space-y-4">
                {goals.map(goal => (
                  <div 
                    key={goal.id} 
                    className={cn(
                      "p-6 rounded-2xl border transition-all flex items-center gap-6",
                      goal.status === 'completed' 
                        ? "bg-slate-50 border-slate-100 opacity-75" 
                        : "bg-white border-slate-200 shadow-sm"
                    )}
                  >
                    <button 
                      onClick={() => handleToggleGoal(goal.id, goal.status)}
                      className={cn(
                        "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all",
                        goal.status === 'completed' 
                          ? "bg-brand-500 border-brand-500 text-white" 
                          : "border-slate-300 hover:border-brand-500"
                      )}
                    >
                      {goal.status === 'completed' && <Plus size={20} className="rotate-45" />}
                    </button>
                    <div className="flex-1">
                      <h4 className={cn("font-bold text-slate-800", goal.status === 'completed' && "line-through")}>
                        {goal.title}
                      </h4>
                      <p className="text-sm text-slate-500">{goal.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Son Tarih</p>
                      <p className="text-sm font-semibold text-slate-700">{goal.deadline}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'ai-coach' && (
            <motion.div 
              key="ai-coach"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <Card className="bg-slate-900 text-white border-none">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-brand-500/20 rounded-3xl flex items-center justify-center text-brand-400 border border-brand-500/30">
                    <BrainCircuit size={40} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">Akıllı Kariyer Analizi</h3>
                    <p className="text-slate-400 text-sm">
                      Mevcut yeteneklerini, eğitimini ve hedeflerini analiz ederek sana en uygun kariyer yolunu çiziyorum. 
                      Analiz için butona tıkla.
                    </p>
                  </div>
                  <Button 
                    onClick={generateAdvice} 
                    isLoading={isGeneratingAdvice}
                    className="bg-brand-500 hover:bg-brand-600 text-white border-none px-8"
                  >
                    Analiz Et
                  </Button>
                </div>
              </Card>

              {advice && (
                <div className="space-y-4">
                  <div className="flex justify-end gap-3">
                    {!profile?.notion_token ? (
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex gap-2">
                          <Button onClick={connectNotion} variant="secondary" className="border-brand-200 text-brand-700">
                            <img src="https://www.notion.so/images/logo-ios.png" className="w-4 h-4" alt="notion" />
                            Notion'ı Bağla
                          </Button>
                          <Button onClick={() => setShowManualNotion(!showManualNotion)} variant="ghost" className="text-xs">
                            Veya Secret Gir
                          </Button>
                        </div>
                        {showManualNotion && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm"
                          >
                            <input 
                              type="password"
                              placeholder="secret_..."
                              value={manualNotionToken}
                              onChange={(e) => setManualNotionToken(e.target.value)}
                              className="text-xs p-2 border border-slate-200 rounded-lg w-48 focus:ring-2 focus:ring-brand-500 outline-none"
                            />
                            <Button onClick={saveManualNotionToken} className="text-xs px-3">Kaydet</Button>
                          </motion.div>
                        )}
                      </div>
                    ) : (
                      <Button 
                        onClick={exportToNotion} 
                        isLoading={isExportingToNotion}
                        variant="secondary"
                        className="border-brand-200 text-brand-700"
                      >
                        <img src="https://www.notion.so/images/logo-ios.png" className="w-4 h-4" alt="notion" />
                        Notion'a Ekle
                      </Button>
                    )}
                  </div>
                  <Card title="AI Tavsiyeleri" icon={Sparkles}>
                    <div className="markdown-body">
                      <Markdown>{advice.fullMarkdown}</Markdown>
                    </div>
                  </Card>
                </div>
              )}

              {!advice && !isGeneratingAdvice && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <BrainCircuit size={64} className="mb-4 opacity-20" />
                  <p className="italic">Analiz sonuçları burada görünecek.</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-2xl mx-auto"
            >
              <Card title="Kişisel Bilgiler" icon={User}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Ad Soyad</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none"
                      value={profile?.full_name}
                      onChange={e => setProfile(p => p ? {...p, full_name: e.target.value} : null)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Mevcut Rol</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none"
                        value={profile?.current_role}
                        onChange={e => setProfile(p => p ? {...p, current_role: e.target.value} : null)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Hedef Rol</label>
                      <input 
                        type="text" 
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none"
                        value={profile?.target_role}
                        onChange={e => setProfile(p => p ? {...p, target_role: e.target.value} : null)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Biyografi</label>
                    <textarea 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none h-32"
                      value={profile?.bio}
                      onChange={e => setProfile(p => p ? {...p, bio: e.target.value} : null)}
                    />
                  </div>
                  <Button className="w-full" onClick={async () => {
                    await fetch('/api/profile', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(profile)
                    });
                    alert('Profil güncellendi!');
                  }}>Değişiklikleri Kaydet</Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
