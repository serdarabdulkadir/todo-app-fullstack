"use client";
import { useState, useEffect } from "react";
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

// --- AYARLAR ---
// Kendi Backend adresini buraya yapıştır (Sonunda / olmasın)
const API_URL = "https://todo-backend-api-zfln.onrender.com"; 
// Google Client ID'ni buraya yapıştır
const GOOGLE_CLIENT_ID = "994601849494-njuqo1lqadg2jsm05dgmhhh9qu3icbrd.apps.googleusercontent.com";

type Todo = { _id: string; text: string; completed: boolean; };

export default function Home() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-blue-500 selection:text-white">
        <AppContent />
      </div>
    </GoogleOAuthProvider>
  );
}

function AppContent() {
  const [view, setView] = useState<"login" | "register" | "todo" | "forgot-password" | "verify-email">("login");
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetCode, setResetCode] = useState("");
  const [verificationCode, setVerificationCode] = useState(""); 
  const [timer, setTimer] = useState(0); 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState(""); 
  const [currentUser, setCurrentUser] = useState(""); 
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Sayaç Mantığı
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) { interval = setInterval(() => { setTimer((prev) => prev - 1); }, 1000); }
    return () => clearInterval(interval);
  }, [timer]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  useEffect(() => { if (currentUser) fetchTodos(); }, [currentUser]);

  // --- API FONKSİYONLARI ---
  const fetchTodos = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`${API_URL}/todos?email=${currentUser}`);
      const data = await res.json();
      setTodos(data);
    } catch (e) { console.error("Hata:", e); }
  };

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault(); if (!input.trim()) return;
    const res = await fetch(`${API_URL}/todos`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: input, userEmail: currentUser }),
    });
    if (res.ok) { setInput(""); fetchTodos(); }
  };

  const deleteTodo = async (id: string) => { await fetch(`${API_URL}/todos/${id}`, { method: "DELETE" }); fetchTodos(); };
  const toggleTodo = async (id: string) => { await fetch(`${API_URL}/todos/${id}`, { method: "PUT" }); fetchTodos(); };

  // --- AUTH İŞLEMLERİ ---
  const handleGoogleSuccess = async (credentialResponse: any) => {
    setLoading(true);
    try {
        const res = await fetch(`${API_URL}/google-login`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: credentialResponse.credential }),
        });
        const data = await res.json();
        if (res.ok) { setCurrentUser(data.user.email); setView("todo"); } 
        else { setError("Google girişi başarısız."); }
    } catch (err) { setError("Bağlantı hatası."); }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSuccessMsg(""); setLoading(true);
    if(password.length < 6) { setError("Şifre en az 6 karakter olmalı."); setLoading(false); return; }
    try {
      const res = await fetch(`${API_URL}/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }), });
      const data = await res.json();
      if (res.ok) { 
          setSuccessMsg(data.message); 
          setTimeout(() => { setView("verify-email"); setSuccessMsg(""); }, 1500); 
      } else { setError(data.message); }
    } catch (err) { setError("Sunucu hatası."); }
    setLoading(false);
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSuccessMsg(""); setLoading(true);
    try {
        const res = await fetch(`${API_URL}/verify-email`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code: verificationCode }),
        });
        const data = await res.json();
        if (res.ok) { setSuccessMsg(data.message); setTimeout(() => { setView("login"); setVerificationCode(""); setSuccessMsg(""); }, 2000); } 
        else { setError(data.message); }
    } catch (err) { setError("Sunucu hatası."); }
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const res = await fetch(`${API_URL}/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }), });
      const data = await res.json();
      if (res.ok) { setCurrentUser(data.user.email); setView("todo"); } else { setError(data.message); }
    } catch (err) { setError("Hata oluştu."); }
    setLoading(false);
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault(); if (timer > 0) return; setError(""); setSuccessMsg(""); setLoading(true);
    try {
        const res = await fetch(`${API_URL}/forgot-password`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (res.ok) { setSuccessMsg(data.message); setResetStep(2); setTimer(120); setNewPassword(""); } else { setError(data.message); }
    } catch (err) { setError("Sunucu hatası."); }
    setLoading(false);
  };

  const handleVerifyReset = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSuccessMsg(""); setLoading(true);
    if(newPassword.length < 6) { setError("En az 6 karakter!"); setLoading(false); return; }
    try {
        const res = await fetch(`${API_URL}/reset-password-verify`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code: resetCode, newPassword }),
        });
        const data = await res.json();
        if (res.ok) { setSuccessMsg(data.message); setTimeout(() => { setView("login"); setResetStep(1); setPassword(""); setResetCode(""); setTimer(0); }, 2000); } else { setError(data.message); }
    } catch (err) { setError("Sunucu hatası."); }
    setLoading(false);
  };

  const logout = () => { setView("login"); setTodos([]); setCurrentUser(""); setEmail(""); setPassword(""); };

  // --- ORTAK BİLEŞENLER (Tasarım Tutarlılığı İçin) ---
  const Container = ({ children, title }: { children: React.ReactNode, title: string }) => (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md bg-[#1e293b] rounded-3xl shadow-2xl overflow-hidden border border-slate-700/50">
        <div className="bg-[#334155]/30 p-6 text-center border-b border-slate-700/50">
            <h2 className="text-2xl font-bold text-white tracking-wide">{title}</h2>
        </div>
        <div className="p-8">
            {children}
        </div>
      </div>
    </div>
  );

  const Input = (props: any) => (
    <input {...props} className="w-full p-4 rounded-xl bg-[#0f172a] text-white border border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-500" />
  );

  const Button = ({ children, disabled, onClick, type = "submit", variant = "primary" }: any) => {
    const baseStyle = "w-full py-4 rounded-xl font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";
    const variants = {
        primary: "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20",
        secondary: "bg-slate-700 hover:bg-slate-600 text-slate-200",
        danger: "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
    };
    return (
        <button type={type} disabled={disabled || loading} onClick={onClick} className={`${baseStyle} ${variants[variant as keyof typeof variants]}`}>
            {loading ? <span className="animate-pulse">İşleniyor...</span> : children}
        </button>
    );
  };

  const Message = () => (
    <>
      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-xl mb-6 text-sm text-center animate-fade-in">{error}</div>}
      {successMsg && <div className="bg-green-500/10 border border-green-500/20 text-green-200 p-4 rounded-xl mb-6 text-sm text-center animate-fade-in">{successMsg}</div>}
    </>
  );

  // --- GÖRÜNÜMLER ---

  if (view === "verify-email") {
    return (
      <Container title="Doğrulama">
        <p className="text-slate-400 text-center mb-8 text-sm leading-relaxed">{email}<br/>adresine gelen kodu gir.</p>
        <Message />
        <form onSubmit={handleVerifyEmail} className="space-y-6">
          <Input type="text" placeholder="Gelen Kod" value={verificationCode} onChange={(e:any) => setVerificationCode(e.target.value)} className="w-full p-4 rounded-xl bg-[#0f172a] text-white border border-slate-700 focus:border-blue-500 outline-none text-center text-2xl tracking-[0.5em] font-mono" />
          <Button>Doğrula ve Başla</Button>
        </form>
        <div className="mt-6 text-center"><button onClick={() => setView("login")} className="text-sm text-slate-500 hover:text-white transition">Geri Dön</button></div>
      </Container>
    );
  }

  if (view === "forgot-password") {
    return (
      <Container title="Şifre Sıfırla">
        <Message />
        {resetStep === 1 ? (
            <form onSubmit={handleSendCode} className="space-y-6">
                <p className="text-slate-400 text-center mb-2 text-sm">E-posta adresini gir, kod gönderelim.</p>
                <Input type="email" placeholder="E-posta" value={email} onChange={(e:any) => setEmail(e.target.value)} required />
                <Button disabled={timer > 0}>{timer > 0 ? `Tekrar (${formatTime(timer)})` : "Kod Gönder"}</Button>
            </form>
        ) : (
            <form onSubmit={handleVerifyReset} className="space-y-6">
                <Input type="text" placeholder="Gelen Kod" value={resetCode} onChange={(e:any) => setResetCode(e.target.value)} className="w-full p-4 rounded-xl bg-[#0f172a] text-white border border-slate-700 focus:border-blue-500 outline-none text-center text-2xl tracking-[0.5em] font-mono" required />
                <Input type="password" placeholder="Yeni Şifre" value={newPassword} onChange={(e:any) => setNewPassword(e.target.value)} required />
                <Button>Şifreyi Güncelle</Button>
                <button type="button" onClick={handleSendCode} disabled={timer > 0} className="w-full text-xs text-slate-500 hover:text-blue-400 mt-2">{timer > 0 ? `Bekle: ${formatTime(timer)}` : "Kodu Tekrar Gönder"}</button>
            </form>
        )}
        <div className="mt-8 text-center"><button onClick={() => { setView("login"); setTimer(0); }} className="text-sm text-slate-500 hover:text-white transition">İptal</button></div>
      </Container>
    );
  }

  if (view === "login") {
    return (
      <Container title="Hoş Geldin">
        <Message />
        <form onSubmit={handleLogin} className="space-y-5">
          <Input type="email" placeholder="E-posta" value={email} onChange={(e:any) => setEmail(e.target.value)} required />
          <Input type="password" placeholder="Şifre" value={password} onChange={(e:any) => setPassword(e.target.value)} required />
          <div className="flex justify-end"><button type="button" onClick={() => { setView("forgot-password"); setError(""); }} className="text-xs text-slate-400 hover:text-blue-400 transition">Şifremi Unuttum</button></div>
          <Button>Giriş Yap</Button>
        </form>
        
        <div className="my-8 flex items-center gap-4">
            <div className="h-[1px] bg-slate-700 flex-1"></div>
            <span className="text-slate-500 text-xs uppercase tracking-wider">veya</span>
            <div className="h-[1px] bg-slate-700 flex-1"></div>
        </div>

        <div className="flex justify-center">
            <div className="w-full overflow-hidden rounded-xl bg-white/5 p-1">
                <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setError("Google Hatası")} theme="filled_black" shape="pill" text="signin_with" width="100%" />
            </div>
        </div>
        
        <p className="mt-8 text-center text-slate-400 text-sm">Hesabın yok mu? <button onClick={() => setView("register")} className="text-blue-400 font-bold hover:text-blue-300 ml-1">Kayıt Ol</button></p>
      </Container>
    );
  }

  if (view === "register") {
    return (
      <Container title="Hesap Oluştur">
        <Message />
        <form onSubmit={handleRegister} className="space-y-5">
          <Input type="email" placeholder="E-posta" value={email} onChange={(e:any) => setEmail(e.target.value)} required />
          <Input type="password" placeholder="Şifre" value={password} onChange={(e:any) => setPassword(e.target.value)} required />
          <Button variant="primary">Kayıt Ol</Button>
        </form>
        
        <div className="my-8 flex items-center gap-4">
            <div className="h-[1px] bg-slate-700 flex-1"></div>
            <span className="text-slate-500 text-xs uppercase tracking-wider">veya</span>
            <div className="h-[1px] bg-slate-700 flex-1"></div>
        </div>

        <div className="flex justify-center">
             <div className="w-full overflow-hidden rounded-xl bg-white/5 p-1">
                <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setError("Google Hatası")} theme="filled_black" shape="pill" text="signup_with" width="100%" />
            </div>
        </div>
        
        <p className="mt-8 text-center text-slate-400 text-sm">Zaten üye misin? <button onClick={() => { setView("login"); setError(""); setSuccessMsg(""); }} className="text-blue-400 font-bold hover:text-blue-300 ml-1">Giriş Yap</button></p>
      </Container>
    );
  }

  // --- TODO EKRANI (MOBİL UYUMLU LİSTE) ---
  return (
    <div className="max-w-xl mx-auto min-h-screen flex flex-col p-4">
      {/* Üst Bilgi */}
      <div className="flex justify-between items-center py-6 mb-4">
        <div>
            <h1 className="text-3xl font-bold text-white">Görevler</h1>
            <p className="text-slate-400 text-xs mt-1 truncate max-w-[200px]">{currentUser}</p>
        </div>
        <button onClick={logout} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-sm transition border border-slate-700">Çıkış</button>
      </div>

      {/* Todo Ekleme Inputu */}
      <form onSubmit={addTodo} className="relative mb-8 group">
        <input 
            type="text" 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder="Bugün ne yapacaksın?" 
            className="w-full p-5 pr-16 rounded-2xl bg-[#1e293b] text-white border border-slate-700 shadow-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-lg transition-all" 
        />
        <button 
            type="submit" 
            className="absolute right-3 top-3 bottom-3 bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-xl font-bold shadow-lg shadow-blue-900/50 transition-all active:scale-95"
        >
            +
        </button>
      </form>

      {/* Liste */}
      <div className="flex-1 space-y-3 pb-20">
        {todos.length === 0 ? (
            <div className="text-center text-slate-600 mt-20">
                <div className="text-6xl mb-4">📝</div>
                <p>Henüz bir görev yok.</p>
            </div>
        ) : (
            todos.map((t) => (
                <div key={t._id} className={`group flex items-center p-4 rounded-2xl border transition-all duration-300 ${t.completed ? "bg-[#1e293b]/50 border-slate-800/50 opacity-60" : "bg-[#1e293b] border-slate-700 hover:border-slate-600 hover:shadow-lg hover:shadow-black/20"}`}>
                
                {/* Checkbox Alanı */}
                <div onClick={() => toggleTodo(t._id)} className="cursor-pointer p-2">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${t.completed ? "border-green-500 bg-green-500 text-white scale-110" : "border-slate-500 hover:border-blue-400"}`}>
                        {t.completed && <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                    </div>
                </div>

                {/* Yazı */}
                <span onClick={() => toggleTodo(t._id)} className={`flex-1 ml-3 text-lg cursor-pointer select-none transition-all ${t.completed ? "line-through text-slate-500" : "text-slate-100"}`}>
                    {t.text}
                </span>

                {/* Sil Butonu (Mobilde hep görünür, masaüstünde hover) */}
                <button onClick={() => deleteTodo(t._id)} className="p-3 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
                </div>
            ))
        )}
      </div>
    </div>
  );
}