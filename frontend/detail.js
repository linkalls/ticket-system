document.addEventListener('DOMContentLoaded', async () => {
  const ticketId = new URLSearchParams(window.location.search).get('id');
  if (!ticketId) {
    alert('整理券IDが指定されていません');
    return;
  }

  try {
    const response = await fetch(`http://localhost:3000/api/tickets/${ticketId}`);

    if (!response.ok) {
      throw new Error('整理券の取得に失敗しました。');
    }

    const ticket = await response.json();
    document.getElementById('ticketNumber').textContent = ticket.ticketNumber;
    document.getElementById('issuedAt').textContent = new Date(ticket.issuedAt).toLocaleString();
    document.getElementById('status').textContent = ticket.status;
    generateQRCode(ticket.ticketNumber);
  } catch (error) {
    alert(error.message);
  }

  document.getElementById('backBtn').addEventListener('click', () => {
    window.history.back();
  });
});

// QRコードを生成する関数
function generateQRCode(ticketNumber) {
  $('#qrcode').qrcode({
    text: `http://example.com/ticket/${ticketNumber}`, // QRコードに埋め込むURL
    width: 100,
    height: 100,
  });
}