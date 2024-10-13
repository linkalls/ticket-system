document.addEventListener('DOMContentLoaded', function() {
  const baseUrl = document.querySelector('meta[name="app-url"]').getAttribute('content');
  
  function generateQRCodes() {
    const tickets = document.querySelectorAll('#ticketList li');
    tickets.forEach(ticket => {
      const qrCodeElement = ticket.querySelector('.qrcode');
      if (qrCodeElement) {
        new QRCode(qrCodeElement, {
          text: `${baseUrl}/tickets/${ticket.getAttribute('data-id')}`,
          width: 100,
          height: 100
        });
      }
    });
  }

  generateQRCodes();
});