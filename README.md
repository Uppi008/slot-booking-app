# Slot Booking App

A web app for booking time slots, built with Flask and MySQL. Users sign up, pick a date, and book or cancel an available slot. Admins manage the slots and see booking statistics.

## Features

**For users**
- Sign up and sign in. Passwords are hashed with bcrypt, and sessions keep users signed in.
- Choose a date and see that day's slots with their status: available, booked or cancelled.
- Book an available slot, cancel your own booking, and see all your bookings in **My Bookings**.

**For admins**
- An admin panel on the home page with live statistics: total, booked and available slots, plus registered users.
- Add, edit and delete slots, and cancel any booking.

**API:** the frontend talks to a JSON API. Each endpoint checks whether you are signed in and whether you are an admin.

| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/register`, `/api/login` | Public |
| GET | `/api/check-auth`, `/api/logout` | Public |
| GET | `/api/slots?date=YYYY-MM-DD`, `/api/slots/range` | Signed in |
| POST | `/api/book/<id>`, `/api/cancel/<id>` | Signed in |
| GET | `/api/user/bookings` | Signed in |
| POST / PUT / DELETE | `/api/slots/add`, `/api/slots/update/<id>`, `/api/delete/<id>` | Admin |
| GET | `/api/admin/stats` | Admin |

## Tech stack

Python · Flask · MySQL · bcrypt · Tailwind CSS · JavaScript · Gunicorn

## Run it locally

You need Python 3.10 or later and a running MySQL server.

1. Create the database. `updated_db.sql` creates a `slotbooking` database with the tables, sample slots for the next three days and three sample accounts. **It drops any existing `slotbooking` database first.**

   ```bash
   mysql -u root -p < updated_db.sql
   ```

2. Install the dependencies:

   ```bash
   python -m venv venv
   venv\Scripts\activate        # Windows
   # source venv/bin/activate   # macOS / Linux
   pip install -r requirements.txt
   ```

3. Copy `.env.example` to `.env`, then set your own `FLASK_SECRET_KEY` and `DB_PASSWORD`.

4. Start the app and open http://127.0.0.1:5000:

   ```bash
   python app.py
   ```

   In production, run it with Gunicorn instead: `gunicorn app:app`.

**Sample accounts** (local testing only): `admin`, `john` and `jane`, all with the password `password123`. `admin` has the admin role.

## Security

The Flask secret key and database password are read from the `.env` file, which is git-ignored. Never commit a real `.env` file, and change the sample account passwords before any real use.
