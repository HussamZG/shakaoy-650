import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { createClient } from '@supabase/supabase-js';

// استخدام متغيرات البيئة بشكل صحيح في React
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL, 
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const SubmitComplaint = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    priority: 'normal',
    attachment: null,
  });
  const [preview, setPreview] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.category || !formData.description) {
      toast.error('الرجاء تعبئة جميع الحقول المطلوبة');
      return;
    }

    setIsLoading(true);

    try {
      const complaintId = Math.random().toString(36).substr(2, 9);
      
      // Prepare complaint data for Supabase
      const complaint = {
        id: complaintId,
        title: formData.title,
        category: formData.category,
        description: formData.description,
        priority: formData.priority,
        status: 'pending', // تأكيد الحالة الافتراضية
        date: new Date().toISOString(),
        attachment: null // Initialize attachment as null
      };

      // Upload attachment if exists
      let attachmentUrl = null;
      if (formData.attachment) {
        const fileExt = formData.attachment.name.split('.').pop();
        const fileName = `${complaintId}.${fileExt}`;
        
        // التحقق من نوع وحجم الملف
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
        if (!allowedTypes.includes(formData.attachment.type)) {
          toast.error('نوع الملف غير مسموح. يرجى رفع صور (JPG, PNG, GIF) أو PDF');
          setIsLoading(false);
          return;
        }

        if (formData.attachment.size > 5 * 1024 * 1024) {
          toast.error('الحد الأقصى لحجم الملف 5 ميجابايت');
          setIsLoading(false);
          return;
        }

        try {
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('complaint-attachments')
            .upload(fileName, formData.attachment, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error('Upload Error:', {
              statusCode: uploadError.statusCode,
              error: uploadError.error,
              message: uploadError.message
            });
            
            // رسائل خطأ مفصلة
            if (uploadError.statusCode === 403) {
              toast.error('غير مصرح بالرفع. تأكد من الإعدادات');
            } else {
              toast.error(`فشل رفع المرفق: ${uploadError.message}`);
            }
            setIsLoading(false);
            return;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('complaint-attachments')
            .getPublicUrl(fileName);
          
          attachmentUrl = publicUrl;
          complaint.attachment = attachmentUrl; // Update attachment URL
        } catch (err) {
          console.error('Unexpected Storage Error:', err);
          toast.error('حدث خطأ غير متوقع في التخزين');
          setIsLoading(false);
          return;
        }
      }

      // Insert complaint into Supabase
      const { data, error } = await supabase
        .from('complaints')
        .insert(complaint)
        .select();

      if (error) {
        toast.error('فشل تقديم الشكوى');
        console.error('Supabase Error:', error);
        setIsLoading(false);
        return;
      }

      // Insert initial message
      await supabase
        .from('complaint_messages')
        .insert({
          complaint_id: complaintId,
          text: 'تم استلام شكواك وسيتم مراجعتها قريباً',
          sender: 'admin',
          timestamp: new Date().toISOString()
        });

      toast.success('تم تقديم الشكوى بنجاح');
      navigate(`/track?id=${complaintId}`);
    } catch (err) {
      toast.error('حدث خطأ غير متوقع');
      console.error('Submission Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // التحقق من نوع وحجم الملف
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('نوع الملف غير مسموح. يرجى رفع صور (JPG, PNG, GIF) أو PDF');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('الحد الأقصى لحجم الملف 5 ميجابايت');
        return;
      }

      setFormData(prev => ({
        ...prev,
        attachment: file
      }));
    }
  };

  const removeAttachment = () => {
    setFormData(prev => ({
      ...prev,
      attachment: null
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white shadow-2xl rounded-2xl overflow-hidden">
        <div className="px-6 py-8 sm:p-10">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-gray-900">
              تقديم شكوى جديدة
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              نحن نهتم بملاحظاتك ونسعى للتحسين 
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                عنوان الشكوى <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                id="title"
                required
                value={formData.title}
                onChange={handleChange}
                className="block w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-300"
                placeholder="اكتب عنوان شكواك بشكل مختصر وواضح"
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                تصنيف الشكوى <span className="text-red-500">*</span>
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="block w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-300"
              >
                <option value="">اختر تصنيف الشكوى</option>
                <option value="emergency">إسعاف</option>
                <option value="operations">عمليات</option>
                <option value="administrative">إدارية</option>
                <option value="within_center">ضمن المركز</option>
                <option value="other">أخرى</option>
              </select>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                وصف الشكوى <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                rows={5}
                required
                value={formData.description}
                onChange={handleChange}
                className="block w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-300 resize-y"
                placeholder="اشرح تفاصيل شكواك بشكل دقيق وواضح"
              />
            </div>

            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
                الأولوية
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label 
                  className={`py-3 px-4 border-2 rounded-xl text-center cursor-pointer transition duration-300 ${
                    formData.priority === 'normal' 
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700' 
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="priority"
                    value="normal"
                    checked={formData.priority === 'normal'}
                    onChange={handleChange}
                    className="hidden"
                  />
                  عادي
                </label>
                <label 
                  className={`py-3 px-4 border-2 rounded-xl text-center cursor-pointer transition duration-300 ${
                    formData.priority === 'urgent' 
                      ? 'bg-red-50 border-red-500 text-red-700' 
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="priority"
                    value="urgent"
                    checked={formData.priority === 'urgent'}
                    onChange={handleChange}
                    className="hidden"
                  />
                  عاجل
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                إرفاق ملف
              </label>
              <div 
                className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:bg-gray-50 transition duration-300"
                onClick={() => fileInputRef.current.click()}
              >
                <input
                  type="file"
                  name="attachment"
                  id="attachment"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".jpg,.jpeg,.png,.gif,.pdf"
                />
                {formData.attachment ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{formData.attachment.name}</span>
                    </div>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeAttachment();
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm text-gray-600">
                      اسحب وأفلت الملف هنا أو انقر للتحميل
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      (PDF, JPG, PNG, GIF - بحد أقصى 5 ميجابايت)
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 px-6 border border-transparent rounded-xl shadow-lg text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-300 ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 animate-spin mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ) : (
                  'تقديم الشكوى'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SubmitComplaint;
