import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import qrcode from 'qrcode';

dotenv.config();

async function generateQRCode(text) {
    const opts = {
      color: {
        dark: '#000',  // Blue dots
        light: '#0000' // Transparent background
      },
      scale: 5
    };
    const buffer = await qrcode.toBuffer(text, 'image/png', opts);
    return buffer.toString('base64');
  }

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// EJSをビューエンジンとして設定
app.set("view engine", "ejs");
app.set("views", join(__dirname, "views"));

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(join(__dirname, "public")));

mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/ticket-system", {})
  .then(() => {
    console.log("MongoDBに接続されました");
  })
  .catch((error) => {
    console.error("MongoDB接続エラー:", error.message);
  });

// モデル
const Admin = mongoose.model(
  "Admin",
  new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
  })
);

const Ticket = mongoose.model(
  "Ticket",
  new mongoose.Schema({
    ticketNumber: { type: Number, required: true, unique: true },
    issuedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ["待機中", "呼び出し済み"], default: "待機中" },
  })
);

// ミドルウェア: 認証チェック
const isAuthenticated = (req, res, next) => {
  const token = req.cookies.token;
  if (token) {
    next();
  } else {
    res.redirect("/login");
  }
};

// ルート: ホームページ
app.get("/", isAuthenticated, async (req, res) => {
    try {
      const tickets = await Ticket.find();
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      
      // 各チケットに対してQRコードを生成
      const ticketsWithQR = await Promise.all(tickets.map(async ticket => {
        const qrCode = await generateQRCode(`${baseUrl}/tickets/${ticket._id}`);
        return { ...ticket.toObject(), qrCode };
      }));
  
      res.render("index", { tickets: ticketsWithQR, baseUrl });
    } catch (error) {
      res.status(500).render("error", { message: "サーバーエラーが発生しました" });
    }
  });


// ルート: ログインページ
app.get("/login", (req, res) => {
  res.render("login");
});

// ルート: ログイン処理
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.render("login", { error: "メールアドレスまたはパスワードが正しくありません" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.render("login", { error: "メールアドレスまたはパスワードが正しくありません" });
    }

    res.cookie('token', admin._id, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24時間
    });
    res.redirect("/");
  } catch (error) {
    res.status(500).render("error", { message: "サーバーエラーが発生しました" });
  }
});

// ルート: ログアウト
app.get("/logout", (req, res) => {
  res.clearCookie('token');
  res.redirect("/login");
});

// ルート: 新規整理券発行
app.post("/tickets", isAuthenticated, async (req, res) => {
    try {
      const lastTicket = await Ticket.findOne().sort({ ticketNumber: -1 });
      const newTicketNumber = lastTicket ? lastTicket.ticketNumber + 1 : 1;
      const newTicket = new Ticket({
        ticketNumber: newTicketNumber,
        status: "待機中",
        issuedAt: new Date()
      });
      await newTicket.save();
  
      // QRコード生成
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const qrCode = await generateQRCode(`${baseUrl}/tickets/${newTicket._id}`);
  
      // 新規作成したチケットの詳細を表示
      res.render("detail", { ticket: { ...newTicket.toObject(), qrCode } });
    } catch (error) {
      console.error(error);
      res.status(500).render('error', { message: '整理券の発行に失敗しました' });
    }
  });

// ルート: 整理券の状態更新
app.post("/tickets/:id/update", isAuthenticated, async (req, res) => {
  try {
    const { status } = req.body;
    await Ticket.findByIdAndUpdate(req.params.id, { status });
    res.redirect("/");
  } catch (error) {
    res.status(500).render("error", { message: "整理券の更新に失敗しました" });
  }
});

// ルート: 整理券の削除
app.post("/tickets/:id/delete", isAuthenticated, async (req, res) => {
  try {
    await Ticket.findByIdAndDelete(req.params.id);
    res.redirect("/");
  } catch (error) {
    res.status(500).render("error", { message: "整理券の削除に失敗しました" });
  }
});

// ルート: 整理券詳細
app.get("/tickets/:id", async (req, res) => {
    try {
      const ticket = await Ticket.findById(req.params.id);
      if (!ticket) {
        return res.status(404).render('error', { message: '整理券が見つかりません' });
      }
  
      // QRコード生成
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const qrCode = await generateQRCode(`${baseUrl}/tickets/${ticket._id}`);
  
      // 認証情報をテンプレートに渡す
      const isAuthenticated = !!req.cookies.token;
  
      res.render("detail", { ticket: { ...ticket.toObject(), qrCode }, isAuthenticated });
    } catch (error) {
      console.error(error);
      res.status(500).render('error', { message: '整理券の取得に失敗しました' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});