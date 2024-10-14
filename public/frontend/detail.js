// サービスワーカーの登録
if ("serviceWorker" in navigator && "PushManager" in window) {
  navigator.serviceWorker
    .register("/service-worker.js")
    .then((registration) => {
      console.log("Service Worker registered with scope:", registration.scope)
    })
    .catch((error) => {
      console.error("Service Worker registration failed:", error)
    })
}

// 通知ボタンのクリックイベント
document.getElementById("notifyBtn").addEventListener("click", async () => {
  try {
    const ticketId = document.getElementById("ticketId").textContent.trim() // ここで ticketId を取得
    console.log("Ticket ID:", ticketId)
    const registration = await navigator.serviceWorker.ready
    console.log("Service Worker ready:", registration)
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        "BFOY7agJI1l5jWROufqE5ctlD9yKTudycNXHZ_oUpXaK2ew-OyAmXV13YY3DQCQQBwkivmkFh_UN3zy8OcP7uAc"
      ),
    })
    console.log("Subscription:", subscription)

    const response = await fetch("/api/subscribe", {
      method: "POST",
      body: JSON.stringify({ subscription, ticketId }), // 修正: ticketIdをオブジェクト全体ではなく、_idフィールドの値として渡す
      headers: {
        "Content-Type": "application/json",
      },
    })
    console.log("Subscription response:", response)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    // ボタンを非表示にする
    document.getElementById("notifyBtn").style.display = "none";
  } catch (error) {
    console.error("通知のサブスクリプションに失敗しました:", error)
  }
})
// VAPIDキーをUint8Arrayに変換する関数
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// チケットの状態を定期的にチェックする関数
async function checkTicketStatus(ticketId) {
  try {
    const response = await fetch(`/api/ticket/${ticketId}`);
    const data = await response.json();

    if (data.status === "呼び出し済み") {
      // 状態を更新する
      const statusElement = document.getElementById("ticketStatus");
      statusElement.textContent = "呼び出し済み";
      statusElement.className = "bg-green-500 text-white rounded p-1";
    } else {
      console.log("チケットの状態は変わっていません");
    }
  } catch (error) {
    console.error("チケットの状態チェックに失敗しました:", error);
  }
}

// 定期的にチケットの状態をチェックする
const ticketId = document.getElementById("ticketId").textContent.trim();
setInterval(() => checkTicketStatus(ticketId), 1000); // 1秒ごとにチェック