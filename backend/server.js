const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

// --- AYARLAR ---
const MONGO_URI = "mongodb+srv://abdulkadirserdar04_db_user:aS45tmHOktEGMpXS@todo1.shf92iz.mongodb.net/?appName=Todo1";

// Google Client ID
const GOOGLE_CLIENT_ID = "994601849494-njuqo1lqadg2jsm05dgmhhh9qu3icbrd.apps.googleusercontent.com";
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Mail Ayarları
const MY_GMAIL = "serdarabdulkadir044@gmail.com"; 
const MY_APP_PASSWORD = "tjdhhxilmvxixrqz"; 

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: MY_GMAIL, pass: MY_APP_PASSWORD }
});

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB Bağlı!"))
    .catch((err) => console.error("❌ Hata:", err));

// --- ŞEMALAR ---
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false },
    resetCode: { type: String, default: "" },     // Şifre sıfırlama kodu
    verificationCode: { type: String, default: "" }, // Kayıt doğrulama kodu (YENİ)
    isVerified: { type: Boolean, default: false },   // Hesap onaylı mı? (YENİ)
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

// 1. KAYIT OL (Doğrulama Kodu Gönderir)
app.post('/register', async (req, res) => {
    const { email, password } = req.body;
    if (password.length < 6) return res.status(400).json({ message: "Min 6 karakter!" });

    try {
        let user = await User.findOne({ email });

        // Eğer kullanıcı varsa ve zaten onaylıysa hata ver
        if (user && user.isVerified) {
            return res.status(400).json({ message: "Bu mail zaten kayıtlı." });
        }

        // 6 Haneli Kod Üret
        const vCode = Math.floor(100000 + Math.random() * 900000).toString();

        if (!user) {
            // Yeni kullanıcı oluştur (Onaysız)
            user = new User({ email, password, verificationCode: vCode, isVerified: false });
        } else {
            // Kullanıcı var ama onaysız ise şifreyi ve kodu güncelle
            user.password = password;
            user.verificationCode = vCode;
        }

        await user.save();

        // Mail Gönder
        try {
            await transporter.sendMail({
                from: MY_GMAIL,
                to: email,
                subject: 'Hesap Doğrulama Kodu',
                text: `Merhaba,\n\nHesabını doğrulamak için kodun: ${vCode}`
            });
            res.status(201).json({ message: "Doğrulama kodu mail adresine gönderildi." });
        } catch (mailError) {
            console.error(mailError);
            res.status(500).json({ message: "Mail gönderilemedi. Geçerli bir mail adresi girin." });
        }

    } catch (e) { res.status(500).json({ message: "Sunucu hatası" }); }
});

// 2. KAYIT DOĞRULAMA (YENİ ROTA)
app.post('/verify-email', async (req, res) => {
    const { email, code } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Kullanıcı bulunamadı." });

        if (user.verificationCode !== code) {
            return res.status(400).json({ message: "Hatalı kod!" });
        }

        user.isVerified = true;       // Hesabı onayla
        user.verificationCode = "";   // Kodu temizle
        await user.save();

        res.json({ message: "Hesap başarıyla doğrulandı! Giriş yapabilirsin." });
    } catch (error) { res.status(500).json({ message: "Hata oluştu." }); }
});

// 3. GİRİŞ YAP (Onay Kontrolü Eklendi)
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email, password });
        
        if (!user) {
            return res.status(401).json({ message: "Hatalı e-posta veya şifre!" });
        }

        // EĞER MAİL DOĞRULANMAMIŞSA GİRİŞE İZİN VERME
        if (user.authType === "local" && !user.isVerified) {
            return res.status(403).json({ message: "Lütfen önce mail adresinizi doğrulayın." });
        }

        res.json({ message: "Giriş OK", user: { email: user.email } });
    } catch (err) { res.status(500).json({ message: "Sunucu hatası" }); }
});

// 4. GOOGLE GİRİŞ (Google zaten onaylı olduğu için direkt verify ediyoruz)
app.post('/google-login', async (req, res) => {
    const { token } = req.body;
    try {
        const ticket = await googleClient.verifyIdToken({ idToken: token, audience: GOOGLE_CLIENT_ID });
        const { email } = ticket.getPayload();
        let user = await User.findOne({ email });
        
        if (!user) {
            // Google ile gelenler otomatik onaylıdır
            user = new User({ email, password: "", authType: "google", isVerified: true });
            await user.save();
        } else if (!user.isVerified) {
            // Eğer daha önce elle kayıt olup onaylamadıysa, Google ile girince onaylayalım
            user.isVerified = true;
            await user.save();
        }
        
        res.json({ message: "Google Girişi Başarılı", user: { email: user.email } });
    } catch (error) { res.status(400).json({ message: "Google hatası." }); }
});

// -- DİĞER ROTALAR (Aynı) --
app.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "Kullanıcı bulunamadı!" });
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetCode = code; await user.save();
        await transporter.sendMail({ from: MY_GMAIL, to: email, subject: 'Şifre Sıfırlama Kodu', text: `Kodunuz: ${code}` });
        res.json({ message: "Kod gönderildi!" });
    } catch (error) { res.status(500).json({ message: "Hata" }); }
});

app.post('/reset-password-verify', async (req, res) => {
    const { email, code, newPassword } = req.body;
    if (newPassword.length < 6) return res.status(400).json({ message: "Min 6 karakter!" });
    try {
        const user = await User.findOne({ email });
        if (!user || user.resetCode !== code) return res.status(400).json({ message: "Hatalı kod!" });
        user.password = newPassword; user.resetCode = ""; await user.save();
        res.json({ message: "Şifre değiştirildi!" });
    } catch (error) { res.status(500).json({ message: "Hata" }); }
});

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