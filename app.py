from flask import Flask, render_template, jsonify, request, session, redirect, url_for
import mysql.connector
from datetime import datetime, timedelta
import bcrypt
from functools import wraps

app = Flask(__name__)
app.secret_key = 'your-secret-key-here-change-this-in-production'  # Change this in production

# Database connection
db = mysql.connector.connect(
    host="localhost",
    user="root",
    password="uppi_008",
    database="slotbooking",
    autocommit=True
)

# Login required decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated_function

# Admin required decorator
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session or session.get('role') != 'admin':
            return jsonify({"error": "Admin access required"}), 403
        return f(*args, **kwargs)
    return decorated_function

@app.route("/")
def home():
    if 'user_id' in session:
        return render_template("index.html")
    return redirect(url_for('login_page'))

@app.route("/login")
def login_page():
    return render_template("login.html")

@app.route("/register")
def register_page():
    return render_template("register.html")

@app.route("/admin")
@admin_required
def admin_page():
    return render_template("admin.html")

@app.route("/api/check-auth")
def check_auth():
    if 'user_id' in session:
        return jsonify({
            "authenticated": True,
            "user_id": session['user_id'],
            "username": session['username'],
            "role": session['role']
        })
    return jsonify({"authenticated": False}), 401

@app.route("/api/login", methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
    user = cursor.fetchone()
    cursor.close()
    
    if user:
        # Check password
        if bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
            session['user_id'] = user['id']
            session['username'] = user['username']
            session['role'] = user['role']
            return jsonify({"success": True, "role": user['role']})
    
    return jsonify({"success": False, "error": "Invalid credentials"}), 401

@app.route("/api/register", methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')
    
    # Hash password
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    
    cursor = db.cursor()
    try:
        cursor.execute(
            "INSERT INTO users (username, password, email) VALUES (%s, %s, %s)",
            (username, hashed.decode('utf-8'), email)
        )
        db.commit()
        cursor.close()
        return jsonify({"success": True})
    except mysql.connector.IntegrityError as e:
        cursor.close()
        return jsonify({"success": False, "error": "Username or email already exists"}), 400

@app.route("/api/logout")
def logout():
    session.clear()
    return jsonify({"success": True})

@app.route("/api/slots")
@login_required
def get_slots():
    date = request.args.get('date', datetime.now().strftime('%Y-%m-%d'))
    cursor = db.cursor(dictionary=True)
    
    query = """
        SELECT s.*, u.username as booked_by_name 
        FROM slots s 
        LEFT JOIN users u ON s.booked_by = u.id 
        WHERE s.slot_date = %s 
        ORDER BY s.slot_time
    """
    cursor.execute(query, (date,))
    data = cursor.fetchall()
    cursor.close()
    return jsonify(data)

@app.route("/api/slots/range")
@login_required
def get_slots_range():
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    cursor = db.cursor(dictionary=True)
    query = """
        SELECT s.*, u.username as booked_by_name 
        FROM slots s 
        LEFT JOIN users u ON s.booked_by = u.id 
        WHERE s.slot_date BETWEEN %s AND %s 
        ORDER BY s.slot_date, s.slot_time
    """
    cursor.execute(query, (start_date, end_date))
    data = cursor.fetchall()
    cursor.close()
    return jsonify(data)

@app.route("/api/book/<int:id>", methods=['POST'])
@login_required
def book_slot(id):
    cursor = db.cursor()
    
    # Check if slot is available
    cursor.execute("SELECT status FROM slots WHERE id = %s", (id,))
    slot = cursor.fetchone()
    
    if slot and slot[0] == 'available':
        cursor.execute(
            "UPDATE slots SET status='booked', booked_by=%s, booked_at=NOW() WHERE id=%s",
            (session['user_id'], id)
        )
        db.commit()
        cursor.close()
        return jsonify({"success": True, "message": "Slot booked successfully"})
    
    cursor.close()
    return jsonify({"success": False, "message": "Slot is not available"}), 400

@app.route("/api/cancel/<int:id>", methods=['POST'])
@login_required
def cancel_slot(id):
    cursor = db.cursor()
    
    # Check if user booked this slot or is admin
    if session.get('role') == 'admin':
        cursor.execute("UPDATE slots SET status='available', booked_by=NULL, booked_at=NULL WHERE id=%s", (id,))
    else:
        cursor.execute(
            "UPDATE slots SET status='available', booked_by=NULL, booked_at=NULL WHERE id=%s AND booked_by=%s",
            (id, session['user_id'])
        )
    
    db.commit()
    affected_rows = cursor.rowcount
    cursor.close()
    
    if affected_rows > 0:
        return jsonify({"success": True, "message": "Slot cancelled successfully"})
    
    return jsonify({"success": False, "message": "Unable to cancel slot"}), 400

@app.route("/api/delete/<int:id>", methods=['DELETE'])
@admin_required
def delete_slot(id):
    cursor = db.cursor()
    cursor.execute("DELETE FROM slots WHERE id=%s", (id,))
    db.commit()
    affected_rows = cursor.rowcount
    cursor.close()
    
    if affected_rows > 0:
        return jsonify({"success": True, "message": "Slot deleted successfully"})
    
    return jsonify({"success": False, "message": "Slot not found"}), 404

@app.route("/api/slots/add", methods=['POST'])
@admin_required
def add_slot():
    data = request.json
    slot_date = data.get('slot_date')
    slot_time = data.get('slot_time')
    
    cursor = db.cursor()
    try:
        cursor.execute(
            "INSERT INTO slots (slot_date, slot_time, status) VALUES (%s, %s, 'available')",
            (slot_date, slot_time)
        )
        db.commit()
        cursor.close()
        return jsonify({"success": True, "message": "Slot added successfully"})
    except mysql.connector.IntegrityError:
        cursor.close()
        return jsonify({"success": False, "message": "Slot already exists"}), 400

@app.route("/api/slots/update/<int:id>", methods=['PUT'])
@admin_required
def update_slot(id):
    data = request.json
    slot_date = data.get('slot_date')
    slot_time = data.get('slot_time')
    status = data.get('status')
    
    cursor = db.cursor()
    cursor.execute(
        "UPDATE slots SET slot_date=%s, slot_time=%s, status=%s WHERE id=%s",
        (slot_date, slot_time, status, id)
    )
    db.commit()
    affected_rows = cursor.rowcount
    cursor.close()
    
    if affected_rows > 0:
        return jsonify({"success": True, "message": "Slot updated successfully"})
    
    return jsonify({"success": False, "message": "Slot not found"}), 404

@app.route("/api/user/bookings")
@login_required
def get_user_bookings():
    cursor = db.cursor(dictionary=True)
    cursor.execute(
        "SELECT * FROM slots WHERE booked_by = %s ORDER BY slot_date DESC, slot_time DESC",
        (session['user_id'],)
    )
    data = cursor.fetchall()
    cursor.close()
    return jsonify(data)

@app.route("/api/admin/stats")
@admin_required
def get_admin_stats():
    cursor = db.cursor(dictionary=True)
    
    # Total slots
    cursor.execute("SELECT COUNT(*) as total FROM slots")
    total_slots = cursor.fetchone()
    
    # Booked slots
    cursor.execute("SELECT COUNT(*) as booked FROM slots WHERE status='booked'")
    booked_slots = cursor.fetchone()
    
    # Available slots
    cursor.execute("SELECT COUNT(*) as available FROM slots WHERE status='available'")
    available_slots = cursor.fetchone()
    
    # Total users
    cursor.execute("SELECT COUNT(*) as users FROM users WHERE role='user'")
    total_users = cursor.fetchone()
    
    cursor.close()
    
    return jsonify({
        "total_slots": total_slots['total'],
        "booked_slots": booked_slots['booked'],
        "available_slots": available_slots['available'],
        "total_users": total_users['users']
    })

if __name__ == "__main__":
    app.run(debug=True)