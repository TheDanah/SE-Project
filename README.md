# Amam - Student Ride Sharing App

A Modern ride-sharing platform **exclusively for Imam Muhammad Ibn Saud Islamic University**.

![Amam Logo](https://img.shields.io/badge/Amam-Student%20Ride%20Sharing-blue?style=for-the-badge)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=flat&logo=socket.io&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=flat&logo=postgresql&logoColor=white)

## 📢 Latest Update: Multi-Tab Dashboard & Admin Authentication

**May 2026** - Complete platform with verified students, real-time tracking, and admin management:

✨ **Key Features**:

- 🏠 **Home Tab**: Request rides, interactive map, real-time chat
- 📢 **Announcements Tab**: System notifications & university events
- 🚗 **Driver Application**: Students can apply to become drivers
- 👤 **Profile Tab**: User settings & statistics
- 🔐 **Admin Dashboard**: Verify students, manage drivers, platform oversight

✨ **Smart Role-Based Access**:

- **Students**: Full access to ride requests, driver application, profile
- **Faculty**: Limited access (announcements, profile only)
- **Drivers**: Dedicated driver dashboard
- **Admins**: Complete platform management and verification

✨ **Responsive Design**: Works on desktop, tablet, and mobile

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Features](#features)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Usage](#usage)
- [Technologies](#technologies)
- [Real-Time Features](#real-time-features)
- [Security](#security)
- [Documentation](#documentation)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Amam is a student ride-sharing platform ensuring safety through mandatory university verification. Both riders and drivers must be verified students, creating a trusted campus community for affordable, convenient transportation.

**Key Values**:

- 🔒 University-verified students only
- 🚗 Student drivers with background checks
- 💬 Real-time communication
- 🗺️ Live GPS tracking
- 📱 Responsive mobile design

---

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)
- PostgreSQL (for database)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd SE-Project

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Initialize database
npm run seed-admin

# Start the server
npm start
```

The app will be available at `http://localhost:3000`

---

## Features

### Student Verification System

- **University Email Required** - All students must register with @sm.imamu.edu.sa emails
- **Email Verification** - Confirmation links sent to verify accounts
- **Driver Background Checks** - Additional verification for student drivers
- **Trusted Community** - Only verified students can access the platform

### Real-Time Ride Tracking

- **Live GPS Tracking** - See driver location in real-time using Leaflet.js maps
- **Route Visualization** - Visual route with ETA updates
- **Auto-Location Updates** - Socket.io powered position tracking
- **Map Controls** - Center, zoom, and traffic toggle options

### Instant Messaging

- **Real-Time Chat** - Communicate with drivers via Socket.io
- **Typing Indicators** - See when driver is typing
- **Message History** - Full conversation logs during ride
- **Instant Notifications** - Push notifications for new messages

### Smart Ride Matching

- **Automatic Driver Matching** - Find nearest available student driver
- **Campus Routes** - Preset destinations (buildings, dorms, metro)
- **Passenger Selection** - Choose 1-4 passengers
- **Fair Pricing** - Student-friendly rates

### Admin Management

- **Student Verification** - Review and approve student accounts
- **Driver Verification** - Validate driver licenses and vehicle info
- **Announcement Management** - Create and manage system notifications
- **Platform Monitoring** - Track active users and rides

### Role-Based Access

- **Student (Rider)** - Request rides, track drivers, chat, apply as driver
- **Student Driver** - Accept rides, update location, earn money
- **Faculty** - Limited access (announcements, profile only)
- **Admin** - Full platform management and oversight

---

## Project Structure

```
SE-Project/
├── public/                         # Frontend static files
│   ├── index.html                 # Landing page
│   ├── login.html                 # Role-based login
│   ├── signup.html                # Student registration
│   ├── student-dashboard.html     # Student ride request interface
│   ├── driver-dashboard.html      # Driver acceptance interface
│   ├── admin-dashboard.html       # Admin verification panel
│   ├── admin-login.html           # Admin authentication
│   ├── role-selection.html        # Role picker
│   ├── verify-email.html          # Email verification
│   └── assets/                    # Images and icons
│
├── db/
│   ├── schema.js                  # Database table definitions
│   └── init.js                    # Database initialization
│
├── middleware/
│   └── auth.js                    # Authentication & authorization
│
├── utils/
│   └── helpers.js                 # Shared utility functions
│
├── scripts/
│   ├── seed-admin.js              # Bootstrap default admin
│   ├── functional_test.js         # API tests
│   └── update-first-system-announcement.js
│
├── server.js                       # Main Express + Socket.io server
├── database.sql                    # SQL schema backup
├── package.json                    # Dependencies and scripts
├── README.md                       # This file
└── .env.example                    # Environment variables template
```

---

## Installation

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd SE-Project
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment

Create `.env` file:

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key
ADMIN_KEY=your_admin_key_optional
DATABASE_URL=postgresql://user:password@localhost:5432/amam
```

### Step 4: Initialize Database

```bash
npm run seed-admin
```

This creates the database tables and adds a default admin account:

- Username: `admin`
- Email: `admin@amam.com`
- Password: `Admin@123456` (⚠️ Change in production!)

### Step 5: Start Server

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## Usage

### For Students (Riders)

1. **Sign Up**
   - Visit signup.html
   - Register with @sm.imamu.edu.sa email
   - Verify email from confirmation link

2. **Login**
   - Use credentials at login.html
   - Role automatically detected

3. **Request Ride**
   - Enter pickup location
   - Select destination (campus/metro)
   - Choose number of passengers (1-4)
   - Click "Find Driver"

4. **Track & Chat**
   - View driver location on map
   - Chat in real-time
   - Get ETA updates

### For Student Drivers

1. **Apply as Driver** (from student dashboard)
   - Submit driver's license
   - Provide vehicle info
   - Enter license plate

2. **Wait for Admin Approval**
   - Admin verifies documents
   - Receives approval notification

3. **Accept Rides**
   - Login to driver dashboard
   - Accept nearby ride requests
   - Update location in real-time

### For Admins

1. **Login**
   - Use admin credentials at admin-login.html
   - Or use ADMIN_KEY header

2. **Verify Students**
   - Review student email domains
   - Approve/reject registrations

3. **Verify Drivers**
   - Review driver documents
   - Validate license information
   - Approve vehicle registration

4. **Manage Announcements**
   - Create system notifications
   - Target specific roles
   - View delivery status

---

## Technologies

### Frontend

- **HTML5** - Semantic markup
- **CSS3** - Modern styling, gradients, animations
- **JavaScript (ES6+)** - Interactive functionality
- **Leaflet.js** - Interactive maps
- **Socket.io Client** - Real-time communication

### Backend

- **Node.js** - Server runtime
- **Express.js** - Web framework
- **Socket.io** - WebSocket communication
- **PostgreSQL** - Database
- **Supabase** - Auth service
- **Bcrypt** - Password hashing
- **JWT** - Token authentication

### External APIs

- **OpenStreetMap** - Map tiles
- **Geolocation API** - User location
- **Email Service** - Verification emails

---

## Real-Time Features

### Socket.io Events

**Client → Server**:

- `requestRide` - Student requests a ride
- `cancelRide` - Cancel pending request
- `chatMessage` - Send message to driver
- `driverAvailable` - Driver goes online
- `acceptRide` - Driver accepts ride

**Server → Client**:

- `driverMatched` - Driver found and matched
- `driverLocationUpdate` - Driver's GPS coordinates
- `chatMessage` - Message from driver
- `driverTyping` - Driver is typing
- `rideCompleted` - Ride finished
- `rideCancelled` - Ride was cancelled

### Map Integration

- OpenStreetMap tiles for global coverage
- Custom markers (student, driver, destinations)
- Polyline route visualization
- Auto-centering and zoom controls
- Real-time position updates

---

## Security

### Authentication

- **Email Verification** - Required for all accounts
- **JWT Tokens** - Secure session management
- **Bcrypt Hashing** - Password security (10 salt rounds)
- **Role-Based Access Control** - Enforce permissions

### Student Verification

- Admin review of registrations
- University email domain validation (@sm.imamu.edu.sa)
- Driver background checks required
- Vehicle registration validation

### Data Protection

- **HTTPS/WSS** - Encrypted connections (in production)
- **Input Validation** - Sanitize all user inputs
- **Rate Limiting** - Prevent abuse on API endpoints
- **No Personal Data Sharing** - In-app messaging only

### Safety Features

- Real-time location sharing
- In-app messaging (no phone numbers exposed)
- Trip history and receipts
- Emergency contact options
- Driver ratings and reviews

---

## Documentation

For detailed information, see:

- **[Dashboard Architecture](./DASHBOARD_ARCHITECTURE.md)** - Technical implementation
- **[User Guide](./DASHBOARD_GUIDE.md)** - Feature walkthrough
- **[Authentication Flow](./LOGIN_REDIRECT_GUIDE.md)** - Role-based access
- **[QA Checklist](./IMPLEMENTATION_CHECKLIST.md)** - Testing procedures
- **[Documentation Index](./DOCUMENTATION_INDEX.md)** - Complete reference

---

## Deployment

### Environment Setup

Configure these environment variables:

```env
PORT=3000
NODE_ENV=production
JWT_SECRET=very_long_random_secret_key
DATABASE_URL=postgresql://user:password@host:5432/amam_db
ADMIN_KEY=random_admin_override_key
```

### Production Checklist

- [ ] Set up SSL/TLS certificates (HTTPS)
- [ ] Configure PostgreSQL database
- [ ] Set JWT_SECRET to strong random value
- [ ] Set NODE_ENV=production
- [ ] Change default admin password
- [ ] Set up email service for verifications
- [ ] Enable rate limiting
- [ ] Set up logging (Winston/Morgan)
- [ ] Configure PM2 for process management
- [ ] Set up monitoring and alerts
- [ ] Enable database backups
- [ ] Configure CDN for static assets

### Deployment Platforms

Tested on:

- Heroku
- AWS EC2
- DigitalOcean
- Railway
- Render

---

## Development

### Available Scripts

```bash
npm start              # Start production server
npm run dev           # Start with auto-reload
npm run lint          # Check code style (ESLint)
npm run lint:fix      # Auto-fix style issues
npm run format        # Format code (Prettier)
npm run seed-admin    # Create default admin
npm run test          # Run test suite
```

### Code Quality

- **ESLint** - Enforce code standards
- **Prettier** - Auto code formatting
- **Functional Tests** - API endpoint verification

### Git Workflow

```bash
git checkout -b feature/feature-name
# Make changes
git add .
git commit -m "Add description"
git push origin feature/feature-name
# Create Pull Request
```

---

## Design

### Color Palette

- **Primary Blue**: `#1e40af`, `#2563eb`, `#3b82f6`
- **Light Blue**: `#60a5fa`, `#dbeafe`, `#eff6ff`
- **White**: `#ffffff`
- **Text Dark**: `#1e3a8a`
- **Text Light**: `#475569`, `#64748b`

### Typography

- **Font Family**: Segoe UI, Tahoma, Geneva, Verdana, sans-serif
- **Headings**: Bold, 2rem - 4rem
- **Body**: Regular, 1rem - 1.3rem

### Responsive Breakpoints

- **Desktop**: > 768px (3-column layout)
- **Tablet**: 481px - 768px (2-column layout)
- **Mobile**: ≤ 480px (stacked layout)

---

## Browser Support

- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

---

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Coding Standards

- Use semantic HTML
- Follow CSS best practices
- Write clean, commented JavaScript
- Ensure responsive design
- Test on multiple browsers

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Contact & Support

**Project**: Amam Student Ride Sharing  
**University**: Imam Muhammad Ibn Saud Islamic University  
**Email**: support@amam.com (example)

---

## Acknowledgments

- **OpenStreetMap** - Map tiles and geolocation
- **Socket.io** - Real-time communication
- **Leaflet.js** - Interactive maps
- **Supabase** - Authentication infrastructure
- Special thanks to all contributors

---

© 2026 Amam Student Ride Sharing. Verified students only. Making campus commutes better.
