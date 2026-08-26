# FairShare

FairShare is a full-stack household expense-sharing and settlement management application. It helps roommates, families, and shared households track expenses, split costs, manage settlements, and stay updated through real-time notifications.

## 🚀 Features

### 🔐 Authentication
- User registration and login
- Secure authentication using HTTP-only cookies/session authentication
- Protected application routes
- Public routes for login and registration
- Automatic authentication verification
- Logout functionality

### 🏠 Household Management
- Create and manage households
- View household members
- Switch between multiple households
- Household-specific expenses and settlements
- Household member roles
- Admin-controlled member settings

### 💰 Expense Management
- Add household expenses
- Record who paid for an expense
- Split expenses between household members
- Support for different expense categories
- View individual expense details
- Track each member's share
- Expense history

### 📊 Dashboard
The dashboard provides a monthly overview including:

- Total household spending
- Amount paid by the current user
- Current user's expense share
- Current user's balance
- Monthly spending information

### 🤝 Settlements
FairShare automatically calculates who owes whom.

For each monthly settlement, users can see:

- Total expenses
- Amount paid
- Individual share
- Current balance
- Who needs to pay whom
- Transaction status
- Paid/unpaid transactions
- Monthly settlement status

Users who owe money can mark their transaction as paid.

### 🔔 Notifications
Real-time notification system using Socket.IO.

Notifications include:

- Settlement notifications
- Payment marked as paid
- Household-related notifications
- Unread notification count
- Mark notification as read
- Mark all notifications as read
- Real-time updates without refreshing the page

### 📧 Email Notifications
FairShare supports email communication using SMTP.

Currently implemented:

- Email service
- Test email functionality
- Weekly settlement emails
- Settlement summary emails
- Failed email tracking

### 👥 Members
Household members can:

- View all household members
- See member names and email addresses
- View household roles
- Configure grocery participation
- View availability status

### 🟢 Availability
Members can mark themselves as:

- Available
- Away

Availability is household-specific.

### 👤 Profile
Users can manage:

- Name
- Phone number
- Account email

The email address is displayed as read-only.

### 📱 Responsive UI
The frontend is designed to work across:

- Desktop
- Tablet
- Mobile

The application includes:

- Responsive navigation
- Mobile navigation menu
- Responsive cards
- Responsive forms
- Mobile-friendly household switching

---

# 🛠️ Tech Stack

## Frontend

- React
- React Router DOM
- Tailwind CSS
- Axios
- Socket.IO Client

## Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- Socket.IO
- Nodemailer
- Authentication middleware

## Database

MongoDB

## Email

SMTP / Gmail SMTP

---

# 📁 Project Structure

```text
FairShare/
│
├── frontend/
│   │
│   ├── src/
│   │   ├── components/
│   │   │   ├── Availability.jsx
│   │   │   ├── Navbar.jsx
│   │   │   └── NotificationBell.jsx
│   │   │
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   ├── HouseholdContext.jsx
│   │   │   └── NotificationContext.jsx
│   │   │
│   │   ├── layouts/
│   │   │   └── MainLayout.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   ├── Login.jsx
│   │   │   │   └── Register.jsx
│   │   │   │
│   │   │   ├── dashboard/
│   │   │   │   └── Dashboard.jsx
│   │   │   │
│   │   │   ├── expenses/
│   │   │   │   ├── Expenses.jsx
│   │   │   │   └── ExpenseDetail.jsx
│   │   │   │
│   │   │   ├── members/
│   │   │   │   └── Members.jsx
│   │   │   │
│   │   │   ├── settlement/
│   │   │   │   └── Settlement.jsx
│   │   │   │
│   │   │   └── profile/
│   │   │       └── Profile.jsx
│   │   │
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   └── socket.js
│   │   │
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   │
│   └── package.json
│
├── backend/
│   │
│   ├── controller/
│   │   ├── auth.controller.js
│   │   ├── expense.controller.js
│   │   ├── household.controller.js
│   │   ├── settlement.controller.js
│   │   ├── notification.controller.js
│   │   └── ...
│   │
│   ├── model/
│   │   ├── user.model.js
│   │   ├── household.model.js
│   │   ├── expense.model.js
│   │   ├── settlement.model.js
│   │   └── notification.model.js
│   │
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── expense.routes.js
│   │   ├── household.routes.js
│   │   ├── settlement.routes.js
│   │   └── notification.routes.js
│   │
│   ├── middleware/
│   │   └── auth.middleware.js
│   │
│   ├── services/
│   │   ├── settlement.service.js
│   │   ├── notification.service.js
│   │   └── email.service.js
│   │
│   ├── utils/
│   │   └── createAuditLog.js
│   │
│   ├── server.js
│   └── package.json
│
└── README.md