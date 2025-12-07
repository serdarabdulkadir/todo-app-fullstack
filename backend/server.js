const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({ origin: '*' }));
app.use(express.json());

// --- AYARLAR ---
const MONGO_URI = "mongodb+srv://abdulkadirserdar04_db_user:aS45tmHOktEGMpXS@todo1.shf92iz.mongodb.net/?appName=Todo1";
const GOOGLE_CLIENT_ID = "994601849494-njuqo1lqadg2jsm05dgmhhh9qu3icbrd.apps.googleusercontent.com";
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// ⚠️ BURAYI DOLDUR:
const MY_BREVO_EMAIL = "serdarabdulkadir044@gmail.com"; 
// 👇 YENİ ALDIĞIN ŞİFREYİ BURAYA YAPIŞTIR 👇
const MY_BREVO_SMTP_KEY = "xsmtpsib-0fd836276c856813a017dcfa193e46152faa397a95516b4d0f2bb075090c4f60-8vfJtHT5ZzTpenDE"; 

// --- BREVO (PORT 2525 - ÇALIŞAN AYAR) ---
const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 2525,           // Bu port Render'da çalışıyor!
    secure: false,        
    auth: {
        user: MY_BREVO_EMAIL,
        pass: MY_BREVO_SMTP_KEY
    },
    tls: {
        rejectUnauthorized: false
    },
    logger: true,
    debug: true
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

app.post('/register', async (req, res) => {
    const { email, password } = req.body;
    console.log("Kayıt İsteği:", email);

    if (password.length < 6) return res.status(400).json({ message: "Min 6 karakter!" });

    try {
        let user = await User.findOne({ email });
        if (user && user.isVerified) return res.status(400).json({ message: "Bu mail zaten kayıtlı." });

        const vCode = Math.floor(100000 + Math.random() * 900000).toString();

        try {
            console.log("Brevo (2525) ile mail gönderiliyor...");
            
            await transporter.sendMail({
                from: MY_BREVO_EMAIL, 
                to: email,            
                subject: 'Doğrulama Kodu',
                text: `Merhaba,\n\nKodunuz: ${vCode}`
            });
            console.log("✅ Mail Başarıyla Gitti!");

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
            res.status(500).json({ message: "Mail gönderilemedi: " + mailError.message });
        }

    } catch (e) { res.status(500).json({ message: "Sunucu hatası" }); }
});

// (Diğer kodlar aynı, yer kaplamasın diye kısalttım - aynen kalacak)
app.post('/verify-email', async (req, res) => {
    const { email, code } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user || user.verificationCode !== code) return res.status(400).json({ message: "Hatalı kod!" });
        user.isVerified = true; user.verificationCode = ""; await user.save();
        res.json({ message: "Hesap doğrulandı!" });
    } catch (error) { res.status(500).json({ message: "Hata" }); }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email, password });
        if (!user) return res.status(401).json({ message: "Hatalı bilgi!" });
        if (user.authType === "local" && !user.isVerified) return res.status(403).json({ message: "Mail onayı gerekli." });
        res.json({ message: "Giriş OK", user: { email: user.email } });
    } catch (err) { res.status(500).json({ message: "Hata" }); }
});

app.post('/google-login', async (req, res) => {
    const { token } = req.body;
    try {
        const ticket = await googleClient.verifyIdToken({ idToken: token, audience: GOOGLE_CLIENT_ID });
        const { email } = ticket.getPayload();
        let user = await User.findOne({ email });
        if (!user) { user = new User({ email, authType: "google", isVerified: true }); await user.save(); }
        else if (!user.isVerified) { user.isVerified = true; await user.save(); }
        res.json({ message: "Giriş Başarılı", user: { email: user.email } });
    } catch (error) { res.status(400).json({ message: "Google hatası." }); }
});

app.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "Kullanıcı yok!" });
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetCode = code; await user.save();
        await transporter.sendMail({ from: MY_BREVO_EMAIL, to: email, subject: 'Kod', text: `Kod: ${code}` });
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