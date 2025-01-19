import React, { createContext, useState, useContext, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import toast from 'react-hot-toast';

// تهيئة عميل Supabase
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL, 
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// إنشاء Context
const ComplaintContext = createContext();

// مزود Context
export const ComplaintProvider = ({ children }) => {
  const [complaints, setComplaints] = useState({});
  const [complaintsSubscription, setComplaintsSubscription] = useState(null);
  const [messagesSubscription, setMessagesSubscription] = useState(null);

  // دالة تشغيل الاشتراك Realtime
  const setupRealTimeSubscription = () => {
    // إلغاء الاشتراك السابق إن وجد
    if (complaintsSubscription) {
      complaintsSubscription.unsubscribe();
    }

    // اشتراك جديد للتحديثات
    const subscription = supabase
      .channel('complaints')
      .on(
        'postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'complaints' },
        (payload) => {
          // تحديث الشكوى في الحالة المحلية
          setComplaints(prev => ({
            ...prev,
            [payload.new.id]: payload.new
          }));
        }
      )
      .subscribe();

    // حفظ الاشتراك
    setComplaintsSubscription(subscription);
  };

  // دالة تشغيل الاشتراك Realtime للرسائل
  const setupRealTimeMessageSubscription = () => {
    // إلغاء الاشتراك السابق إن وجد
    if (messagesSubscription) {
      messagesSubscription.unsubscribe();
    }

    // اشتراك جديد للتحديثات
    const subscription = supabase
      .channel('complaint_messages')
      .on(
        'postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'complaint_messages' },
        (payload) => {
          // تحديث الرسائل في الشكوى المحلية
          setComplaints(prev => {
            const complaintId = payload.new.complaint_id;
            const existingComplaint = prev[complaintId];
            
            if (existingComplaint) {
              const updatedMessages = [
                ...(existingComplaint.complaint_messages || []),
                payload.new
              ];

              return {
                ...prev,
                [complaintId]: {
                  ...existingComplaint,
                  complaint_messages: updatedMessages
                }
              };
            }
            
            return prev;
          });
        }
      )
      .subscribe();

    // حفظ الاشتراك
    setMessagesSubscription(subscription);
  };

  // تأثير لإعداد الاشتراكات Realtime
  useEffect(() => {
    setupRealTimeSubscription();
    setupRealTimeMessageSubscription();

    // تنظيف الاشتراكات عند إغلاق المكون
    return () => {
      if (complaintsSubscription) {
        complaintsSubscription.unsubscribe();
      }
      if (messagesSubscription) {
        messagesSubscription.unsubscribe();
      }
    };
  }, []);

  // دالة لتحديث حالة شكوى محددة
  const updateComplaintStatus = async (complaintId, newStatus, additionalNotes = '') => {
    try {
      // التحقق من صحة الحالة
      const validStatuses = ['pending', 'in_progress', 'resolved', 'closed'];
      if (!validStatuses.includes(newStatus)) {
        toast.error('حالة غير صالحة');
        return false;
      }

      // تحديث الشكوى في Supabase
      const { error: updateError } = await supabase
        .from('complaints')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString() 
        })
        .eq('id', complaintId);

      if (updateError) {
        toast.error(`خطأ في تحديث حالة الشكوى: ${updateError.message}`);
        console.error('Update Error:', updateError);
        return false;
      }

      // إضافة سجل الإجراء
      const { error: logError } = await supabase
        .from('complaint_action_logs')
        .insert({
          complaint_id: complaintId,
          action_type: 'status_change',
          details: `تغيير الحالة إلى ${getStatusText(newStatus)}`,
          notes: additionalNotes,
          timestamp: new Date().toISOString()
        });

      if (logError) {
        console.error('Action Log Error:', logError);
      }

      // عرض رسالة نجاح
      toast.success('تم تحديث حالة الشكوى بنجاح');
      return true;
    } catch (err) {
      console.error('Unexpected status update error:', err);
      toast.error('حدث خطأ غير متوقع');
      return false;
    }
  };

  // دالة لجلب تفاصيل شكوى محددة
  const fetchComplaintDetails = async (complaintId) => {
    try {
      // جلب تفاصيل الشكوى
      const { data: complaintData, error: complaintError } = await supabase
        .from('complaints')
        .select('*')
        .eq('id', complaintId)
        .single();

      if (complaintError) {
        console.error('Fetch Complaint Error:', complaintError);
        return null;
      }

      // جلب الرسائل المرتبطة بالشكوى
      const { data: messagesData, error: messagesError } = await supabase
        .from('complaint_messages')
        .select('*')
        .eq('complaint_id', complaintId)
        .order('timestamp', { ascending: true });

      if (messagesError) {
        console.error('Fetch Messages Error:', messagesError);
      }

      // جلب سجلات الإجراءات
      const { data: actionLogsData, error: actionLogsError } = await supabase
        .from('complaint_action_logs')
        .select('*')
        .eq('complaint_id', complaintId)
        .order('timestamp', { ascending: true });

      if (actionLogsError) {
        console.error('Fetch Action Logs Error:', actionLogsError);
      }

      // دمج البيانات
      const complaintDetails = {
        ...complaintData,
        complaint_messages: messagesData || [],
        complaint_action_logs: actionLogsData || []
      };

      // تحديث الشكوى في الحالة
      setComplaints(prev => ({
        ...prev,
        [complaintId]: complaintDetails
      }));

      return complaintDetails;
    } catch (err) {
      console.error('Unexpected fetch error:', err);
      return null;
    }
  };

  // دالة لترجمة حالة الشكوى
  const getStatusText = (status) => {
    const statuses = {
      'pending': 'قيد الانتظار',
      'in_progress': 'قيد المعالجة',
      'resolved': 'تم الحل',
      'closed': 'مغلقة'
    };
    return statuses[status] || status;
  };

  // دالة للحصول على لون الحالة
  const getStatusColor = (status) => {
    const statusColors = {
      'pending': 'bg-yellow-50 text-yellow-800 border border-yellow-200',
      'in_progress': 'bg-blue-50 text-blue-800 border border-blue-200',
      'resolved': 'bg-green-50 text-green-800 border border-green-200',
      'closed': 'bg-gray-50 text-gray-800 border border-gray-200'
    };
    return statusColors[status] || 'bg-gray-50 text-gray-800';
  };

  // دالة لإضافة رسالة للشكوى
  const addComplaintMessage = async (complaintId, text, sender) => {
    try {
      const { data, error } = await supabase
        .from('complaint_messages')
        .insert({
          complaint_id: complaintId,
          text: text,  
          sender: sender,  
          timestamp: new Date().toISOString()
        })
        .select('*')
        .single();

      if (error) {
        console.error('Message Send Error:', error);
        toast.error('خطأ في إرسال الرسالة');
        return null;
      }

      return data;
    } catch (err) {
      console.error('Unexpected message send error:', err);
      toast.error('حدث خطأ غير متوقع');
      return null;
    }
  };

  return (
    <ComplaintContext.Provider value={{ 
      complaints, 
      updateComplaintStatus, 
      fetchComplaintDetails,
      getStatusText,
      getStatusColor,
      addComplaintMessage
    }}>
      {children}
    </ComplaintContext.Provider>
  );
};

// هوك مخصص للوصول إلى Context
export const useComplaints = () => {
  const context = useContext(ComplaintContext);
  if (!context) {
    throw new Error('useComplaints يجب استخدامه داخل ComplaintProvider');
  }
  return context;
};
