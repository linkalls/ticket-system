// // サービスワーカーの登録
// if ('serviceWorker' in navigator && 'PushManager' in window) {
//   navigator.serviceWorker.register('/service-worker.js')
//     .then(registration => {
//       console.log('Service Worker registered with scope:', registration.scope);
//     })
//     .catch(error => {
//       console.error('Service Worker registration failed:', error);
//     });
// }

// // 通知ボタンのクリックイベント
// document.getElementById('notifyBtn').addEventListener('click', async () => {
//   try {
//     const ticketId = document.getElementById('ticketId').textContent; // ここで ticketId を取得
//     const registration = await navigator.serviceWorker.ready;
//     const subscription = await registration.pushManager.subscribe({
//       userVisibleOnly: true,
//       applicationServerKey: urlBase64ToUint8Array('BFOY7agJI1l5jWROufqE5ctlD9yKTudycNXHZ_oUpXaK2ew-OyAmXV13YY3DQCQQBwkivmkFh_UN3zy8OcP7uAc')
//     });

//     await fetch('/api/subscribe', {
//       method: 'POST',
//       body: JSON.stringify({ subscription, ticketId }),
//       headers: {
//         'Content-Type': 'application/json'
//       }
//     });

//     alert('通知がオンになりました');
//   } catch (error) {
//     console.error('通知のサブスクリプションに失敗しました:', error);
//   }
// });

// // VAPIDキーをUint8Arrayに変換する関数
// function urlBase64ToUint8Array(base64String) {
//   const padding = '='.repeat((4 - base64String.length % 4) % 4);
//   const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
//   const rawData = window.atob(base64);
//   const outputArray = new Uint8Array(rawData.length);
//   for (let i = 0; i < rawData.length; ++i) {
//     outputArray[i] = rawData.charCodeAt(i);
//   }
//   return outputArray;
// }