import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import toast from 'react-hot-toast';
import Header from '../components/layout/Header';
import { useComplaints } from '../context/ComplaintContext';

// تهيئة عميل Supabase
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL, 
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const AdminComplaintDetails = () => {
  const { complaintId } = useParams();
  const navigate = useNavigate();
  const { 
    complaints, 
    updateComplaintStatus, 
    fetchComplaintDetails,
    getStatusText,
    addComplaintMessage
  } = useComplaints();
  
  const [complaint, setComplaint] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLogs, setActionLogs] = useState([]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');

  // تأثير لتحميل تفاصيل الشكوى والرسائل
  useEffect(() => {
    const loadComplaintDetails = async () => {
      // محاولة جلب الشكوى من Context أولاً
      const existingComplaint = complaints[complaintId];
      
      if (existingComplaint) {
        setComplaint(existingComplaint);
        setMessages(existingComplaint.complaint_messages || []);
        setActionLogs(existingComplaint.complaint_action_logs || []);
        setLoading(false);
      } else {
        // جلب تفاصيل الشكوى إذا لم تكن موجودة
        const details = await fetchComplaintDetails(complaintId);
        
        if (details) {
          setComplaint(details);
          setMessages(details.complaint_messages || []);
          setActionLogs(details.complaint_action_logs || []);
        }
        
        setLoading(false);
      }
    };

    loadComplaintDetails();
  }, [complaintId, complaints, fetchComplaintDetails]);

  // تأثير للاشتراك في التحديثات Realtime للرسائل
  useEffect(() => {
    // إنشاء قناة Realtime للرسائل
    const messagesChannel = supabase
      .channel(`complaint_messages_${complaintId}`)
      .on(
        'postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'complaint_messages',
          filter: `complaint_id=eq.${complaintId}`
        },
        (payload) => {
          // إضافة الرسالة الجديدة إلى القائمة
          setMessages(prevMessages => {
            // التأكد من عدم تكرار الرسالة
            const isMessageExists = prevMessages.some(
              msg => msg.id === payload.new.id
            );

            if (!isMessageExists) {
              return [...prevMessages, payload.new];
            }
            
            return prevMessages;
          });
        }
      )
      .subscribe();

    // تنظيف الاشتراك عند إغلاق المكون
    return () => {
      messagesChannel.unsubscribe();
    };
  }, [complaintId]);

  const handleUpdateStatus = async () => {
    if (!newStatus) {
      toast.error('يرجى اختيار الحالة الجديدة');
      return;
    }

    try {
      const success = await updateComplaintStatus(complaintId, newStatus);
      
      if (success) {
        // إضافة سجل الإجراء
        await supabase
          .from('complaint_action_logs')
          .insert({
            complaint_id: complaintId,
            action_type: 'status_change',
            details: `تغيير الحالة إلى ${getStatusText(newStatus)}`,
            notes: statusNote,
            timestamp: new Date().toISOString()
          });

        toast.success('تم تحديث حالة الشكوى بنجاح');
        setShowStatusModal(false);
        setStatusNote('');
      } else {
        toast.error('فشل تحديث حالة الشكوى');
      }
    } catch (err) {
      console.error('Unexpected status update error:', err);
      toast.error('حدث خطأ غير متوقع');
    }
  };

  const fetchActionLogs = async () => {
    try {
      // التحقق من وجود الجدول
      const { data: logsData, error: logsError } = await supabase
        .from('complaint_action_logs')
        .select('*')
        .eq('complaint_id', complaintId)
        .order('timestamp', { ascending: false });

      if (logsError) {
        // إذا كان الجدول غير موجود، نستخدم الرسائل كبديل
        console.warn('Action logs table not found, using messages instead:', logsError);
        
        const { data: messagesData, error: messagesError } = await supabase
          .from('complaint_messages')
          .select('*')
          .eq('complaint_id', complaintId)
          .order('timestamp', { ascending: false });

        if (messagesError) {
          console.error('Error fetching messages:', messagesError);
          return;
        }

        // تحويل الرسائل إلى سجل إجراءات
        setActionLogs(messagesData.map(msg => ({
          id: msg.id,
          complaint_id: msg.complaint_id,
          action_type: 'message',
          details: msg.text,
          notes: '',
          timestamp: msg.timestamp,
          sender: msg.sender
        })) || []);
      } else {
        setActionLogs(logsData || []);
      }
    } catch (err) {
      console.error('Unexpected logs error:', err);
    }
  };

  // دالة إرسال رسالة
  const sendMessage = async () => {
    if (!newMessage.trim()) {
      toast.error('لا يمكن إرسال رسالة فارغة');
      return;
    }

    try {
      // استخدام الدالة من ComplaintContext
      const result = await addComplaintMessage(
        complaintId, 
        newMessage,  // إرسال الرسالة مباشرة
        'admin'  // معرف المرسل
      );

      if (result) {
        // مسح حقل الرسالة الجديدة
        setNewMessage('');

        // عرض رسالة نجاح
        toast.success('تم إرسال الرسالة بنجاح');
      } else {
        toast.error('فشل إرسال الرسالة');
      }
    } catch (err) {
      console.error('Unexpected error sending message:', err);
      toast.error('حدث خطأ غير متوقع');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  if (!complaint) {
    return null;
  }

  // تحديد اللون بناءً على الأولوية
  const getPriorityColor = () => {
    switch (complaint.priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <div className="container mx-auto px-4 py-8 flex-grow">
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
          {/* معلومات الشكوى الرئيسية */}
          <div className="p-6 bg-blue-50 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-800">{complaint.title}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor()}`}>
                {complaint.priority === 'high' ? 'عالية' : 
                 complaint.priority === 'medium' ? 'متوسطة' : 'منخفضة'}
              </span>
            </div>
            <p className="text-gray-600 mt-2">{complaint.description}</p>
          </div>

          {/* تفاصيل إضافية */}
          <div className="grid grid-cols-2 gap-4 p-6 bg-white">
            <div>
              <p className="text-sm text-gray-500">الفئة</p>
              <p className="font-semibold text-gray-800">
                {complaint.category === 'administrative' ? 'إداري' : 
                 complaint.category === 'technical' ? 'تقني' : 'أخرى'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">تاريخ الإنشاء</p>
              <p className="font-semibold text-gray-800">
                {new Date(complaint.date).toLocaleDateString('ar-EG', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>

            {/* معلومات إضافية */}
            <div>
              <p className="text-sm text-gray-500">رقم الشكوى</p>
              <p className="font-semibold text-gray-800">{complaint.id}</p>
            </div>


            {/* عرض المرفق إن وجد */}
            {complaint.attachment && (
              <div className="col-span-2">
                <p className="text-sm text-gray-500 mb-2">المرفق</p>
                {complaint.attachment.toLowerCase().endsWith('.pdf') ? (
                  <a 
                    href={complaint.attachment} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    عرض ملف PDF
                  </a>
                ) : (
                  <a 
                    href={complaint.attachment} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <img 
                      src={complaint.attachment} 
                      alt="مرفق الشكوى" 
                      className="max-w-full h-auto max-h-64 rounded-lg object-cover shadow-md"
                    />
                  </a>
                )}
              </div>
            )}

            {/* معلومات إضافية */}
            <div className="col-span-2 bg-gray-100 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">الأولوية</p>
                  <p className={`font-semibold ${
                    complaint.priority === 'high' ? 'text-red-600' :
                    complaint.priority === 'medium' ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {complaint.priority === 'high' ? 'عالية' :
                     complaint.priority === 'medium' ? 'متوسطة' :
                     'منخفضة'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">تاريخ آخر تحديث</p>
                  <p className="font-semibold text-gray-800">
                    {complaint.updated_at ? new Date(complaint.updated_at).toLocaleString('ar-EG', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'لا يوجد'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* قسم الرسائل */}
          <div className="p-6 bg-gray-50">
            <h2 className="text-xl font-bold text-gray-800 mb-4">المراسلات</h2>
            
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                لا توجد رسائل حتى الآن
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div 
                    key={message.id} 
                    className={`p-4 rounded-lg max-w-md ${
                      message.sender === 'admin' 
                        ? 'bg-blue-100 text-blue-900 self-end ml-auto' 
                        : 'bg-gray-200 text-gray-900 self-start mr-auto'
                    }`}
                  >
                    <p>{message.text}</p>
                    <p className="text-xs text-gray-600 mt-1 text-left">
                      {new Date(message.timestamp).toLocaleString('ar-EG', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* مربع إرسال رسالة جديدة */}
            <div className="mt-6 flex">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="اكتب رسالتك هنا..."
                className="flex-grow p-3 border border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={sendMessage}
                className="bg-blue-500 text-white px-6 py-3 rounded-l-lg hover:bg-blue-600 transition-colors"
              >
                إرسال
              </button>
            </div>
          </div>



         
        </div>
      </div>
    </div>
  );
};

export default AdminComplaintDetails;
