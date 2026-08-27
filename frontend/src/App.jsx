import { Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

import Dashboard from "./pages/dashboard/Dashboard";
import Expenses from "./pages/expenses/Expenses";
import Settlement from "./pages/settlement/Settlement";
import Members from "./pages/members/Members";
import Availability from "./components/Availability";
import ExpenseDetails from "./pages/expenses/ExpenseDetail";
import Profile from "./pages/profile/Profile";

import PublicRoute from "./components/PublicRoute";
import PrivateRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Routes>
      {/* Public */}

      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />
      </Route>

      {/* Protected */}

      <Route element={<PrivateRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />

          <Route path="/expenses" element={<Expenses />} />

          <Route path="/expenses/:expenseId" element={<ExpenseDetails />} />

          <Route path="/settlement" element={<Settlement />} />

          <Route path="/members" element={<Members />} />

          <Route path="/profile" element={<Profile />} />

          <Route path="/availability" element={<Availability />} />
        </Route>
      </Route>

      {/* Unknown URL */}

      <Route path="*" element={<Dashboard />} />
    </Routes>
  );
}

export default App;
