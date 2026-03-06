let currentUser = null;
let currentEditingId = null;
let userRole = null;

// Check login status on page load
document.addEventListener('DOMContentLoaded', async function() {
    await checkAuth();
    initializeDatePicker();
    loadSlots();
    
    // Check if user is admin and show admin panel button
    if (userRole === 'admin') {
        document.getElementById('adminPanelBtn').classList.remove('hidden');
        loadAdminStats();
    }
    
    // Event listeners
    document.getElementById('myBookingsBtn').addEventListener('click', showMyBookings);
    document.getElementById('adminPanelBtn').addEventListener('click', showAdminPanel);
});

function initializeDatePicker() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('datePicker').value = today;
}

async function checkAuth() {
    try {
        const response = await fetch('/api/check-auth');
        if (!response.ok) {
            window.location.href = '/login';
            return;
        }
        const data = await response.json();
        currentUser = data.user_id; // Fixed: was data.user but should be user_id
        userRole = data.role;
        document.getElementById('welcomeUser').textContent = `Welcome, ${data.username}!`;
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/login';
    }
}

async function loadSlots() {
    const date = document.getElementById('datePicker').value;
    
    try {
        const response = await fetch(`/api/slots?date=${date}`);
        if (!response.ok) {
            throw new Error('Failed to load slots');
        }
        const slots = await response.json();
        
        const table = document.getElementById("slotTable");
        table.innerHTML = "";

        if (slots.length === 0) {
            table.innerHTML = '<tr><td colspan="5" class="px-6 py-8 text-center text-gray-500">No slots available for this date</td></tr>';
            return;
        }

        slots.forEach(slot => {
            const row = document.createElement('tr');
            row.className = 'transition';
            
            const isBookedByCurrentUser = slot.booked_by === currentUser;
            const canCancel = (slot.status === 'booked' && isBookedByCurrentUser) || userRole === 'admin';
            
            let actionButtons = '';
            
            if (slot.status === 'available' && !slot.booked_by) {
                actionButtons = `<button onclick="bookSlot(${slot.id})" class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm font-medium">
                    <i class="fas fa-check mr-1"></i>Book
                </button>`;
            } else if (canCancel) {
                actionButtons = `<button onclick="cancelSlot(${slot.id})" class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm font-medium mr-2">
                    <i class="fas fa-times mr-1"></i>Cancel
                </button>`;
            } else if (slot.status === 'booked' && !canCancel) {
                actionButtons = '<span class="text-gray-500 text-sm">Booked by others</span>';
            } else {
                actionButtons = '<span class="text-gray-500 text-sm">Not Available</span>';
            }
            
            // Admin actions
            if (userRole === 'admin') {
                if (actionButtons.includes('button')) {
                    actionButtons = actionButtons.replace('</button>', `</button>
                    <button onclick="editSlot(${slot.id})" class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium mr-2">
                        <i class="fas fa-edit mr-1"></i>Edit
                    </button>
                    <button onclick="deleteSlot(${slot.id})" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-medium">
                        <i class="fas fa-trash mr-1"></i>Delete
                    </button>`);
                } else {
                    actionButtons = `<button onclick="editSlot(${slot.id})" class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium mr-2">
                        <i class="fas fa-edit mr-1"></i>Edit
                    </button>
                    <button onclick="deleteSlot(${slot.id})" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-medium">
                        <i class="fas fa-trash mr-1"></i>Delete
                    </button>`;
                }
            }
            
            // Create table cells properly - each cell should contain ONLY its specific data
            const dateCell = document.createElement('td');
            dateCell.className = 'px-6 py-4 whitespace-nowrap';
            dateCell.innerHTML = `<div class="text-sm">${formatDate(slot.slot_date)}</div>`;
            
            const timeCell = document.createElement('td');
            timeCell.className = 'px-6 py-4 whitespace-nowrap';
            timeCell.innerHTML = `<div class="text-sm font-medium">${slot.slot_time}</div>`;
            
            const statusCell = document.createElement('td');
            statusCell.className = 'px-6 py-4 whitespace-nowrap';
            statusCell.innerHTML = `
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${slot.status === 'available' ? 'bg-green-100 text-green-800' : 
                      slot.status === 'booked' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-gray-100 text-gray-800'}">
                    <i class="fas ${slot.status === 'available' ? 'fa-check-circle' : 
                                 slot.status === 'booked' ? 'fa-bookmark' : 
                                 'fa-times-circle'} mr-1"></i>
                    ${slot.status}
                </span>
            `;
            
            const bookedByCell = document.createElement('td');
            bookedByCell.className = 'px-6 py-4 whitespace-nowrap text-sm';
            bookedByCell.textContent = slot.booked_by_name || '-';
            
            const actionsCell = document.createElement('td');
            actionsCell.className = 'px-6 py-4 whitespace-nowrap text-sm font-medium';
            actionsCell.innerHTML = actionButtons;
            
            // Append all cells to the row
            row.appendChild(dateCell);
            row.appendChild(timeCell);
            row.appendChild(statusCell);
            row.appendChild(bookedByCell);
            row.appendChild(actionsCell);
            
            table.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading slots:', error);
        showNotification('Error loading slots', 'error');
    }
}

async function bookSlot(id) {
    if (!confirm('Are you sure you want to book this slot?')) return;
    
    try {
        const response = await fetch(`/api/book/${id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Slot booked successfully!', 'success');
            loadSlots();
            if (userRole === 'admin') loadAdminStats();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        showNotification('Error booking slot', 'error');
    }
}

async function cancelSlot(id) {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    
    try {
        const response = await fetch(`/api/cancel/${id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Booking cancelled successfully!', 'success');
            loadSlots();
            if (userRole === 'admin') loadAdminStats();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        showNotification('Error cancelling booking', 'error');
    }
}

async function deleteSlot(id) {
    if (!confirm('Are you sure you want to delete this slot? This action cannot be undone.')) return;
    
    try {
        const response = await fetch(`/api/delete/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Slot deleted successfully!', 'success');
            loadSlots();
            loadAdminStats();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        showNotification('Error deleting slot', 'error');
    }
}

async function showMyBookings(e) {
    e.preventDefault();
    
    try {
        const response = await fetch('/api/user/bookings');
        if (!response.ok) {
            throw new Error('Failed to load bookings');
        }
        const bookings = await response.json();
        
        const table = document.getElementById("slotTable");
        table.innerHTML = "";

        if (bookings.length === 0) {
            table.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-500">No bookings found</td></tr>';
            return;
        }

        bookings.forEach(slot => {
            const row = document.createElement('tr');
            row.className = 'transition';
            
            const dateCell = document.createElement('td');
            dateCell.className = 'px-6 py-4 whitespace-nowrap';
            dateCell.innerHTML = `<div class="text-sm">${formatDate(slot.slot_date)}</div>`;
            
            const timeCell = document.createElement('td');
            timeCell.className = 'px-6 py-4 whitespace-nowrap';
            timeCell.innerHTML = `<div class="text-sm font-medium">${slot.slot_time}</div>`;
            
            const statusCell = document.createElement('td');
            statusCell.className = 'px-6 py-4 whitespace-nowrap';
            statusCell.innerHTML = `
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${slot.status === 'booked' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                    <i class="fas ${slot.status === 'booked' ? 'fa-check-circle' : 'fa-times-circle'} mr-1"></i>
                    ${slot.status}
                </span>
            `;
            
            const bookedAtCell = document.createElement('td');
            bookedAtCell.className = 'px-6 py-4 whitespace-nowrap text-sm';
            bookedAtCell.textContent = slot.booked_at ? new Date(slot.booked_at).toLocaleString() : '-';
            
            const actionsCell = document.createElement('td');
            actionsCell.className = 'px-6 py-4 whitespace-nowrap text-sm font-medium';
            if (slot.status === 'booked') {
                actionsCell.innerHTML = `<button onclick="cancelSlot(${slot.id})" class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm font-medium">
                    <i class="fas fa-times mr-1"></i>Cancel
                </button>`;
            } else {
                actionsCell.innerHTML = '<span class="text-gray-500 text-sm">Cancelled</span>';
            }
            
            row.appendChild(dateCell);
            row.appendChild(timeCell);
            row.appendChild(statusCell);
            row.appendChild(bookedAtCell);
            row.appendChild(actionsCell);
            
            table.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading bookings:', error);
        showNotification('Error loading bookings', 'error');
    }
}

async function showAdminPanel(e) {
    e.preventDefault();
    
    // Show admin stats
    document.getElementById('adminStats').classList.remove('hidden');
    loadAdminStats();
    
    // Add "Add New Slot" button if not exists
    const container = document.querySelector('.max-w-7xl.mt-8.px-4');
    let addButton = document.getElementById('addSlotBtn');
    
    if (!addButton) {
        addButton = document.createElement('div');
        addButton.id = 'addSlotBtn';
        addButton.className = 'mb-4';
        addButton.innerHTML = `
            <button onclick="showAddSlotModal()" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition">
                <i class="fas fa-plus mr-2"></i>Add New Slot
            </button>
        `;
        container.insertBefore(addButton, document.querySelector('.bg-white.rounded-xl.shadow-md.overflow-hidden'));
    }
    
    loadSlots();
}

async function loadAdminStats() {
    try {
        const response = await fetch('/api/admin/stats');
        if (!response.ok) {
            throw new Error('Failed to load stats');
        }
        const stats = await response.json();
        
        document.getElementById('totalSlots').textContent = stats.total_slots || 0;
        document.getElementById('availableSlots').textContent = stats.available_slots || 0;
        document.getElementById('bookedSlots').textContent = stats.booked_slots || 0;
        document.getElementById('totalUsers').textContent = stats.total_users || 0;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function showAddSlotModal() {
    currentEditingId = null;
    document.getElementById('modalTitle').textContent = 'Add New Slot';
    document.getElementById('modalDate').value = document.getElementById('datePicker').value;
    document.getElementById('modalTime').value = '09:00 AM';
    document.getElementById('statusField').classList.add('hidden');
    document.getElementById('slotModal').classList.remove('hidden');
}

async function editSlot(id) {
    currentEditingId = id;
    document.getElementById('modalTitle').textContent = 'Edit Slot';
    document.getElementById('statusField').classList.remove('hidden');
    
    // Fetch slot details
    try {
        const date = document.getElementById('datePicker').value;
        const response = await fetch(`/api/slots?date=${date}`);
        const slots = await response.json();
        const slot = slots.find(s => s.id === id);
        
        if (slot) {
            document.getElementById('modalDate').value = slot.slot_date;
            document.getElementById('modalTime').value = slot.slot_time;
            document.getElementById('modalStatus').value = slot.status;
        }
    } catch (error) {
        console.error('Error fetching slot details:', error);
    }
    
    document.getElementById('slotModal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('slotModal').classList.add('hidden');
    currentEditingId = null;
}

async function saveSlot() {
    const date = document.getElementById('modalDate').value;
    const time = document.getElementById('modalTime').value;
    
    if (!date || !time) {
        showNotification('Please fill all fields', 'error');
        return;
    }
    
    try {
        let url = '/api/slots/add';
        let method = 'POST';
        let body = {
            slot_date: date,
            slot_time: time
        };
        
        if (currentEditingId) {
            url = `/api/slots/update/${currentEditingId}`;
            method = 'PUT';
            body.status = document.getElementById('modalStatus')?.value || 'available';
        }
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message, 'success');
            closeModal();
            loadSlots();
            loadAdminStats();
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        showNotification('Error saving slot', 'error');
    }
}

async function logout() {
    try {
        await fetch('/api/logout');
        window.location.href = '/login';
    } catch (error) {
        console.error('Error logging out:', error);
    }
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

function showNotification(message, type) {
    // Remove any existing notification
    const existingNotification = document.querySelector('.fixed.top-4.right-4');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white font-medium z-50 
        ${type === 'success' ? 'bg-green-500' : 'bg-red-500'}`;
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-2"></i>
            ${message}
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}