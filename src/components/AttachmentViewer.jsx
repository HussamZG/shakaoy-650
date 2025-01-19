import React from 'react';
import toast from 'react-hot-toast';

const AttachmentViewer = ({ attachment, onClose }) => {
  const downloadAttachment = () => {
    const link = document.createElement('a');
    link.href = attachment;
    link.download = `مرفق_${new Date().toISOString().split('T')[0]}.${attachment.split('.').pop()}`;
    link.click();
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="relative bg-white rounded-xl shadow-2xl w-[90vw] h-[90vh] max-w-[1200px] overflow-hidden flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* نص التعليمات */}
        <div className="absolute top-4 left-0 right-0 text-center text-gray-600 z-10">
          <p className="text-lg">اضغط خارج النافذة للعودة</p>
        </div>

        {/* زر التحميل */}
        <div className="w-full h-full flex items-center justify-center">
          <button 
            onClick={downloadAttachment}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg text-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>تحميل المرفق</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttachmentViewer;
