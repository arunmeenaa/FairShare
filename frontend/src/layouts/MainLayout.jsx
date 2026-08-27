import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";

const MainLayout = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;