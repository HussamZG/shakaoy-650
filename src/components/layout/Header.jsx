import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import toast from 'react-hot-toast';

// تهيئة عميل Supabase
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL, 
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn') === 'true';

  const isActivePath = (path) => {
    return location.pathname === path;
  };

  const handleLogout = async () => {
    try {
      // تسجيل الخروج من Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        toast.error('حدث خطأ أثناء تسجيل الخروج');
        console.error('Logout error:', error);
      }

      // إزالة الجلسة المحلية
      localStorage.removeItem('isAdminLoggedIn');
      
      // التنقل إلى الصفحة الرئيسية
      navigate('/');
      toast.success('تم تسجيل الخروج بنجاح');
    } catch (err) {
      console.error('Unexpected logout error:', err);
      toast.error('حدث خطأ غير متوقع');
    }
  };

  return (
    <header className="bg-white shadow-md relative">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex">
            <Link to="/" className="flex items-center">
              <span className="text-xl font-bold text-gray-800">منصة الشكاوي السرية</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-4 md:space-x-reverse">
            <Link
              to="/"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                isActivePath('/') 
                  ? 'bg-indigo-100 text-indigo-700' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              الرئيسية
            </Link>
            
            <Link
              to="/submit"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                isActivePath('/submit')
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              تقديم شكوى
            </Link>
            
            <Link
              to="/track"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                isActivePath('/track')
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              متابعة شكوى
            </Link>

            {isAdminLoggedIn ? (
              <>
                <Link
                  to="/admin/dashboard"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActivePath('/admin/dashboard')
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  لوحة التحكم
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  تسجيل خروج
                </button>
              </>
            ) : (
              <Link
                to="/admin/login"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActivePath('/admin/login')
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                دخول المسؤول
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            >
              <span className="sr-only">فتح القائمة</span>
              {isMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <Link
                to="/"
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActivePath('/') 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                الرئيسية
              </Link>
              
              <Link
                to="/submit"
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActivePath('/submit')
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                تقديم شكوى
              </Link>
              
              <Link
                to="/track"
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActivePath('/track')
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                متابعة شكوى
              </Link>

              {isAdminLoggedIn ? (
                <>
                  <Link
                    to="/admin/dashboard"
                    className={`block px-3 py-2 rounded-md text-base font-medium ${
                      isActivePath('/admin/dashboard')
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    لوحة التحكم
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="block w-full text-right px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50"
                  >
                    تسجيل خروج
                  </button>
                </>
              ) : (
                <Link
                  to="/admin/login"
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    isActivePath('/admin/login')
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  دخول المسؤول
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header;
