let tickets = []; // 整理券情報を格納する配列
let currentTicketId = null; // 現在選択されている整理券ID

// DOM要素の取得
const loginSection = document.getElementById('login-section');
const adminDashboard = document.getElementById('admin-dashboard');
const ticketList = document.getElementById('ticketList');
const loginBtn = document.getElementById('loginBtn');
const issueTicketBtn = document.getElementById('issueTicket');
const statusModal = document.getElementById('statusModal');
const statusSelect = document.getElementById('statusSelect');
const cancelBtn = document.getElementById('cancelBtn');
const saveBtn = document.getElementById('saveBtn');

// ログインボタンのクリックイベント
loginBtn.addEventListener('click', async () => {
  const email = document.getElementById('adminEmail').value;
  const password = document.getElementById('adminPassword').value;

  try {
    const response = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      throw new Error('認証に失敗しました。メールアドレスまたはパスワードを確認してください。');
    }

    const data = await response.json();
    localStorage.setItem('token', data.token); // トークンを保存
    loginSection.classList.add('hidden'); // ログインセクションを隠す
    adminDashboard.classList.remove('hidden'); // ダッシュボードを表示
    await fetchTickets(); // 整理券を取得して表示
  } catch (error) {
    alert(error.message);
  }
});

// 整理券発行ボタンのクリックイベント
issueTicketBtn.addEventListener('click', async () => {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch('http://localhost:3000/api/tickets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('整理券の発行に失敗しました。');
    }

    await fetchTickets(); // 整理券を再取得して表示
  } catch (error) {
    alert(error.message);
  }
});

// 整理券リストを表示する関数
async function fetchTickets() {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch('http://localhost:3000/api/tickets', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('整理券の取得に失敗しました。');
    }

    tickets = await response.json();
    renderTickets();
  } catch (error) {
    alert(error.message);
  }
}

// 整理券リストを表示する関数
function renderTickets() {
  ticketList.innerHTML = ''; // リストをクリア
  tickets.forEach(ticket => {
    const li = document.createElement('li');
    li.className = 'flex flex-col sm:flex-row items-center justify-between border-b p-2';
    const statusClass = ticket.status === '呼び出し済み' ? 'bg-green-500' : 'bg-red-500';
    li.innerHTML = `
      <div class="flex-1 mb-2 sm:mb-0">
        整理券番号: ${ticket.ticketNumber} - 状態: <span class="${statusClass} text-white rounded p-1">${ticket.status}</span>
      </div>
      <div class="flex items-center">
        <button class="bg-yellow-500 text-white rounded p-1 mr-2" onclick="showStatusModal('${ticket._id}', '${ticket.status}')">状態更新</button>
        <button class="bg-red-500 text-white rounded p-1" onclick="confirmDeleteTicket('${ticket._id}')">削除</button>
        <div class="qrcode mt-2 sm:mt-0 ml-2" id="qrcode-${ticket.ticketNumber}"></div>
      </div>
    `;
    ticketList.appendChild(li);
    // QRコードを生成
    generateQRCode(ticket.ticketNumber);
  });
}

// QRコードを生成する関数
function generateQRCode(ticketNumber) {
  $(`#qrcode-${ticketNumber}`).qrcode({
    text: `http://example.com/ticket/${ticketNumber}`, // QRコードに埋め込むURL
    width: 100,
    height: 100,
  });
}

// 状態変更モーダルを表示する関数
function showStatusModal(ticketId, currentStatus) {
  currentTicketId = ticketId;
  statusSelect.value = currentStatus;
  statusModal.classList.remove('hidden');
}

// 状態変更モーダルのキャンセルボタンのクリックイベント
cancelBtn.addEventListener('click', () => {
  statusModal.classList.add('hidden');
  currentTicketId = null;
});

// 状態変更モーダルの保存ボタンのクリックイベント
saveBtn.addEventListener('click', async () => {
  const newStatus = statusSelect.value;
  await updateStatus(currentTicketId, newStatus);
  statusModal.classList.add('hidden');
  currentTicketId = null;
});

// 状態更新ボタンのクリックイベント
async function updateStatus(ticketId, newStatus) {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`http://localhost:3000/api/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: newStatus })
    });

    if (!response.ok) {
      throw new Error('状態の更新に失敗しました。');
    }

    await fetchTickets(); // 整理券を再取得して表示
  } catch (error) {
    alert(error.message);
  }
}

// 削除ボタンのクリックイベント
async function confirmDeleteTicket(ticketId) {
  if (confirm('本当にこの整理券を削除しますか？')) {
    await deleteTicket(ticketId);
  }
}

// 整理券削除の関数
async function deleteTicket(ticketId) {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`http://localhost:3000/api/tickets/${ticketId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('整理券の削除に失敗しました。');
    }

    await fetchTickets(); // 整理券を再取得して表示
  } catch (error) {
    alert(error.message);
  }
}