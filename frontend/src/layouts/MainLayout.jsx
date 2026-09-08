import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";

const MainLayout = () => {
  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50 dark:bg-slate-950">
      <Navbar />

      <main className="min-h-screen w-full max-w-full overflow-x-hidden pb-28 lg:pb-0">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;