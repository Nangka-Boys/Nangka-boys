import React, { useState } from 'react';
import { 
  Home, Heart, Building2, Shield, User, LogIn, LogOut, Menu, X, Compass 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Navbar({ activeTab, setActiveTab, onOpenAuth, onOpenProfile, favoritesCount = 0 }) {
  const { currentUser, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#e7e4dc] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Brand Logo */}
          <div 
            onClick={() => handleTabClick('browse')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-[#1c3f2d] flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform duration-200">
              <Compass className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="font-serif text-lg sm:text-xl font-bold tracking-tight text-stone-900 leading-tight">
                Dapitan Boarding
              </div>
              <div className="text-[10px] uppercase font-bold tracking-widest text-[#c86236]">
                City Finder & Registry
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1.5 bg-[#faf8f5] p-1.5 rounded-2xl border border-[#e7e4dc]">
            <button
              onClick={() => handleTabClick('browse')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'browse'
                  ? 'bg-white text-stone-900 shadow-xs border border-[#e7e4dc]'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>Browse Houses</span>
            </button>

            {currentUser && (
              <button
                onClick={() => handleTabClick('favorites')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'favorites'
                    ? 'bg-white text-stone-900 shadow-xs border border-[#e7e4dc]'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
                }`}
              >
                <Heart className="w-4 h-4 text-rose-500" />
                <span>Favorites</span>
                {favoritesCount > 0 && (
                  <span className="bg-rose-100 text-rose-700 text-xs px-2 py-0.5 rounded-full font-bold">
                    {favoritesCount}
                  </span>
                )}
              </button>
            )}

            {currentUser && (
              <button
                onClick={() => handleTabClick('owner')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'owner'
                    ? 'bg-white text-stone-900 shadow-xs border border-[#e7e4dc]'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
                }`}
              >
                <Building2 className="w-4 h-4 text-[#1c3f2d]" />
                <span>Owner Portal</span>
              </button>
            )}

            {currentUser && currentUser.role === 'admin' && (
              <button
                onClick={() => handleTabClick('admin')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'admin'
                    ? 'bg-[#1c3f2d] text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
                }`}
              >
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Admin Console</span>
              </button>
            )}
          </nav>

          {/* User Controls */}
          <div className="hidden md:flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2.5">
                <button
                  onClick={onOpenProfile}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-stone-50 border border-stone-200 hover:border-stone-300 hover:bg-stone-100 transition-all text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#1c3f2d] text-white font-bold flex items-center justify-center text-xs">
                    {currentUser.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-stone-900 leading-tight flex items-center gap-1">
                      <span>{currentUser.full_name}</span>
                      {currentUser.role === 'admin' && (
                        <span className="bg-emerald-100 text-[#1c3f2d] text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
                          ADMIN
                        </span>
                      )}
                      {currentUser.role === 'owner' && (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
                          OWNER
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-stone-500 truncate max-w-[130px]">{currentUser.email}</div>
                  </div>
                </button>

                <button
                  onClick={logout}
                  title="Log out"
                  className="p-2 rounded-xl text-stone-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenAuth('login')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-stone-700 hover:text-stone-900 hover:bg-stone-100 transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Log in</span>
                </button>
                <button
                  onClick={() => onOpenAuth('register')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-[#1c3f2d] text-white hover:bg-[#142e21] shadow-xs hover:shadow-md transition-all"
                >
                  <span>Sign up</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-stone-700 hover:bg-stone-100 transition-all"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#e7e4dc] bg-white px-4 pt-3 pb-6 space-y-3 animate-in fade-in duration-200">
          <div className="grid gap-1">
            <button
              onClick={() => handleTabClick('browse')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-left ${
                activeTab === 'browse' ? 'bg-[#1c3f2d] text-white' : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              <Home className="w-5 h-5" />
              <span>Browse Boarding Houses</span>
            </button>

            {currentUser && (
              <button
                onClick={() => handleTabClick('favorites')}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-left ${
                  activeTab === 'favorites' ? 'bg-[#1c3f2d] text-white' : 'text-stone-700 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Heart className="w-5 h-5 text-rose-500" />
                  <span>My Favorites</span>
                </div>
                {favoritesCount > 0 && (
                  <span className="bg-rose-100 text-rose-700 text-xs px-2 py-0.5 rounded-full font-bold">
                    {favoritesCount}
                  </span>
                )}
              </button>
            )}

            {currentUser && (
              <button
                onClick={() => handleTabClick('owner')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-left ${
                  activeTab === 'owner' ? 'bg-[#1c3f2d] text-white' : 'text-stone-700 hover:bg-stone-100'
                }`}
              >
                <Building2 className="w-5 h-5 text-[#c86236]" />
                <span>Owner Portal</span>
              </button>
            )}

            {currentUser && currentUser.role === 'admin' && (
              <button
                onClick={() => handleTabClick('admin')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-left ${
                  activeTab === 'admin' ? 'bg-[#1c3f2d] text-white' : 'text-stone-700 hover:bg-stone-100'
                }`}
              >
                <Shield className="w-5 h-5 text-emerald-400" />
                <span>Admin Console & Audit Trail</span>
              </button>
            )}
          </div>

          <div className="pt-3 border-t border-stone-200">
            {currentUser ? (
              <div className="space-y-2">
                <button
                  onClick={() => { onOpenProfile(); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-left text-sm font-bold text-stone-800"
                >
                  <User className="w-5 h-5 text-stone-500" />
                  <div>
                    <div>{currentUser.full_name}</div>
                    <div className="text-xs font-normal text-stone-500">{currentUser.email}</div>
                  </div>
                </button>
                <button
                  onClick={() => { logout(); setMobileMenuOpen(false); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log out</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { onOpenAuth('login'); setMobileMenuOpen(false); }}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-stone-800 bg-stone-100 text-center"
                >
                  Log in
                </button>
                <button
                  onClick={() => { onOpenAuth('register'); setMobileMenuOpen(false); }}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#1c3f2d] text-center"
                >
                  Sign up
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
