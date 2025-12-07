"use client";
import { useState, useEffect } from "react";
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

type Todo = { _id: string; text: string; completed: boolean; isOptimistic?: boolean };

// Backend URL
const API_URL = "https://todo-backend-api-zfln.onrender.com"; 
// Backend ile uyumlu ID'yi buraya ekledik
const GOOGLE_CLIENT_ID = "845413910676-7u28570rarcg6rrjjth69a8napcusf45.apps.googleusercontent.com";

// --- UI BİLEŞENLERİ ---

const EyeIcon = ({ show, onClick }: { show: boolean, onClick: () => void }) => (
  <div onClick={onClick} className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer z-10">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400 hover:text-white transition">
      {show ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      )}
    </svg>
  </div>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const EmptyStateIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-24 h-24 text-gray-700 mb-4 opacity-50">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
  </svg>
);

const Toast = ({ error, success }: { error: string, success: string }) => (
  (error || success) ? (
    <div className={`fixed top-5 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-bounce-in transition-all duration-300 ${error ? "bg-red-500 text-white" : "bg-green-500 text-white"}`}>
      <span className="font-medium text-sm">{error || success}</span>
    </div>
  ) : null
);

const Input = ({ type, placeholder, value, onChange, icon }: any) => (
  <div className="relative mb-4">
    <input 
      type={type} 
      placeholder={placeholder} 
      value={value} 
      onChange={onChange} 
      className="appearance-none block w-full px-4 py-3.5 pl-4 bg-gray-800 border border-gray-700 rounded-xl placeholder-gray-500 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-base" 
      required 
    />
    {icon}
  </div>
);

const Button = ({ text, onClick, type = "submit", secondary = false }: any) => (
  <button 
    type={type} 
    onClick={onClick} 
    className={`w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-base font-bold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all ${secondary ? "bg-gray-700 hover:bg-gray-600" : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"}`}
  >
    {text}
  </button>
);

const AuthLayout = ({ title, children, footer, error, success }: any) => (
  <div className="min-h-screen bg-gray-950 flex flex-col justify-center px-4 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
    <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-blue-600/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-purple-600/20 rounded-full blur-3xl"></div>
    </div>
    <Toast error={error} success={success} />
    <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
      <div className="bg-gray-900 py-10 px-6 shadow-2xl rounded-2xl border border-gray-800">
        <h2 className="mb-8 text-center text-3xl font-extrabold text-white tracking-tight">{title}</h2>
        {children}
      </div>
      {footer}
    </div>
  </div>
);

export default function Home() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AppContent />
    </GoogleOAuthProvider>
  );
}

function AppContent() {
  const [view, setView] = useState<"login" | "register" | "todo" | "forgot-password" | "verify-email">("login");
  const [showPassword, setShowPassword] = useState(false);
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
  
  // Hydration hatasını önlemek için client kontrolü
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) { interval = setInterval(() => { setTimer((prev) => prev - 1); }, 1000); }
    return () => clearInterval(interval);
  }, [timer]);

  useEffect(() => { 
    if(error || successMsg) {
      const t = setTimeout(() => { setError(""); setSuccessMsg(""); }, 3000);
      return () => clearTimeout(t);
    }
  }, [error, successMsg]);

  const changeView = (newView: typeof view) => {
    setView(newView); setError(""); setSuccessMsg(""); setShowPassword(false);
  };

  useEffect(() => { if (currentUser) fetchTodos(); }, [currentUser]);

  const fetchTodos = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`${API_URL}/todos?email=${currentUser}`);
      const data = await res.json();
      setTodos(data);
    } catch (e) { console.error(e); }
  };

  // --- CRUD & OPTIMISTIC UI ---
  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault(); if (!input.trim()) return;
    const tempId = Date.now().toString();
    const optimisticTodo: Todo = { _id: tempId, text: input, completed: false, isOptimistic: true };
    const prev = [...todos]; setTodos(p => [optimisticTodo, ...p]); setInput("");
    try {
        const res = await fetch(`${API_URL}/todos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: optimisticTodo.text, userEmail: currentUser }) });
        if(!res.ok) throw new Error();
        const real = await res.json();
        setTodos(p => p.map(t => t._id === tempId ? real : t));
    } catch { setTodos(prev); setInput(optimisticTodo.text); setError("Eklenemedi!"); }
  };

  const deleteTodo = async (id: string) => {
    const prev = [...todos]; setTodos(p => p.filter(t => t._id !== id));
    try {
        const res = await fetch(`${API_URL}/todos/${id}`, { method: "DELETE" });
        if(!res.ok) throw new Error();
    } catch { setTodos(prev); setError("Silinemedi!"); }
  };

  const toggleTodo = async (id: string) => {
    // 1. Durumu yerelde değiştir (Optimistic)
    const prev = [...todos]; 
    setTodos(p => p.map(t => t._id === id ? { ...t, completed: !t.completed } : t));
    try {
        // 2. API'ye gönder
        const res = await fetch(`${API_URL}/todos/${id}`, { method: "PUT" });
        if(!res.ok) throw new Error();
    } catch { 
        // 3. Hata varsa geri al
        setTodos(prev); setError("Güncellenemedi!"); 
    }
  };

  // --- KANBAN SÜRÜKLE BIRAK MANTIĞI ---
  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId) return; // Aynı kolona bırakılırsa işlem yapma

    // Eğer farklı bir kolona bırakıldıysa (Todo -> Done veya tam tersi) toggleTodo çağır
    toggleTodo(draggableId);
  };

  // --- AUTH ---
  const handleGoogle = async (cred: any) => {
    try {
        const res = await fetch(`${API_URL}/google-login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: cred.credential }) });
        const data = await res.json();
        if(res.ok) { setCurrentUser(data.user.email); changeView("todo"); } else setError("Google Girişi Reddedildi");
    } catch (err) { setError("Bağlantı Hatası"); }
  };
  
  const handleAuth = async (e: React.FormEvent, type: "login" | "register") => {
    e.preventDefault(); if(type === "register" && password.length < 6) { setError("Şifre çok kısa!"); return; }
    try {
      const res = await fetch(`${API_URL}/${type}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if(res.ok) {
        if(type === "register") { setSuccessMsg(data.message); setTimeout(() => changeView("verify-email"), 1500); }
        else { setCurrentUser(data.user.email); changeView("todo"); }
      } else setError(data.message);
    } catch { setError("Sunucu Hatası"); }
  };

  const verifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        const res = await fetch(`${API_URL}/verify-email`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code: verificationCode }) });
        if(res.ok) { setSuccessMsg("Doğrulandı!"); setTimeout(() => { changeView("login"); setVerificationCode(""); }, 1500); } 
        else setError("Hatalı Kod");
    } catch { setError("Hata"); }
  };

  const forgotPass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        const res = await fetch(`${API_URL}/forgot-password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
        if(res.ok) { setSuccessMsg("Kod Gönderildi"); setResetStep(2); setTimer(120); } else setError("Hata");
    } catch { setError("Hata"); }
  };

  const resetPass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        const res = await fetch(`${API_URL}/reset-password-verify`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code: resetCode, newPassword }) });
        if(res.ok) { setSuccessMsg("Şifre Değişti!"); setTimeout(() => { changeView("login"); setResetStep(1); }, 2000); } else setError("Hata");
    } catch { setError("Hata"); }
  };

  const logout = () => { changeView("login"); setTodos([]); setCurrentUser(""); setEmail(""); setPassword(""); };

  // --- SAYFALAR ---
  if (view === "verify-email") return (
    <AuthLayout title="Doğrulama" error={error} success={successMsg}>
      <form onSubmit={verifyEmail}>
        <p className="text-gray-400 text-center mb-6 text-sm">Kod <b>{email}</b> adresine gönderildi.</p>
        <Input type="text" placeholder="Gelen Kodu Giriniz" value={verificationCode} onChange={(e:any) => setVerificationCode(e.target.value)} />
        <Button text="Hesabı Doğrula" />
      </form>
      <div className="text-center mt-4"><button onClick={() => changeView("login")} className="text-sm text-gray-500 hover:text-white">İptal Et</button></div>
    </AuthLayout>
  );

  if (view === "forgot-password") return (
    <AuthLayout title="Şifre Sıfırla" error={error} success={successMsg}>
      {resetStep === 1 ? (
        <form onSubmit={forgotPass}>
          <Input type="email" placeholder="E-posta Adresiniz" value={email} onChange={(e:any) => setEmail(e.target.value)} />
          <Button text={timer > 0 ? `Bekleyiniz (${timer})` : "Kod Gönder"} secondary={timer > 0} />
        </form>
      ) : (
        <form onSubmit={resetPass}>
           <Input type="text" placeholder="Onay Kodu" value={resetCode} onChange={(e:any) => setResetCode(e.target.value)} />
           <Input 
             type={showPassword ? "text" : "password"} 
             placeholder="Yeni Şifre" 
             value={newPassword} 
             onChange={(e:any) => setNewPassword(e.target.value)} 
             icon={<EyeIcon show={showPassword} onClick={() => setShowPassword(!showPassword)} />} 
           />
           <Button text="Şifreyi Güncelle" />
        </form>
      )}
      <div className="text-center mt-4"><button onClick={() => { changeView("login"); setTimer(0); }} className="text-sm text-gray-500 hover:text-white">Giriş Ekranına Dön</button></div>
    </AuthLayout>
  );

  if (view === "login" || view === "register") return (
    <AuthLayout title={view === "login" ? "Tekrar Hoşgeldin" : "Hesap Oluştur"} error={error} success={successMsg} footer={
      <p className="mt-6 text-center text-sm text-gray-400">
        {view === "login" ? "Hesabın yok mu?" : "Zaten üye misin?"} <button onClick={() => changeView(view === "login" ? "register" : "login")} className="font-semibold text-blue-500 hover:text-blue-400 ml-1">{view === "login" ? "Kayıt Ol" : "Giriş Yap"}</button>
      </p>
    }>
      <form onSubmit={(e) => handleAuth(e, view)} className="space-y-4">
        <Input type="email" placeholder="E-posta" value={email} onChange={(e:any) => setEmail(e.target.value)} />
        <Input 
          type={showPassword ? "text" : "password"} 
          placeholder="Şifre" 
          value={password} 
          onChange={(e:any) => setPassword(e.target.value)} 
          icon={<EyeIcon show={showPassword} onClick={() => setShowPassword(!showPassword)} />} 
        />
        {view === "login" && <div className="flex justify-end"><button type="button" onClick={() => changeView("forgot-password")} className="text-xs text-gray-400 hover:text-white">Şifremi Unuttum?</button></div>}
        <Button text={view === "login" ? "Giriş Yap" : "Kayıt Ol"} />
      </form>
      <div className="mt-6">
        <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-700"></div></div><div className="relative flex justify-center text-sm"><span className="px-2 bg-gray-900 text-gray-500">veya</span></div></div>
        <div className="mt-6 flex justify-center"><GoogleLogin onSuccess={handleGoogle} onError={() => setError("Google Hatası")} theme="filled_black" shape="pill" width="300px" /></div>
      </div>
    </AuthLayout>
  );

  // --- TODO UYGULAMASI (KANBAN BOARD) ---
  
  if (!enabled) {
    return null; // Sunucu tarafında render hatasını önlemek için
  }

  const todoList = todos.filter(t => !t.completed);
  const doneList = todos.filter(t => t.completed);

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans selection:bg-blue-500/30 pb-20 overflow-x-hidden">
      <Toast error={error} success={successMsg} />
      
      {/* HEADER */}
      <div className="bg-gray-900/50 backdrop-blur-md sticky top-0 z-30 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Kanban Board</h1>
            <p className="text-xs text-gray-400 truncate max-w-[150px]">{currentUser}</p>
          </div>
          <button onClick={logout} className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition text-sm font-medium">Çıkış</button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-6">
        {/* INPUT ALANI */}
        <form onSubmit={addTodo} className="relative mb-8 group max-w-2xl mx-auto">
          <input 
            type="text" 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder="Yeni bir görev kartı oluştur..." 
            className="w-full p-4 pl-5 pr-14 rounded-2xl bg-gray-900 border border-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-lg shadow-lg" 
          />
          <button type="submit" className="absolute right-2 top-2 bottom-2 bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl transition-all shadow-md active:scale-95">
            <PlusIcon />
          </button>
        </form>

        {/* KANBAN BOARD */}
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
            
            {/* YAPILACAKLAR KOLONU */}
            <div className="bg-gray-900/50 p-4 rounded-3xl border border-gray-800 flex flex-col h-fit min-h-[500px]">
              <h3 className="text-xl font-bold mb-4 px-2 text-gray-300 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span> Yapılacaklar <span className="text-sm bg-gray-800 px-2 py-0.5 rounded-full text-gray-500">{todoList.length}</span>
              </h3>
              
              <Droppable droppableId="todo-list">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="flex-1 space-y-3">
                    {todoList.length === 0 && (
                      <div className="h-32 border-2 border-dashed border-gray-800 rounded-2xl flex flex-col items-center justify-center text-gray-600">
                        <p className="text-sm">Görev yok 🎉</p>
                      </div>
                    )}
                    {todoList.map((t, index) => (
                      <Draggable key={t._id} draggableId={t._id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`p-4 rounded-2xl bg-gray-800 border border-gray-700 shadow-sm group hover:border-blue-500/50 transition-colors
                              ${snapshot.isDragging ? "shadow-2xl ring-2 ring-blue-500 rotate-2 z-50 bg-gray-700" : ""}
                              ${t.isOptimistic ? "opacity-50" : "opacity-100"}
                            `}
                          >
                            <div className="flex justify-between items-start gap-3">
                              <p className="text-gray-200 text-lg leading-snug">{t.text}</p>
                              <button onClick={() => deleteTodo(t._id)} className="text-gray-500 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition opacity-0 group-hover:opacity-100">
                                <TrashIcon />
                              </button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>

            {/* TAMAMLANANLAR KOLONU */}
            <div className="bg-gray-900/50 p-4 rounded-3xl border border-gray-800 flex flex-col h-fit min-h-[500px]">
              <h3 className="text-xl font-bold mb-4 px-2 text-gray-300 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500"></span> Tamamlananlar <span className="text-sm bg-gray-800 px-2 py-0.5 rounded-full text-gray-500">{doneList.length}</span>
              </h3>

              <Droppable droppableId="done-list">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="flex-1 space-y-3">
                    {doneList.length === 0 && (
                      <div className="h-32 border-2 border-dashed border-gray-800 rounded-2xl flex flex-col items-center justify-center text-gray-600">
                        <p className="text-sm">Henüz biten iş yok ⏳</p>
                      </div>
                    )}
                    {doneList.map((t, index) => (
                      <Draggable key={t._id} draggableId={t._id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`p-4 rounded-2xl bg-gray-800/40 border border-gray-800 shadow-sm group hover:border-green-500/50 transition-colors
                              ${snapshot.isDragging ? "shadow-2xl ring-2 ring-green-500 rotate-2 z-50 bg-gray-800" : ""}
                              ${t.isOptimistic ? "opacity-50" : "opacity-100"}
                            `}
                          >
                            <div className="flex justify-between items-start gap-3">
                              <p className="text-gray-500 line-through text-lg leading-snug">{t.text}</p>
                              <button onClick={() => deleteTodo(t._id)} className="text-gray-500 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition opacity-0 group-hover:opacity-100">
                                <TrashIcon />
                              </button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>

          </div>
        </DragDropContext>
      </div>
    </div>
  );
}