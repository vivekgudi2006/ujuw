// Add to your public/script/show.js file

// Socket.io setup
const socket = io();

// DOM Elements
const countdownEl = document.getElementById('countdown');
const auctionStatusEl = document.getElementById('auctionStatus');
const bidForm = document.getElementById('myForm');

// Get auction end time from data attribute
const endTime = new Date(countdownEl.dataset.end).getTime();

// Countdown timer
function updateCountdown() {
    const now = new Date().getTime();
    const timeLeft = endTime - now;
    
    if (timeLeft <= 0) {
        // Auction has ended
        clearInterval(timerInterval);
        countdownEl.innerHTML = "AUCTION ENDED";
        auctionStatusEl.classList.remove('d-none');
        
        // Disable the bid form
        if (bidForm) {
            const bidInput = document.getElementById('amt');
            const bidButton = bidForm.querySelector('button[type="submit"]');
            
            bidInput.disabled = true;
            bidButton.disabled = true;
        }
        
        return;
    }
    
    // Calculate time units
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
    
    // Format and display the countdown
    countdownEl.innerHTML = `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

// Initial call to set the countdown immediately
updateCountdown();

// Update countdown every second
const timerInterval = setInterval(updateCountdown, 1000);

// Form submission with socket
if (bidForm) {
    bidForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const now = new Date().getTime();
        if (now > endTime) {
            alert('This auction has ended!');
            return;
        }
        
        const bidAmount = document.getElementById('amt').value;
        const productId = window.location.pathname.split('/').pop();
        
        // Send bid via fetch
        fetch(`/auction/${productId}/bid`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ amt: bidAmount })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
            } else {
                // Clear input field
                document.getElementById('amt').value = '';
                
                // Emit socket event for real-time update
                socket.emit('newBid', {
                    productId: productId,
                    bidder: data.name,
                    amount: data.amount
                });
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error placing bid.');
        });
    });
}

// Listen for new bids from server
socket.on('newBid', function(data) {
    // Add new bid to the table
    const table = document.getElementById('myTable').getElementsByTagName('tbody')[0];
    const newRow = table.insertRow(0);
    
    const cell1 = newRow.insertCell(0);
    const cell2 = newRow.insertCell(1);
    
    cell1.innerHTML = data.bidder;
    cell2.innerHTML = data.amount;
});

// Listen for auction end event
socket.on('auctionEnded', function(data) {
    countdownEl.innerHTML = "AUCTION ENDED";
    auctionStatusEl.classList.remove('d-none');
    
    // Update with winner info if available
    if (data.winner) {
        const winnerInfo = document.createElement('h4');
        winnerInfo.textContent = `Winner: ${data.winner.username} with bid of $${data.winner.bidAmount}`;
        auctionStatusEl.appendChild(winnerInfo);
    }
    
    // Disable bidding
    if (bidForm) {
        const bidInput = document.getElementById('amt');
        const bidButton = bidForm.querySelector('button[type="submit"]');
        
        bidInput.disabled = true;
        bidButton.disabled = true;
    }
});