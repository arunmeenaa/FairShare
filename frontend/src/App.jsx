import { Routes, Route, Navigate } from "react-router-dom";

import MainLayout from "./layouts/MainLayout";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

import Dashboard from "./pages/dashboard/Dashboard";

import RecentExpenses from "./pages/expenses/RecentExpenses";
import CreateExpense from "./pages/expenses/CreateExpense";
import ExpenseDetails from "./pages/expenses/ExpenseDetail";

import Settlement from "./pages/settlement/Settlement";
import Members from "./pages/members/Members";
import Availability from "./components/Availability";
import Profile from "./pages/profile/Profile";

import PublicRoute from "./components/PublicRoute";
import PrivateRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Routes>
      {/* ================= PUBLIC ================= */}

      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* ================= PROTECTED ================= */}

      <Route element={<PrivateRoute />}>
        <Route element={<MainLayout />}>
          {/* Dashboard */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Expenses */}
          <Route path="/expenses" element={<RecentExpenses />} />

          <Route path="/expenses/new" element={<CreateExpense />} />

          <Route path="/expenses/:expenseId" element={<ExpenseDetails />} />

          {/* Other */}
          <Route path="/settlement" element={<Settlement />} />

          <Route path="/members" element={<Members />} />

          <Route path="/availability" element={<Availability />} />

          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>

      {/* ================= UNKNOWN URL ================= */}

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
