import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ticket-system', {

}).then(() => {
  console.log('MongoDBに接続されました');
}).catch((error) => {
  console.error('MongoDB接続エラー:', error.message);
});

// モデル
const Admin = mongoose.model('Admin', new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
}));

const Ticket = mongoose.model('Ticket', new mongoose.Schema({
  ticketNumber: { type: Number, required: true, unique: true },
  issuedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['待機中', '呼び出し済み'], default: '待機中' },
}));

// 管理者ログイン
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ message: '認証失敗: ユーザーが見つかりません' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: '認証失敗: パスワードが一致しません' });
    }

    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

// 整理券の取得
app.get('/api/tickets', async (req, res) => {
  const { authorization } = req.headers;
  if (!authorization) return res.status(401).send('ログインが必要です');

  const token = authorization.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    const tickets = await Ticket.find();
    res.json(tickets);
  } catch (error) {
    res.status(401).send('認証に失敗しました');
  }
});

// 整理券の発行
app.post('/api/tickets', async (req, res) => {
  const { authorization } = req.headers;
  if (!authorization) return res.status(401).send('ログインが必要です');

  const token = authorization.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    const lastTicket = await Ticket.findOne().sort({ ticketNumber: -1 });
    const newTicketNumber = lastTicket ? lastTicket.ticketNumber + 1 : 1;
    const newTicket = new Ticket({ ticketNumber: newTicketNumber });
    await newTicket.save();
    res.status(201).json(newTicket);
  } catch (error) {
    res.status(401).send('認証に失敗しました');
  }
});

// 整理券の状態更新
app.patch('/api/tickets/:id', async (req, res) => {
  const { authorization } = req.headers;
  if (!authorization) return res.status(401).send('ログインが必要です');

  const token = authorization.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    const { status } = req.body;
    const ticket = await Ticket.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json(ticket);
  } catch (error) {
    res.status(401).send('認証に失敗しました');
  }
});

// 整理券の削除
app.delete('/api/tickets/:id', async (req, res) => {
  const { authorization } = req.headers;
  if (!authorization) return res.status(401).send('ログインが必要です');

  const token = authorization.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    await Ticket.findByIdAndDelete(req.params.id);
    res.sendStatus(204);
  } catch (error) {
    res.status(401).send('認証に失敗しました');
  }
});

// サーバー起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});