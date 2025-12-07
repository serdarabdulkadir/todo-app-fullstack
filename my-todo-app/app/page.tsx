"use client";
import { useState, useEffect } from "react";
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

type Todo = { _id: string; text: string; completed: boolean; };
const API_URL = "http://localhost:5001"; 
const GOOGLE_CLIENT_ID = "845413910676-7u28570rarcg6rrjjth69a8napcusf45.apps.googleusercontent.com";

export default function Home() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AppContent />
    </GoogleOAuthProvider>
  );
}

function AppContent() {
  // Yeni view eklendi: "verify-email"
  const [view, setView] = useState<"login" | "register" | "todo" | "forgot-password" | "verify-email">("login");
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetCode, setResetCode] = useState("");
  const [verificationCode, setVerificationCode] = useState(""); // Kayıt doğrulama kodu
  const [timer, setTimer] = useState(0); 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState(""); 
  const [currentUser, setCurrentUser] = useState(""); 
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

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

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
        const res = await fetch(`${API_URL}/google-login`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: credentialResponse.credential }),
        });
        const data = await res.json();
        if (res.ok) { setCurrentUser(data.user.email); setView("todo"); } 
        else { setError("Google girişi başarısız oldu."); }
    } catch (err) { setError("Bağlantı hatası."); }
  };

  // --- 1. KAYIT OLMA (Mail Gönderir) ---
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setError(""); setSuccessMsg("");
    if(password.length < 6) { setError("En az 6 karakter!"); return; }
    try {
      const res = await fetch(`${API_URL}/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }), });
      const data = await res.json();
      
      if (res.ok) { 
          setSuccessMsg(data.message); 
          // Başarılıysa Doğrulama Ekranına Git
          setTimeout(() => {
              setView("verify-email");
              setSuccessMsg("");
          }, 1500); 
      } else { setError(data.message); }
    } catch (err) { setError("Hata oluştu."); }
  };

  // --- 2. MAİL DOĞRULAMA (YENİ) ---
  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccessMsg("");
    try {
        const res = await fetch(`${API_URL}/verify-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, code: verificationCode }),
        });
        const data = await res.json();

        if (res.ok) {
            setSuccessMsg(data.message);
            setTimeout(() => {
                setView("login"); // Doğrulama bitince Girişe at
                setVerificationCode("");
                setSuccessMsg("");
            }, 2000);
        } else { setError(data.message); }
    } catch (err) { setError("Sunucu hatası."); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(`${API_URL}/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }), });
      const data = await res.json();
      if (res.ok) { setCurrentUser(data.user.email); setView("todo"); } else { setError(data.message); }
    } catch (err) { setError("Hata"); }
  };

  // Şifre Sıfırlama Fonksiyonları
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault(); if (timer > 0) return;
    setError(""); setSuccessMsg("");
    try {
        const res = await fetch(`${API_URL}/forgot-password`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (res.ok) { setSuccessMsg(data.message); setResetStep(2); setTimer(120); setNewPassword(""); } else { setError(data.message); }
    } catch (err) { setError("Sunucu hatası."); }
  };

  const handleVerifyReset = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSuccessMsg("");
    if(newPassword.length < 6) { setError("En az 6 karakter!"); return; }
    try {
        const res = await fetch(`${API_URL}/reset-password-verify`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, code: resetCode, newPassword }),
        });
        const data = await res.json();
        if (res.ok) { setSuccessMsg(data.message); setTimeout(() => { setView("login"); setResetStep(1); setPassword(""); setResetCode(""); setTimer(0); }, 2000); } else { setError(data.message); }
    } catch (err) { setError("Sunucu hatası."); }
  };

  const logout = () => { setView("login"); setTodos([]); setCurrentUser(""); setEmail(""); setPassword(""); };

  // --- EKRANLAR ---

  // YENİ: HESAP DOĞRULAMA EKRANI
  if (view === "verify-email") {
    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-2 text-center">Hesabı Doğrula</h2>
          <p className="text-gray-400 text-center mb-6 text-sm">{email} adresine gelen kodu gir.</p>
          
          {error && <div className="bg-red-500/20 text-red-200 p-3 rounded mb-4 text-sm text-center">{error}</div>}
          {successMsg && <div className="bg-green-500/20 text-green-200 p-3 rounded mb-4 text-sm text-center">{successMsg}</div>}
          
          <form onSubmit={handleVerifyEmail} className="space-y-4">
            <input type="text" placeholder="Doğrulama Kodu" value={verificationCode} onChange={e => setVerificationCode(e.target.value)} className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 outline-none text-center text-xl tracking-widest" required />
            <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition">Doğrula ve Giriş Yap</button>
          </form>
          <p className="mt-6 text-center text-gray-400 text-sm"><button onClick={() => setView("login")} className="text-blue-400 hover:text-blue-300 font-semibold">← İptal</button></p>
        </div>
      </div>
    );
  }

  // ŞİFRE SIFIRLAMA
  if (view === "forgot-password") {
    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-2 text-center">Şifre Sıfırla</h2>
          {error && <div className="bg-red-500/20 text-red-200 p-3 rounded mb-4 text-sm text-center">{error}</div>}
          {successMsg && <div className="bg-green-500/20 text-green-200 p-3 rounded mb-4 text-sm text-center">{successMsg}</div>}
          {resetStep === 1 ? (
              <form onSubmit={handleSendCode} className="space-y-4">
                  <p className="text-gray-400 text-center mb-4 text-sm">Doğrulama kodu almak için e-postanızı girin.</p>
                  <input type="email" placeholder="E-posta" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 outline-none" required />
                  <button type="submit" disabled={timer > 0} className={`w-full font-bold py-3 rounded-lg transition ${timer > 0 ? "bg-gray-600 cursor-not-allowed text-gray-300" : "bg-blue-600 hover:bg-blue-700 text-white"}`}>{timer > 0 ? `Tekrar Gönder (${formatTime(timer)})` : "Kod Gönder"}</button>
              </form>
          ) : (
              <form onSubmit={handleVerifyReset} className="space-y-4">
                  <p className="text-gray-400 text-center mb-4 text-sm">Gelen 6 haneli kodu girin.</p>
                  <input type="text" placeholder="Kod (Örn: 123456)" value={resetCode} onChange={e => setResetCode(e.target.value)} className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 outline-none text-center text-xl tracking-widest" required />
                  <input type="password" placeholder="Yeni Şifre" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 outline-none" required />
                  <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition">Değiştir</button>
                  <button type="button" onClick={handleSendCode} disabled={timer > 0} className={`w-full text-sm py-2 rounded border border-gray-600 transition ${timer > 0 ? "text-gray-500 cursor-not-allowed" : "text-blue-400 hover:text-blue-300"}`}>{timer > 0 ? `Bekle: ${formatTime(timer)}` : "Tekrar Gönder"}</button>
              </form>
          )}
          <p className="mt-6 text-center text-gray-400 text-sm"><button onClick={() => { setView("login"); setTimer(0); }} className="text-blue-400 hover:text-blue-300 font-semibold">← İptal</button></p>
        </div>
      </div>
    );
  }

  // GİRİŞ YAP
  if (view === "login") {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-700">
          <h2 className="text-3xl font-bold text-white mb-2 text-center">Giriş Yap</h2>
          {error && <div className="bg-red-500/20 text-red-200 p-3 rounded mb-4 text-sm text-center">{error}</div>}
          {successMsg && <div className="bg-green-500/20 text-green-200 p-3 rounded mb-4 text-sm text-center">{successMsg}</div>}
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="email" placeholder="E-posta" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 outline-none" required />
            <input type="password" placeholder="Şifre" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 outline-none" required />
            <div className="flex justify-end"><button type="button" onClick={() => { setView("forgot-password"); setError(""); }} className="text-sm text-gray-400 hover:text-white transition">Şifremi Unuttum?</button></div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition">Giriş Yap</button>
          </form>
          <div className="mt-6 border-t border-gray-700 pt-6">
            <p className="text-center text-gray-400 text-sm mb-4">veya şununla devam et</p>
            <div className="flex justify-center"><GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setError("Google Girişi Başarısız")} theme="filled_black" shape="pill" text="signin_with" width="100%" /></div>
          </div>
          <p className="mt-6 text-center text-gray-400 text-sm">Hesabın yok mu? <button onClick={() => setView("register")} className="text-blue-400 font-semibold ml-1">Kayıt Ol</button></p>
        </div>
      </div>
    );
  }

  // KAYIT OL
  if (view === "register") {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-700">
          <h2 className="text-3xl font-bold text-white mb-2 text-center">Kayıt Ol</h2>
          {error && <div className="bg-red-500/20 text-red-200 p-3 rounded mb-4 text-sm text-center">{error}</div>}
          <form onSubmit={handleRegister} className="space-y-4">
            <input type="email" placeholder="E-posta (Hotmail, Outlook, Gmail...)" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 outline-none" required />
            <input type="password" placeholder="Şifre (Min 6 karakter)" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 outline-none" required />
            <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition">Hesap Oluştur</button>
          </form>
          <div className="mt-6 border-t border-gray-700 pt-6">
            <p className="text-center text-gray-400 text-sm mb-4">veya şununla kayıt ol</p>
            <div className="flex justify-center"><GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setError("Google Girişi Başarısız")} theme="filled_black" shape="pill" text="signup_with" width="100%" /></div>
          </div>
          <p className="mt-6 text-center text-gray-400 text-sm">Zaten üye misin? <button onClick={() => { setView("login"); setError(""); setSuccessMsg(""); }} className="text-blue-400 font-semibold ml-1">Giriş Yap</button></p>
        </div>
      </div>
    );
  }

  // TODO LISTESİ
  return (
    <div className="min-h-screen bg-gray-900 text-white flex justify-center p-4 font-sans">
      <div className="w-full max-w-2xl mt-10">
        <div className="flex justify-between items-center mb-8 bg-gray-800 p-4 rounded-xl border border-gray-700">
          <div><h1 className="text-xl font-bold">Yapılacaklar</h1><p className="text-xs text-gray-400 mt-1">{currentUser}</p></div>
          <button onClick={logout} className="text-red-400 hover:bg-red-500 hover:text-white px-4 py-2 rounded-lg text-sm border border-red-500/20 transition">Çıkış</button>
        </div>
        <form onSubmit={addTodo} className="flex gap-3 mb-8">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Bugün ne yapacaksın?" className="flex-1 p-4 rounded-xl bg-gray-800 border border-gray-700 focus:border-blue-500 outline-none text-lg" />
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 px-8 rounded-xl font-bold text-white transition">Ekle</button>
        </form>
        <div className="space-y-3">
          {todos.map((t) => (
            <div key={t._id} className={`flex justify-between items-center p-4 rounded-xl border transition ${t.completed ? "bg-gray-800/40 border-gray-800 opacity-60" : "bg-gray-800 border-gray-700"}`}>
              <div onClick={() => toggleTodo(t._id)} className="flex items-center gap-4 cursor-pointer flex-1">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${t.completed ? "border-green-500 bg-green-500" : "border-gray-500"}`}>{t.completed && "✓"}</div>
                <span className={`text-lg transition ${t.completed ? "line-through text-gray-500" : "text-gray-100"}`}>{t.text}</span>
              </div>
              <button onClick={() => deleteTodo(t._id)} className="text-gray-500 hover:text-red-400 p-2">Sil</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}