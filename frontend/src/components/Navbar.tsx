import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Menu, X, BarChart3, Sprout, Eye, Warehouse, LogOut, UserCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { LuBug } from "react-icons/lu";
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();

  const navItems = [
    { path: '/warehouse', icon: Warehouse, label: 'My Storage' },
    { path: '/consult', icon: Eye, label: 'E-Consult' },
    { path: '/monitor', icon: LuBug, label: 'Monitoring' },
    { path: '/market', icon: BarChart3, label: 'Market Insights' },
  ];

  return (
    <nav className="fixed top-0 right-0 left-0 z-50 shadow-md backdrop-blur-md bg-white/80">
      <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex-shrink-0">
            <NavLink
              to="/"
              className="flex items-center space-x-3 group"
            >
              <div className="p-2 rounded-lg transition-colors bg-[#FDE7B3]/30 group-hover:bg-[#FDE7B3]/50">
                <Sprout className="w-8 h-8 text-[#63A361]" />
              </div>
              <span className="text-2xl font-bold text-[#5B532C]">
                Kisan AI
              </span>
            </NavLink>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-6">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    'hover:text-[#63A361] hover:bg-[#FDE7B3]/20',
                    isActive
                      ? 'text-[#63A361] bg-[#FDE7B3]/20'
                      : 'text-[#5B532C]/80'
                  )
                }
              >
                <item.icon className="mr-2 w-5 h-5" />
                {item.label}
              </NavLink>
            ))}

            {/* Auth section */}
            {isAuthenticated ? (
              <div className="flex items-center gap-3 ml-4 pl-4 border-l border-[#5B532C]/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#63A361]/10 flex items-center justify-center">
                    <UserCircle className="w-5 h-5 text-[#63A361]" />
                  </div>
                  <span className="text-sm font-medium text-[#5B532C]/70 max-w-[100px] truncate">
                    {user?.name}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="p-2 rounded-lg text-[#5B532C]/40 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="ml-4 px-4 py-2 bg-[#63A361] text-white rounded-xl text-sm font-semibold hover:bg-[#578f55] transition-colors"
              >
                Login
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex justify-center items-center p-2 text-[#5B532C] rounded-lg transition-colors hover:text-[#63A361] hover:bg-[#FDE7B3]/20 focus:outline-none focus:ring-2 focus:ring-[#63A361]"
            >
              {isOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="border-t backdrop-blur-md bg-white/95 md:hidden"
          >
            <div className="px-4 pt-3 pb-4 space-y-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'block px-4 py-3 rounded-lg text-base font-medium transition-all duration-200',
                      'hover:text-[#63A361] hover:bg-[#FDE7B3]/20',
                      isActive
                        ? 'text-[#63A361] bg-[#FDE7B3]/20'
                        : 'text-[#5B532C]/80'
                    )
                  }
                >
                  <div className="flex items-center">
                    <item.icon className="mr-3 w-5 h-5" />
                    {item.label}
                  </div>
                </NavLink>
              ))}

              {/* Mobile auth */}
              {isAuthenticated ? (
                <div className="pt-2 border-t border-[#5B532C]/10">
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                      <UserCircle className="w-5 h-5 text-[#63A361]" />
                      <span className="text-sm font-medium text-[#5B532C]/70">{user?.name}</span>
                    </div>
                    <button
                      onClick={() => { logout(); setIsOpen(false); }}
                      className="text-sm text-red-500 font-medium"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-3 text-center bg-[#63A361] text-white rounded-xl font-semibold mt-2"
                >
                  Login
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
