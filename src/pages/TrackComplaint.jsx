import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { createClient } from '@supabase/supabase-js';

// تهيئة عميل Supabase
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL, 
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const TrackComplaint = () => {
  const [searchParams] = useSearchParams();
  const [complaintId, setComplaintId] = useState(searchParams.get('id') || '');
  const [complaintData, setComplaintData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // جلب بيانات الشكوى من Supabase
  const fetchComplaintData = async (id) => {
    try {
      // جلب تفاصيل الشكوى
      const { data: complaint, error: complaintError } = await supabase
        .from('complaints')
        .select('*')
        .eq('id', id)
        .single();

      if (complaintError) {
        toast.error('خطأ في جلب بيانات الشكوى');
        return null;
      }

      // جلب الرسائل المرتبطة بالشكوى
      const { data: complainMessages, error: messagesError } = await supabase
        .from('complaint_messages')
        .select('*')
        .eq('complaint_id', id)
        .order('timestamp', { ascending: true });

      if (messagesError) {
        toast.error('خطأ في جلب رسائل الشكوى');
        return null;
      }

      return { complaint, messages: complainMessages };
    } catch (err) {
      toast.error('حدث خطأ غير متوقع');
      console.error(err);
      return null;
    }
  };

  // التحقق من وجود معرف شكوى في الرابط
  useEffect(() => {
    const loadComplaint = async () => {
      const id = searchParams.get('id');
      if (id) {
        setLoading(true);
        const result = await fetchComplaintData(id);
        if (result) {
          setComplaintData(result.complaint);
          setMessages(result.messages);
        }
        setLoading(false);
      }
    };

    loadComplaint();
  }, [searchParams]);

  const handleTrackComplaint = async (e) => {
    e.preventDefault();
    if (!complaintId.trim()) {
      toast.error('الرجاء إدخال رقم الشكوى');
      return;
    }

    setLoading(true);
    const result = await fetchComplaintData(complaintId);
    
    if (result) {
      setComplaintData(result.complaint);
      setMessages(result.messages);
    } else {
      toast.error('لم يتم العثور على الشكوى');
    }
    setLoading(false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) {
      toast.error('الرجاء كتابة رسالة');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('complaint_messages')
        .insert({
          complaint_id: complaintId,
          text: newMessage,
          sender: 'user', // يمكنك تعديل هذا حسب نظام المصادقة الخاص بك
          timestamp: new Date().toISOString()
        })
        .select();

      if (error) {
        toast.error('فشل إرسال الرسالة');
        return;
      }

      // إضافة الرسالة الجديدة إلى القائمة
      setMessages(prevMessages => [...prevMessages, data[0]]);
      setNewMessage('');
    } catch (err) {
      toast.error('حدث خطأ غير متوقع');
      console.error(err);
    }
  };

  const getCategoryText = (category) => {
    const categories = {
      'technical': 'مشكلة تقنية',
      'administrative': 'شكوى إدارية',
      'financial': 'شكوى مالية',
      'other': 'أخرى'
    };
    return categories[category] || category;
  };

  const getStatusColor = (status) => {
    const statusColors = {
      'pending': 'bg-yellow-50 text-yellow-800 border border-yellow-200',
      'in-progress': 'bg-blue-50 text-blue-800 border border-blue-200',
      'resolved': 'bg-green-50 text-green-800 border border-green-200'
    };
    return statusColors[status] || 'bg-gray-50 text-gray-800';
  };

  const getStatusText = (status) => {
    const statuses = {
      'pending': 'قيد الانتظار',
      'in-progress': 'قيد المعالجة',
      'resolved': 'تم الحل'
    };
    return statuses[status] || status;
  };

  return (
    <div className="min-h-screen bg-gray-100 p-2 sm:p-4 md:p-6 lg:p-8">
      <Toaster position="top-left" reverseOrder={false} />
      
      <div className="container mx-auto max-w-full sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-6xl px-2 sm:px-4 py-4 sm:py-8">
        {/* رقم الشكوى */}
        <div className="bg-white shadow-xl rounded-2xl mb-4 sm:mb-6 overflow-hidden">
          <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800">
              متابعة الشكوى
            </h3>
          </div>
          <div className="p-4 sm:p-6">
            <form onSubmit={handleTrackComplaint} className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 sm:space-x-reverse">
              <input
                type="text"
                value={complaintId}
                onChange={(e) => setComplaintId(e.target.value)}
                placeholder="أدخل رقم الشكوى"
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'جاري البحث...' : 'متابعة'}
              </button>
            </form>
          </div>
        </div>

        {complaintData && (
          <>
            {/* تفاصيل الشكوى */}
            <div className="bg-white shadow-xl rounded-2xl mb-4 sm:mb-6 overflow-hidden">
              <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-800">
                    {complaintData.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    رقم الشكوى: {complaintData.id}
                  </p>
                </div>
                <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${getStatusColor(complaintData.status)}`}>
                  {getStatusText(complaintData.status)}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 p-4 sm:p-6">
                {/* معلومات أساسية */}
                <div className="md:col-span-2 space-y-4 sm:space-y-6">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-2">
                      التفاصيل
                    </label>
                    <div className="bg-gray-50 p-2 sm:p-3 rounded-lg border border-gray-200 text-gray-900 min-h-[100px] sm:min-h-[150px]">
                      {complaintData.description}
                    </div>
                  </div>

                  {/* المرفقات */}
                  {complaintData.attachment && (
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-2">
                        المرفقات
                      </label>
                      <div className="bg-gray-50 p-2 sm:p-3 rounded-lg border border-gray-200 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-6 sm:w-6 text-gray-500 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        <a 
                          href={complaintData.attachment} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-indigo-600 text-xs sm:text-sm hover:text-indigo-800 hover:underline"
                        >
                          عرض المرفق
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* معلومات إضافية */}
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-2">
                      التصنيف
                    </label>
                    <div className="bg-gray-50 p-2 sm:p-3 rounded-lg border border-gray-200 text-gray-900 text-xs sm:text-sm">
                      {getCategoryText(complaintData.category)}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-2">
                      تاريخ التقديم
                    </label>
                    <div className="bg-gray-50 p-2 sm:p-3 rounded-lg border border-gray-200 text-center text-gray-900 text-xs sm:text-sm">
                      {new Date(complaintData.date).toLocaleDateString('ar-EG', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-2">
                      الأولوية
                    </label>
                    <div className={`p-2 sm:p-3 rounded-lg text-center text-xs sm:text-sm ${
                      complaintData.priority === 'urgent' 
                        ? 'bg-red-50 text-red-800 border border-red-200' 
                        : 'bg-green-50 text-green-800 border border-green-200'
                    }`}>
                      {complaintData.priority === 'urgent' ? 'عاجل' : 'عادي'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* المحادثة */}
            <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
              <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800">
                  المحادثة
                </h3>
              </div>
              
              <div className="p-4 sm:p-6">
                <div className="space-y-3 sm:space-y-4 max-h-[300px] sm:max-h-[400px] overflow-y-auto mb-4 sm:mb-6">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex items-start space-x-2 sm:space-x-3 space-x-reverse ${
                        message.sender === 'user' ? 'flex-row-reverse' : ''
                      }`}
                    >
                      <div className={`p-2 sm:p-3 rounded-lg max-w-[80%] text-xs sm:text-sm ${
                        message.sender === 'user' 
                          ? 'bg-indigo-50 text-indigo-800 rounded-tr-none' 
                          : 'bg-gray-200 text-gray-900 rounded-tl-none'
                      }`}>
                        <p>{message.text}</p>
                        <span className="block text-[10px] sm:text-xs text-gray-500 mt-1 text-left">
                          {new Date(message.timestamp).toLocaleTimeString('ar-EG', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* نموذج الرد */}
                <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 sm:space-x-reverse">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="اكتب ردك هنا..."
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button 
                    type="submit"
                    className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                  >
                    إرسال
                  </button>
                </form>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TrackComplaint;
