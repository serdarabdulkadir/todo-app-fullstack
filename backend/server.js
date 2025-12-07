const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');

const app = express();
const PORT = process.env.PORT || 5001;

// CORS
app.use(cors({ origin: '*' }));
app.use(express.json());

// --- AYARLAR ---
const MONGO_URI = "mongodb+srv://abdulkadirserdar04_db_user:aS45tmHOktEGMpXS@todo1.shf92iz.mongodb.net/?appName=Todo1";

const GOOGLE_CLIENT_ID = "994601849494-njuqo1lqadg2jsm05dgmhhh9qu3icbrd.apps.googleusercontent.com";
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// ⚠️ BURAYA HOTMAIL/OUTLOOK MAİLİNİ VE ŞİFRENİ YAZ
const MY_EMAIL = "abdulcoder@hotmail.com"; // Buraya Hotmail adresini yaz
const MY_PASSWORD = "CoderGenc.1017";       // Buraya normal Hotmail giriş şifreni yaz

// --- OUTLOOK / HOTMAIL AYARI (Render Dostu) ---
const transporter = nodemailer.createTransport({
    host: "smtp-mail.outlook.com", // Microsoft Sunucusu
    port: 587,
    secure: false, // TLS kullanır
    auth: {
        user: MY_EMAIL,
        pass: MY_PASSWORD
    },
    tls: {
        ciphers: 'SSLv3', // Bağlantı sorunlarını çözer
        rejectUnauthorized: false
    },
    debug: true, // Hata varsa görelim
    logger: true
});

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB Bağlı!"))
    .catch((err) => console.error("❌ Hata:", err));

// --- ŞEMALAR ---
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false },
    resetCode: { type: String, default: "" },
    verificationCode: { type: String, default: "" },
    isVerified: { type: Boolean, default: false },
    authType: { type: String, default: "local" } 
});
const User = mongoose.model('User', UserSchema);

const TodoSchema = new mongoose.Schema({
    text: { type: String, required: true },
    completed: { type: Boolean, default: false },
    userEmail: { type: String, required: true }
});
const Todo = mongoose.model('Todo', TodoSchema);

// --- ROTALAR ---

// 1. KAYIT OL
app.post('/register', async (req, res) => {
    const { email, password } = req.body;
    console.log("Kayıt İsteği:", email);

    if (password.length < 6) return res.status(400).json({ message: "Min 6 karakter!" });

    try {
        let user = await User.findOne({ email });
        if (user && user.isVerified) {
            return res.status(400).json({ message: "Bu mail zaten kayıtlı." });
        }

        const vCode = Math.floor(100000 + Math.random() * 900000).toString();

        try {
            console.log("Hotmail ile bağlanılıyor...");
            await transporter.sendMail({
                from: MY_EMAIL, // Gönderen senin Hotmail adresin
                to: email,      // Alıcı kullanıcının girdiği mail (Gmail, Hotmail fark etmez)
                subject: 'Doğrulama Kodu',
                text: `Merhaba,\n\nKodunuz: ${vCode}`
            });
            console.log("✅ Mail Gitti!");

            if (!user) {
                user = new User({ email, password, verificationCode: vCode, isVerified: false });
            } else {
                user.password = password;
                user.verificationCode = vCode;
            }
            await user.save();
            
            res.status(201).json({ message: "Kod gönderildi." });

        } catch (mailError) {
            console.error("❌ Mail Hatası:", mailError);
            res.status(500).json({ message: "Mail sunucusuna bağlanılamadı." });
        }

    } catch (e) { res.status(500).json({ message: "Sunucu hatası" }); }
});

// 2. MAİL DOĞRULAMA
app.post('/verify-email', async (req, res) => {
    const { email, code } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Kullanıcı bulunamadı." });
        if (user.verificationCode !== code) return res.status(400).json({ message: "Hatalı kod!" });
        user.isVerified = true; user.verificationCode = ""; await user.save();
        res.json({ message: "Hesap doğrulandı!" });
    } catch (error) { res.status(500).json({ message: "Hata oluştu." }); }
});

// 3. GİRİŞ YAP
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email, password });
        if (!user) return res.status(401).json({ message: "Hatalı bilgi!" });
        if (user.authType === "local" && !user.isVerified) return res.status(403).json({ message: "Önce mailini doğrula." });
        res.json({ message: "Giriş OK", user: { email: user.email } });
    } catch (err) { res.status(500).json({ message: "Sunucu hatası" }); }
});

// 4. GOOGLE GİRİŞ
app.post('/google-login', async (req, res) => {
    const { token } = req.body;
    try {
        const ticket = await googleClient.verifyIdToken({ idToken: token, audience: GOOGLE_CLIENT_ID });
        const { email } = ticket.getPayload();
        let user = await User.findOne({ email });
        if (!user) {
            user = new User({ email, password: "", authType: "google", isVerified: true });
            await user.save();
        } else if (!user.isVerified) { user.isVerified = true; await user.save(); }
        res.json({ message: "Google Girişi Başarılı", user: { email: user.email } });
    } catch (error) { res.status(400).json({ message: "Google hatası." }); }
});

// -- ŞİFRE İŞLEMLERİ --
app.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "Kullanıcı yok!" });
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetCode = code; await user.save();
        
        await transporter.sendMail({ from: MY_EMAIL, to: email, subject: 'Kod', text: `Kod: ${code}` });
        res.json({ message: "Kod gönderildi!" });
    } catch (error) { res.status(500).json({ message: "Mail hatası." }); }
});

app.post('/reset-password-verify', async (req, res) => {
    const { email, code, newPassword } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user || user.resetCode !== code) return res.status(400).json({ message: "Hatalı kod!" });
        user.password = newPassword; user.resetCode = ""; await user.save();
        res.json({ message: "Şifre değiştirildi!" });
    } catch (error) { res.status(500).json({ message: "Hata" }); }
});

// TODO İŞLEMLERİ
app.get('/todos', async (req, res) => {
    const { email } = req.query; if (!email) return res.json([]);
    const todos = await Todo.find({ userEmail: email }); res.json(todos);
});
app.post('/todos', async (req, res) => {
    const { text, userEmail } = req.body; if(!userEmail) return res.status(400).json({error: "Giriş"});
    const todo = new Todo({ text, userEmail, completed: false }); await todo.save(); res.status(201).json(todo);
});
app.delete('/todos/:id', async (req, res) => { await Todo.findByIdAndDelete(req.params.id); res.json({ msg: "Silindi" }); });
app.put('/todos/:id', async (req, res) => {
    const todo = await Todo.findById(req.params.id);
    if(todo){ todo.completed = !todo.completed; await todo.save(); res.json(todo);}
});

app.listen(PORT, () => { console.log(`Sunucu çalışıyor: http://localhost:${PORT}`); });