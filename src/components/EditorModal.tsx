import React, { useState } from 'react';
import { X, Type, Image as ImageIcon, Scissors, Crop, Music, RotateCcw, Save } from 'lucide-react';

interface EditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: any;
  action: 'split' | 'audio' | 'trim' | 'text' | 'merge' | null;
}

export default function EditorModal({ isOpen, onClose, video, action }: EditorModalProps) {
  const [textMode, setTextMode] = useState(false);
  const [overlayText, setOverlayText] = useState('');
  const [fontSize, setFontSize] = useState(24);
  const [fontColor, setFontColor] = useState('#ffffff');
  
  if (!isOpen || !video) return null;

  const getTitle = () => {
    switch (action) {
      case 'split': return 'تقسيم الفيديو';
      case 'audio': return 'تحويل الفيديو إلى صوت';
      case 'trim': return 'قص الفيديو';
      case 'text': return 'الكتابة على الفيديو وإضافة ملصقات';
      case 'merge': return 'دمج الفيديوهات أو الصوت';
      default: return 'تعديل الفيديو';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl" dir="rtl">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-800 bg-slate-900/50">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="bg-blue-500/20 text-blue-400 p-2 rounded-xl">
              {action === 'text' ? <Type size={20} /> : <Scissors size={20} />}
            </span>
            {getTitle()}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-6">
          {/* Video Preview */}
          <div className="flex-1 bg-black rounded-2xl overflow-hidden relative border border-slate-800 shadow-inner flex items-center justify-center min-h-[300px]">
             {/* Note: since CORS might prevent playing some urls depending on proxy, we add crossOrigin="anonymous" just in case */}
            <video 
              src={video.downloadUrl} 
              controls 
              crossOrigin="anonymous"
              className="w-full h-full object-contain"
            />
            
            {/* Text Overlay Simulation */}
            {action === 'text' && overlayText && (
              <div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-pre-wrap text-center drop-shadow-lg"
                style={{ fontSize: `${fontSize}px`, color: fontColor }}
              >
                {overlayText}
              </div>
            )}
          </div>

          {/* Tools / Sidebar */}
          <div className="w-full md:w-80 space-y-6">
            
            {action === 'text' && (
              <div className="space-y-4 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                <h3 className="text-lg font-bold text-slate-200">أدوات النص والملصقات</h3>
                
                <div>
                  <label className="text-xs font-bold text-slate-400 mb-2 block">النص المضاف</label>
                  <textarea 
                    value={overlayText}
                    onChange={e => setOverlayText(e.target.value)}
                    placeholder="اكتب شيئاً على الفيديو..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-blue-500"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-2 block">حجم الخط: {fontSize}px</label>
                    <input 
                      type="range" min="12" max="72" value={fontSize} 
                      onChange={e => setFontSize(parseInt(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 mb-2 block">لون الخط</label>
                    <input 
                      type="color" value={fontColor} 
                      onChange={e => setFontColor(e.target.value)}
                      className="w-full h-8 cursor-pointer rounded-lg bg-slate-900 border border-slate-700"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-sm py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition">
                    <ImageIcon size={16} /> ملصق / صورة
                  </button>
                </div>
              </div>
            )}

            {action === 'trim' && (
              <div className="space-y-4 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                <h3 className="text-lg font-bold text-slate-200">القص والتحديد</h3>
                <p className="text-sm text-slate-400 text-center">حدد بداية ونهاية المقطع</p>
                <div className="relative pt-4 pb-2">
                  <div className="h-2 bg-slate-900 rounded-full w-full"></div>
                  <div className="absolute top-4 left-1/4 right-1/4 h-2 bg-blue-500 rounded-full"></div>
                  <div className="absolute top-2 left-1/4 w-4 h-6 bg-white rounded-md shadow -ml-2 cursor-col-resize"></div>
                  <div className="absolute top-2 right-1/4 w-4 h-6 bg-white rounded-md shadow -mr-2 cursor-col-resize"></div>
                </div>
              </div>
            )}

            {action === 'merge' && (
              <div className="space-y-4 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                <h3 className="text-lg font-bold text-slate-200">خيارات الدمج</h3>
                <button className="w-full bg-slate-700 hover:bg-slate-600 text-white text-sm py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition">
                  <Music size={16} /> إضافة مسار صوتي
                </button>
                <button className="w-full bg-slate-700 hover:bg-slate-600 text-white text-sm py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition">
                  <ImageIcon size={16} /> إضافة فيديو من الاستوديو
                </button>
                <div>
                  <label className="text-xs font-bold text-slate-400 mb-2 block">نوع الفاصل الزمني (الانتقال)</label>
                  <select className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm focus:outline-none">
                    <option>تلاشي (Fade)</option>
                    <option>انزلاق (Slide)</option>
                    <option>مباشر (Cut)</option>
                  </select>
                </div>
              </div>
            )}

            <div className="pt-4 mt-auto">
              {/* Note: This is simulated! In a real environment we'd process via ffmpeg-wasm */}
              <button 
                onClick={() => {
                  alert('جاري معالجة وحفظ الفيديو... (محاكاة)');
                  onClose();
                }}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/20 transition-all"
              >
                <Save size={20} /> حفظ التعديلات
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
