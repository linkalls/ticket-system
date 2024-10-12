import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

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

async function seedDatabase() {
  try {
    // MongoDBに接続
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ticket-system', {
  
    });

    // 既存データを削除
    await Admin.deleteMany({});
    await Ticket.deleteMany({});

    // 管理者のデフォルトデータを作成
    const adminData = new Admin({
      name: '管理者',
      email: 'admin@example.com',
      password: await bcrypt.hash('password123', 10), // パスワードをハッシュ化
    });

    await adminData.save();
    console.log('管理者データが作成されました');

    // 整理券のデフォルトデータを作成
    const tickets = [];
    for (let i = 1; i <= 5; i++) {
      tickets.push(new Ticket({ ticketNumber: i }));
    }

    await Ticket.insertMany(tickets);
    console.log('整理券データが作成されました');

  } catch (error) {
    console.error('データベースのシードに失敗しました:', error.message);
  } finally {
    // MongoDBの接続を切断
    mongoose.connection.close();
  }
}

seedDatabase();
