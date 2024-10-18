import express from "express"
import mongoose from "mongoose"
import dotenv from "dotenv"
import bcrypt from "bcryptjs"
import flash from "connect-flash";
import session from "express-session";
import cookieParser from "cookie-parser"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

// import { fileURLToPath } from "node:url"
// import { dirname, join } from "node:path"

import qrcode from "qrcode"
import webpush from "web-push"

dotenv.config()

// VAPIDキーの設定
const publicVapidKey = "BFOY7agJI1l5jWROufqE5ctlD9yKTudycNXHZ_oUpXaK2ew-OyAmXV13YY3DQCQQBwkivmkFh_UN3zy8OcP7uAc"
const privateVapidKey = "ZxjYVKE6oxOT0ecDbSVZOFNFLx_nSPJABVJiFJwsAsA"
webpush.setVapidDetails("mailto:example@yourdomain.org", publicVapidKey, privateVapidKey)

async function generateQRCode(text) {
  const opts = {
    color: {
      dark: "#000", // Blue dots
      light: "#0000", // Transparent background
    },
    scale: 5,
  }
  const buffer = await qrcode.toBuffer(text, "image/png", opts)
  return buffer.toString("base64")
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()

// EJSをビューエンジンとして設定
app.set("view engine", "ejs")
app.set("views", join(__dirname, "views"))

app.use(cookieParser())
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(express.static(join(__dirname, "public")))

mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/ticket-system", {})
  .then(() => {
    console.log("MongoDBに接続されました")
  })
  .catch((error) => {
    console.error("MongoDB接続エラー:", error.message)
  })

  // セッションとフラッシュメッセージの設定
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true
}));
app.use(flash());

// フラッシュメッセージをローカル変数に設定
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  next();
});

  
  const peopleSchema = new mongoose.Schema({
    numberOfPeople: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
  });
  
  const People = mongoose.model("People", peopleSchema);
  
  const orderSchema = new mongoose.Schema({
    items: [
      {
        itemName: { type: String, required: true },
        number: { type: Number, required: true },
      },
      
    ],
    createdAt: { type: Date, default: Date.now }
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


const Subscription = mongoose.model(
  "Subscription",
  new mongoose.Schema({
    ticketId: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket", required: true },
    subscription: { type: Object, required: true },
  })
)

// ミドルウェア: 認証チェック
const isAuthenticated = (req, res, next) => {
  const token = req.cookies.token
  if (token) {
    next()
  } else {
    res.redirect("/login")
  }
}



// サブスクリプションを保存するための配列
let subscriptions = []

// サブスクリプションを保存するエンドポイント
app.post("/api/subscribe", async (req, res) => {
  const { subscription, ticketId } = req.body
  console.log("Received subscription:", subscription)
  console.log("Received ticketId:", ticketId)

  try {
    // サブスクリプションを保存
    const newSubscription = new Subscription({ ticketId, subscription })
    await newSubscription.save()

    res.status(201).json({})
  } catch (error) {
    console.error("サブスクリプションの保存に失敗しました:", error)
    res.status(500).json({ error: "サブスクリプションの保存に失敗しました" })
  }
})

// 整理券の状態が「受け取り済み」になったときに通知を送信する関数
async function sendNotification(ticketId) {
  console.log(`sendNotification function called with ticketId: ${ticketId}`)
  console.log(`Sending notification for ticketId: ${ticketId}`)
  const payload = JSON.stringify({
    title: "整理券の状態が更新されました",
    body: "整理券の状態が「呼び出し済み」になりました",
  })

  try {
    // サブスクリプションをMongoDBから取得
    const subscriptions = await Subscription.find({ ticketId })
    console.log(`Filtered subscriptions: ${JSON.stringify(subscriptions)}`)

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(sub.subscription, payload)
        console.log(`Notification sent to subscription: ${sub.subscription.endpoint}`)
      } catch (error) {
        console.error("通知の送信に失敗しました:", error)
      }
    }
  } catch (error) {
    console.error("サブスクリプションの取得に失敗しました:", error)
  }
}

app.get("/daily-report", async (req, res) => {
  try {
    // 今日の日付を取得
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 今日の来客数を集計
    const peopleCount = await People.aggregate([
      {
        $match: {
          createdAt: { $gte: today }
        }
      },
      {
        $group: {
          _id: null,
          totalPeople: { $sum: "$numberOfPeople" }
        }
      }
    ]);

    // 今日売れた商品の味を集計
    const soldItems = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: today }
        }
      },
      {
        $unwind: "$items"
      },
      {
        $group: {
          _id: "$items.itemName",
          totalSold: { $sum: "$items.number" }
        }
      },
      {
        $sort: { totalSold: -1 }
      }
    ]);

    res.render("daily-report", {
      totalPeople: peopleCount[0] ? peopleCount[0].totalPeople : 0,
      soldItems
    });
  } catch (error) {
    console.error("日次レポートの取得に失敗しました:", error);
    res.status(500).render("error", { message: "日次レポートの取得に失敗しました" });
  }
});

// 整理券の状態を更新するエンドポイント
app.patch("/api/tickets/:id", async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
    ticket.status = req.body.status
    await ticket.save()

    if (ticket.status === "呼び出し済み") {
      await sendNotification(ticket._id)
    }

    res.json(ticket)
  } catch (error) {
    res.status(500).json({ message: "状態の更新に失敗しました" })
  }
})

app.post('/tickets/:id/deleteAll', isAuthenticated, async (req, res) => {
  try {
    const ticketId = req.params.id;
    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      return res.status(404).send('Ticket not found');
    }

    // People と Order の削除
    await People.findByIdAndDelete(ticket.people);
    await Order.deleteMany({ _id: { $in: ticket.orders } });

    // Ticket の削除
    await Ticket.findByIdAndDelete(ticketId);
    req.flash('success_msg', 'Ticket and related data deleted successfully');
    res.redirect('/');
  } catch (error) {
    req.flash('error_msg', 'An error occurred while deleting the ticket');
    res.status(500).redirect('/');
}
})

// ルート: ホームページ
// app.get("/", isAuthenticated, async (req, res) => {
//   try {
//     const tickets = await Ticket.find()
//     const baseUrl = `${req.protocol}://${req.get("host")}`

//     // 各チケットに対してQRコードを生成
//     const ticketsWithQR = await Promise.all(
//       tickets.map(async (ticket) => {
//         const qrCode = await generateQRCode(`${baseUrl}/tickets/${ticket._id}`)
//         return { ...ticket.toObject(), qrCode }
//       })
//     )

//     res.render("index", { tickets: ticketsWithQR, baseUrl })
//   } catch (error) {
//     res.status(500).render("error", { message: "サーバーエラーが発生しました" })
//   }
// })
app.get("/", isAuthenticated, async (req, res) => {
  try {
    const tickets = await Ticket.find().populate("people").populate("orders")
    const people = await People.find()
    const orders = await Order.find()
    const baseUrl = `${req.protocol}://${req.get("host")}`

    // 各チケットに対してQRコードを生成
    const ticketsWithQR = await Promise.all(
      tickets.map(async (ticket) => {
        const qrCode = await generateQRCode(`${baseUrl}/tickets/${ticket._id}`)
        return { ...ticket.toObject(), qrCode }
      })
    )

    res.render("index", { tickets: ticketsWithQR, people, orders })
  } catch (error) {
    console.error("データの取得に失敗しました:", error)
    res.status(500).render("error", { message: "データの取得に失敗しました" })
  }
})


// ルート: ログインページ
app.get("/login", (req, res) => {
  res.render("login")
})

// ルート: ログイン処理
app.post("/login", async (req, res) => {
  const { email, password } = req.body
  try {
    const admin = await Admin.findOne({ email })
    if (!admin) {
      return res.render("login", { error: "メールアドレスまたはパスワードが正しくありません" })
    }

    const isMatch = await bcrypt.compare(password, admin.password)
    if (!isMatch) {
      return res.render("login", { error: "メールアドレスまたはパスワードが正しくありません" })
    }

    res.cookie("token", admin._id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24時間
    })
    res.redirect("/")
  } catch (error) {
    res.status(500).render("error", { message: "サーバーエラーが発生しました" })
  }
})

// ルート: ログアウト
app.get("/logout", (req, res) => {
  res.clearCookie("token")
  res.redirect("/login")
})

// ルート: 新規整理券発行
app.post("/tickets", async (req, res) => {
  try {
    const { numberOfPeople, orderItems, orderNumbers } = req.body;
    console.log(req.body);

    // Peopleのデータを作成
    const people = new People({ numberOfPeople });
    await people.save();

    // Orderのデータを作成
    const items = orderItems
      .map((itemName, index) => ({
        itemName,
        number: orderNumbers[index],
      }))
      .filter(item => item.itemName && item.number !== undefined);

    if (items.length === 0) {
      return res.status(400).json({ error: "有効な注文項目がありません" });
    }

    const order = new Order({ items });
    await order.save();

    // Ticketのデータを作成
    const ticket = new Ticket({
      ticketNumber: await Ticket.countDocuments() + 1,
      people: people._id,
      orders: [order._id],
    });
    await ticket.save();
    req.flash('success_msg', `ticket番号${ticket.ticketNumber}を発行しました`);
res.redirect(`/tickets/${ticket._id}`);
    // res.status(201).json({ message: "整理券が作成されました", ticket });
  } catch (error) {
    console.error("整理券の作成に失敗しました:", error);
    res.status(500).render("error", { message: "サーバーエラーが発生しました" });
  }
});

// ルート: 整理券の状態更新
app.post("/tickets/:id/update", isAuthenticated, async (req, res) => {
  try {
    const { status } = req.body
    console.log(`Received status: ${status}`) // ログを追加
    const ticket = await Ticket.findByIdAndUpdate(req.params.id, { status }, { new: true })
    if (!ticket) {
      return res.status(404).render("error", { message: "整理券が見つかりません" })
    }

    console.log(`Ticket status updated: ${ticket.status}`) // ログを追加

    // 状態が「受け取り済み」に更新された場合に通知を送信
    if (ticket.status === "呼び出し済み") {
      console.log(`Calling sendNotification for ticketId: ${ticket._id}`) // ログを追加
      await sendNotification(ticket._id)
    }
    req.flash('success_msg', 'ticket情報をアップデートしました');
    res.redirect("/")
  } catch (error) {
    console.error("状態の更新に失敗しました:", error)
    res.status(500).render("error", { message: "整理券の更新に失敗しました" })
  }
})

// ルート: 整理券の削除
app.post("/tickets/:id/delete", isAuthenticated, async (req, res) => {
  try {
    await Ticket.findByIdAndDelete(req.params.id)
    res.redirect("/")
  } catch (error) {
    res.status(500).render("error", { message: "整理券の削除に失敗しました" })
  }
})

// ルート: 整理券詳細
app.get("/tickets/:id", async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id).populate("people").populate({
      path: "orders",
      populate: {
        path: "items",
      },
    });

    if (!ticket) {
      return res.status(404).render("error", { message: "整理券が見つかりません" });
    }

    // QRコード生成
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const qrCode = await generateQRCode(`${baseUrl}/tickets/${ticket._id}`);

    // 認証情報をテンプレートに渡す
    const isAuthenticated = !!req.cookies.token;

    res.render("detail", { ticket: { ...ticket.toObject(), qrCode }, isAuthenticated, ticketId: ticket._id });
  } catch (error) {
    console.error(error);
    res.status(500).render("error", { message: "整理券の取得に失敗しました" });
  }
});

app.get("/api/ticket/:id", async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: "チケットが見つかりません" });
    }

    if (ticket.status === "呼び出し済み") {
      return res.json({ status: "呼び出し済み" });
    } else {
      return res.json({ status: "変わっていない" });
    }
  } catch (error) {
    console.error("チケットの取得に失敗しました:", error);
    return res.status(500).json({ message: "サーバーエラー" });
  }
});

// ルート: 呼び出し済みチケット一覧ページ
app.get("/called-tickets", (req, res) => {
  res.render("called-tickets")
})

// ルート: 呼び出し済みのチケット一覧
app.get("/api/tickets/called", async (req, res) => {
  try {
    const calledTickets = await Ticket.find({ status: "呼び出し済み" }).select("ticketNumber")
    const ticketNumbers = calledTickets.map(ticket => ticket.ticketNumber)
    res.json(ticketNumbers)
  } catch (error) {
    console.error("呼び出し済みチケットの取得に失敗しました:", error)
    res.status(500).json({ message: "サーバーエラー" })
  }
})

app.get("*", (req, res) => {
  res.render("error", { message: "ページが見つかりません" })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
