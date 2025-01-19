import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { createClient } from '@supabase/supabase-js';
import Header from '../components/layout/Header';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import { useComplaints } from '../context/ComplaintContext';

// تهيئة عميل Supabase
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL, 
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { 
    complaints: contextComplaints, 
    fetchComplaintDetails,
    getStatusText,
    getStatusColor 
  } = useComplaints();

  const [complaints, setComplaints] = useState([]);
  const [complaintToDelete, setComplaintToDelete] = useState(null);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [selectedComplaints, setSelectedComplaints] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // إضافة حالات الفلتر الجديدة
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState({
    startDate: '',
    endDate: ''
  });
  const [priorityFilter, setPriorityFilter] = useState('');

  // مراجع للتحكم في حالة المكون
  const isMountedRef = useRef(true);
  const isInitialLoadRef = useRef(true);

  // دالة جلب الشكاوى من Supabase
  const fetchComplaints = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      setLoading(true);
      let query = supabase.from('complaints').select('*');

      // تطبيق الفلاتر
      if (statusFilter) query = query.eq('status', statusFilter);
      if (categoryFilter) query = query.eq('category', categoryFilter);
      if (priorityFilter) query = query.eq('priority', priorityFilter);
      
      // فلتر التاريخ
      if (dateRangeFilter.startDate) {
        query = query.gte('date', new Date(dateRangeFilter.startDate).toISOString());
      }
      if (dateRangeFilter.endDate) {
        query = query.lte('date', new Date(dateRangeFilter.endDate).toISOString());
      }

      // الترتيب حسب التاريخ
      query = query.order('date', { ascending: false });

      const { data, error } = await query;

      if (!isMountedRef.current) return;

      if (error) {
        toast.error('خطأ في جلب الشكاوى');
        console.error('Supabase Error:', error);
        return;
      }

      // تحديث الشكاوى في Context
      data.forEach(complaint => {
        fetchComplaintDetails(complaint.id);
      });

      setComplaints(data || []);
    } catch (err) {
      if (!isMountedRef.current) return;
      toast.error('حدث خطأ غير متوقع');
      console.error(err);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        isInitialLoadRef.current = false;
      }
    }
  }, [statusFilter, categoryFilter, priorityFilter, dateRangeFilter, fetchComplaintDetails]);

  // استخدام useEffect للتحميل الأولي وتطبيق الفلاتر
  useEffect(() => {
    fetchComplaints();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchComplaints]);

  // استخدام useEffect لتحديث الشكاوى من Context
  useEffect(() => {
    // تحويل الشكاوى من Context إلى مصفوفة
    const complaintsArray = Object.values(contextComplaints);
    
    // تحديث الشكاوى إذا كانت هناك تغييرات
    if (complaintsArray.length > 0) {
      setComplaints(complaintsArray);
    }
  }, [contextComplaints]);

  // التحقق من حالة تسجيل الدخول
  const checkAdminLogin = useCallback(async () => {
    try {
      // التحقق من جلسة Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        localStorage.removeItem('isAdminLoggedIn');
        navigate('/admin/login');
        return false;
      }

      // التحقق من أن المستخدم مسؤول
      const userEmail = session.user?.email;
      const allowedEmails = [
        'admin@yourapp.com',  // البريد الرئيسي
        session.user?.email   // السماح بالبريد الحالي للمستخدم
      ]; 

      // طباعة البريد الإلكتروني للتأكد
      console.log('Current User Email:', userEmail);

      if (!allowedEmails.includes(userEmail)) {
        await supabase.auth.signOut();
        localStorage.removeItem('isAdminLoggedIn');
        toast.error(`غير مصرح لك بالوصول: ${userEmail}`);
        navigate('/admin/login');
        return false;
      }

      return true;
    } catch (error) {
      console.error('خطأ في التحقق من تسجيل الدخول:', error);
      localStorage.removeItem('isAdminLoggedIn');
      navigate('/admin/login');
      return false;
    }
  }, [navigate]);

  // استخدام useEffect مع التحكم الدقيق في التحميل
  useEffect(() => {
    isMountedRef.current = true;

    const initializeDashboard = async () => {
      const isLoggedIn = await checkAdminLogin();
      
      if (isLoggedIn && isMountedRef.current && isInitialLoadRef.current) {
        await fetchComplaints();
      }
    };

    initializeDashboard();

    // تنظيف المكون
    return () => {
      isMountedRef.current = false;
    };
  }, [checkAdminLogin, fetchComplaints]);

  // دالة حذف شكوى
  const handleDeleteComplaint = async () => {
    if (!complaintToDelete) return;

    try {
      setLoading(true);
      
      // طباعة معلومات الشكوى المراد حذفها
      console.log('Attempting to delete complaint:', complaintToDelete);

      // حذف الرسائل المرتبطة بالشكوى أولاً
      const { data: messagesData, error: messagesDeleteError } = await supabase
        .from('complaint_messages')
        .delete()
        .eq('complaint_id', complaintToDelete.id)
        .select();

      if (messagesDeleteError) {
        toast.error(`خطأ في حذف رسائل الشكوى: ${messagesDeleteError.message}`);
        console.error('Messages Delete Error:', messagesDeleteError);
        return;
      }

      console.log('Deleted Messages:', messagesData);

      // التحقق من حذف جميع الرسائل
      const { count: remainingMessagesCount, error: countError } = await supabase
        .from('complaint_messages')
        .select('*', { count: 'exact' })
        .eq('complaint_id', complaintToDelete.id);

      if (countError) {
        console.error('Error checking remaining messages:', countError);
      } else {
        console.log('Remaining Messages Count:', remainingMessagesCount);
        
        // إذا كانت هناك رسائل متبقية، حاول حذفها مرة أخرى
        if (remainingMessagesCount > 0) {
          const { error: forceDeleteError } = await supabase
            .from('complaint_messages')
            .delete()
            .eq('complaint_id', complaintToDelete.id);

          if (forceDeleteError) {
            console.error('Force Delete Messages Error:', forceDeleteError);
          }
        }
      }

      // حذف الشكوى من Supabase
      const { data, error } = await supabase
        .from('complaints')
        .delete()
        .eq('id', complaintToDelete.id)
        .select(); // إضافة select للحصول على المزيد من المعلومات

      // طباعة نتيجة الحذف
      console.log('Delete Result:', { data, error });

      if (error) {
        toast.error(`خطأ في حذف الشكوى: ${error.message}`);
        console.error('Delete Error Details:', error);
        return;
      }

      // التحقق من نجاح الحذف
      if (!data || data.length === 0) {
        toast.error('لم يتم العثور على الشكوى أو حذفها');
        console.warn('No data returned after delete');
      }

      // تحديث القائمة المحلية
      const updatedComplaints = complaints.filter(complaint => complaint.id !== complaintToDelete.id);
      setComplaints(updatedComplaints);
      
      // إغلاق المودال
      setShowDeleteModal(false);
      setComplaintToDelete(null);

      toast.success('تم حذف الشكوى بنجاح');

      // إعادة جلب الشكاوى للتأكد
      await fetchComplaints();
    } catch (err) {
      console.error('Unexpected delete error:', err);
      toast.error('حدث خطأ غير متوقع أثناء الحذف');
    } finally {
      setLoading(false);
    }
  };

  // دالة عرض تفاصيل الشكوى
  const renderComplaintDetails = (complaint) => {
    if (!complaint) {
      toast.error('الشكوى غير موجودة');
      return null;
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">تفاصيل الشكوى</h2>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="text-gray-600 hover:text-gray-900"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* معلومات الشكوى الأساسية */}
            <div className="mb-4">
              <p className="text-sm text-gray-600">رقم الشكوى: {complaint.id}</p>
              <h3 className="text-xl font-semibold text-gray-800 mt-2">{complaint.title}</h3>
              <p className="text-gray-600 mt-1">{complaint.description}</p>
            </div>

            {/* تفاصيل إضافية */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500">الفئة:</p>
                <p className="font-medium">{complaint.category}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">الأولوية:</p>
                <p className="font-medium">{complaint.priority}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">الحالة:</p>
                <p className="font-medium">{complaint.status}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">تاريخ التقديم:</p>
                <p className="font-medium">{new Date(complaint.date).toLocaleString()}</p>
              </div>
            </div>

            {/* الرسائل */}
            {complaint.messages && complaint.messages.length > 0 && (
              <div className="mt-6">
                <h4 className="text-lg font-semibold mb-3">الرسائل</h4>
                <div className="space-y-3">
                  {complaint.messages.map((message) => (
                    <div 
                      key={message.id} 
                      className="bg-gray-100 p-3 rounded-lg"
                    >
                      <p className="text-gray-800">{message.content}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(message.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedComplaint(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors duration-300 flex items-center"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // تعديل دالة فتح تفاصيل الشكوى
  const openComplaintDetails = async (complaint) => {
    try {
      // تعيين حالة التحميل
      setLoading(true);

      // جلب تفاصيل الشكوى
      const complaintDetails = await fetchComplaintDetails(complaint.id);

      if (complaintDetails) {
        setSelectedComplaint(complaintDetails);
      }
    } catch (err) {
      console.error('Error opening complaint details:', err);
      toast.error('حدث خطأ أثناء فتح تفاصيل الشكوى');
    } finally {
      setLoading(false);
    }
  };

  // دالة إرسال رسالة
  const handleSendMessage = async (complaintId, messageText) => {
    try {
      const { data, error } = await supabase
        .from('complaint_messages')
        .insert({
          complaint_id: complaintId,
          text: messageText,
          sender: 'admin',
          timestamp: new Date().toISOString()
        })
        .select();

      if (error) {
        toast.error('خطأ في إرسال الرسالة');
        return null;
      }

      // تحديث الرسائل في الشكوى المحددة
      if (selectedComplaint && selectedComplaint.id === complaintId) {
        setSelectedComplaint(prev => ({
          ...prev,
          messages: [...(prev.messages || []), data[0]]
        }));
      }

      return data[0];
    } catch (err) {
      toast.error('حدث خطأ غير متوقع');
      console.error(err);
      return null;
    }
  };

  // دالة تسجيل الخروج
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        toast.error('خطأ في تسجيل الخروج');
        return;
      }

      toast.success('تم تسجيل الخروج بنجاح');
      navigate('/admin/login');
    } catch (err) {
      toast.error('حدث خطأ غير متوقع');
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* الفلاتر */}
        <div className="mb-6 bg-white shadow-lg rounded-xl p-6 border-2 border-gray-100">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
            أدوات البحث والتصفية
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* فلتر الحالة */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                حالة الشكوى
              </label>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    fetchComplaints(); // تحديث الشكاوى عند تغيير الفلتر
                  }}
                  className="block w-full pl-3 pr-10 py-2.5 text-base border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg appearance-none"
                >
                  <option value="">جميع الحالات</option>
                  <option value="pending">قيد الانتظار</option>
                  <option value="in-progress">قيد المعالجة</option>
                  <option value="resolved">تم الحل</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-2 text-gray-700">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* فلتر الفئة */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                فئة الشكوى
              </label>
              <div className="relative">
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    fetchComplaints(); // تحديث الشكاوى عند تغيير الفلتر
                  }}
                  className="block w-full pl-3 pr-10 py-2.5 text-base border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg appearance-none"
                >
                  <option value="">جميع الفئات</option>
                  <option value="suggestion">اقتراح</option>
                  <option value="operations">عمليات</option>
                  <option value="ambulance">اسعاف</option>
                  <option value="center">خاص بالمركز</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-2 text-gray-700">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* فلتر التاريخ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                نطاق التاريخ
              </label>
              <div className="flex space-x-2 space-x-reverse">
                <div className="w-1/2 relative">
                  <div
                    className="border-2 border-gray-300 rounded-lg p-2.5 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('startDate').showPicker();
                    }}
                  >
                    <span className="text-sm text-gray-600">
                      {dateRangeFilter.startDate
                        ? new Date(dateRangeFilter.startDate).toLocaleDateString('ar-EG', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })
                        : 'من تاريخ'}
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="date"
                    id="startDate"
                    value={dateRangeFilter.startDate}
                    onChange={(e) => setDateRangeFilter(prev => ({...prev, startDate: e.target.value}))}
                    className="absolute opacity-0 pointer-events-none inset-0 w-full h-full"
                  />
                </div>
                <div className="w-1/2 relative">
                  <div
                    className="border-2 border-gray-300 rounded-lg p-2.5 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('endDate').showPicker();
                    }}
                  >
                    <span className="text-sm text-gray-600">
                      {dateRangeFilter.endDate
                        ? new Date(dateRangeFilter.endDate).toLocaleDateString('ar-EG', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })
                        : 'إلى تاريخ'}
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="date"
                    id="endDate"
                    value={dateRangeFilter.endDate}
                    onChange={(e) => setDateRangeFilter(prev => ({...prev, endDate: e.target.value}))}
                    className="absolute opacity-0 pointer-events-none inset-0 w-full h-full"
                  />
                </div>
              </div>
            </div>

            {/* فلتر الأولوية */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                أولوية الشكوى
              </label>
              <div className="relative">
                <select
                  value={priorityFilter}
                  onChange={(e) => {
                    setPriorityFilter(e.target.value);
                    fetchComplaints(); // تحديث الشكاوى عند تغيير الفلتر
                  }}
                  className="block w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-300 appearance-none"
                >
                  <option value="">جميع الأولويات</option>
                  <option value="normal">عادي</option>
                  <option value="urgent">عاجل</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-3 text-gray-700">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* زر المسح */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                setStatusFilter('');
                setCategoryFilter('');
                setDateRangeFilter({ startDate: '', endDate: '' });
                setPriorityFilter('');
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-300 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              مسح الفلاتر
            </button>
          </div>
        </div>

        {complaints.length > 0 && (
          <div className="mb-4 flex justify-between items-center">
            <div className="flex items-center space-x-4 space-x-reverse">
              {selectedComplaints.length > 0 && (
                <button
                  onClick={() => handleDeleteComplaint()}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                >
                  حذف المحدد ({selectedComplaints.length})
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">لوحة تحكم المسؤول</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
          >
            تسجيل الخروج
          </button>
        </div>

        {/* إحصائيات */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">إجمالي الشكاوى</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">{complaints.length}</dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">قيد المعالجة</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">
                {complaints.filter(c => c.status === 'in-progress').length}
              </dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">تم حلها</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">
                {complaints.filter(c => c.status === 'resolved').length}
              </dd>
            </div>
          </div>
        </div>

        {/* جدول الشكاوى */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              قائمة الشكاوى ({complaints.length} شكوى)
            </h3>
          </div>
          <div className="border-t border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-right">
                      <input
                        type="checkbox"
                        checked={selectedComplaints.length === complaints.length}
                        onChange={() => setSelectedComplaints(complaints.map(c => c.id))}
                        className="form-checkbox h-4 w-4 text-indigo-600"
                      />
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      رقم الشكوى
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      العنوان
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      التصنيف
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الأولوية
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الحالة
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      التاريخ
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الإجراءات
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      عرض التفاصيل
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {complaints.map((complaint) => (
                    <tr key={complaint.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedComplaints.includes(complaint.id)}
                          onChange={() => setSelectedComplaints(prev => {
                            if (prev.includes(complaint.id)) {
                              return prev.filter(id => id !== complaint.id);
                            } else {
                              return [...prev, complaint.id];
                            }
                          })}
                          className="form-checkbox h-4 w-4 text-indigo-600"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {complaint.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {complaint.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {complaint.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {complaint.priority === 'urgent' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            عاجل
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            عادي
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(complaint.status)}`}>
                          {getStatusText(complaint.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(complaint.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2 space-x-reverse">
                        <button
                          onClick={() => {
                            setComplaintToDelete(complaint);
                            setShowDeleteModal(true);
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <button
                          onClick={() => {
                            // تأكيد مسار التنقل لصفحة تفاصيل الشكوى
                            navigate(`/admin/complaints/${complaint.id}`, { replace: true });
                          }}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          عرض التفاصيل
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      {selectedComplaint && renderComplaintDetails(selectedComplaint)}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <h2 className="text-xl font-bold mb-4">تأكيد الحذف</h2>
            <p className="mb-4">هل أنت متأكد من حذف هذه الشكوى؟</p>
            <div className="flex justify-between">
              <button 
                onClick={handleDeleteComplaint}
                className="btn btn-error"
              >
                نعم، احذف
              </button>
              <button 
                onClick={() => {
                  setShowDeleteModal(false);
                  setComplaintToDelete(null);
                }}
                className="btn btn-ghost"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
