import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const peopleSchema = new mongoose.Schema({
  numberOfPeople: { type: Number, required: true },
});

const People = mongoose.model("People", peopleSchema);

const orderSchema = new mongoose.Schema({
  items: [
    {
      itemName: { type: String, required: true },
      price: { type: Number, required: true },
    },
  ],
});

const Order = mongoose.model("Order", orderSchema);

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const Admin = mongoose.model("Admin", adminSchema);

const ticketSchema = new mongoose.Schema({
  ticketNumber: { type: Number, required: true, unique: true },
  issuedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ["待機中", "呼び出し済み"], default: "待機中" },
  people: { type: mongoose.Schema.Types.ObjectId, ref: "People", required: true },
  orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true }],
});

const Ticket = mongoose.model("Ticket", ticketSchema);

async function seedDatabase() {
  try {
    // MongoDBに接続
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ticket-system', {});

    // 既存データを削除
    await Admin.deleteMany({});
    await Ticket.deleteMany({});
    await People.deleteMany({});
    await Order.deleteMany({});

    // 管理者のデフォルトデータを作成
    const adminData = new Admin({
      name: '管理者',
      email: 'admin@example.com',
      password: await bcrypt.hash('password123', 10), // パスワードをハッシュ化
    });

    await adminData.save();
    console.log('管理者データが作成されました');

    // Peopleのデフォルトデータを作成
    const peopleData = [
      { numberOfPeople: 2 },
      { numberOfPeople: 4 },
      { numberOfPeople: 3 },
    ];

    const people = await People.insertMany(peopleData);
    console.log('Peopleデータが作成されました');

    // Orderのデフォルトデータを作成
    const orderData = [
      { items: [{ itemName: "サイダー", price: 100 }, { itemName: "いちご", price: 150 }] },
      { items: [{ itemName: "パイン", price: 200 }, { itemName: "ブドウ", price: 250 }] },
      { items: [{ itemName: "メロン", price: 300 }, { itemName: "ラムネ", price: 350 }] },
      { items: [{ itemName: "イチゴ", price: 400 }, { itemName: "レモン", price: 450 }] },
      { items: [{ itemName: "コーラ", price: 500 }] },
    ];

    const orders = await Order.insertMany(orderData);
    console.log('Orderデータが作成されました');

    // 整理券のデフォルトデータを作成
    const tickets = [];
    for (let i = 0; i < 5; i++) {
      tickets.push(new Ticket({
        ticketNumber: i + 1,
        people: people[i % people.length]._id,
        orders: [orders[i % orders.length]._id],
      }));
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