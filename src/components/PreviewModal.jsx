import React from 'react';

const PreviewModal = ({ isOpen, onClose, data }) => {
  if (!isOpen) return null;

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('ar-SA');
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">معاينة الشكوى</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <span className="sr-only">إغلاق</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-500">العنوان</h4>
            <p className="mt-1">{data.title}</p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-500">التصنيف</h4>
            <p className="mt-1">{data.category}</p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-500">مستوى الأولوية</h4>
            <p className="mt-1">
              {data.priority === 'low' && 'منخفضة'}
              {data.priority === 'normal' && 'عادية'}
              {data.priority === 'high' && 'عالية'}
              {data.priority === 'urgent' && 'عاجلة'}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-500">التفاصيل</h4>
            <p className="mt-1 whitespace-pre-wrap">{data.description}</p>
          </div>

          {data.contactPhone && (
            <div>
              <h4 className="text-sm font-medium text-gray-500">رقم الهاتف</h4>
              <p className="mt-1">{data.contactPhone}</p>
            </div>
          )}

          {data.contactEmail && (
            <div>
              <h4 className="text-sm font-medium text-gray-500">البريد الإلكتروني</h4>
              <p className="mt-1">{data.contactEmail}</p>
            </div>
          )}

          {data.attachment && (
            <div>
              <h4 className="text-sm font-medium text-gray-500">الملف المرفق</h4>
              <p className="mt-1">{data.attachment.name}</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end space-x-4 space-x-reverse">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreviewModal;
