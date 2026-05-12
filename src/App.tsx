import { Download, Info, Link, Settings, MoreVertical, Edit2, Share2, Scissors, FileAudio, Crop, Type, Image as ImageIcon, Merge, Trash2, PlayCircle, History, ListVideo, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import EditorModal from './components/EditorModal';

interface DownloadHistory {
  id: string;
  title: string;
  originalUrl: string;
  downloadUrl: string;
  format: string;
  date: number;
}

export default function App() {
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState('1080');
  const [isDownloading, setIsDownloading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [finalDownloadUrl, setFinalDownloadUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  
  const [isBlobDownloading, setIsBlobDownloading] = useState(false);
  const [blobDownloadProgress, setBlobDownloadProgress] = useState(0);

  // History State
  const [history, setHistory] = useState<DownloadHistory[]>(() => {
    const saved = localStorage.getItem('vidLoaderHistory');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Modals & Menu State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
  // Editor State
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorVideo, setEditorVideo] = useState<DownloadHistory | null>(null);
  const [editorAction, setEditorAction] = useState<'split' | 'audio' | 'trim' | 'text' | 'merge' | null>(null);

  useEffect(() => {
    localStorage.setItem('vidLoaderHistory', JSON.stringify(history));
  }, [history]);
  
  // Handle clicking outside 3-dots menu
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const downloadFileAsBlob = async (url: string, filename: string) => {
    try {
      setIsBlobDownloading(true);
      setBlobDownloadProgress(0);
      setStatusText('جاري سحب الملف إلى جهازك مباشرة (صفر نوافذ منبثقة)...');

      // Use XMLHttpRequest to get download progress
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'blob'; // Get it as blob directly
      
      xhr.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setBlobDownloadProgress(percentComplete);
          setStatusText(`جاري تحميل الملف... ${percentComplete}%`);
        } else {
          setStatusText('جاري تحميل الملف... (حجم غير معروف)');
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const blobUrl = URL.createObjectURL(xhr.response);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
          
          setStatusText('اكتمل التحميل وحفظ الملف بنجاح!');
          setTimeout(() => setStatusText(''), 3000);
        } else {
          setStatusText('فشل تحميل الملف من الخادم المساعد.');
        }
        setIsBlobDownloading(false);
      };

      xhr.onerror = () => {
        setStatusText('حدث خطأ بالاتصال أثناء سحب الملف.');
        setIsBlobDownloading(false);
      };

      xhr.send();
    } catch (e: any) {
      console.error(e);
      setStatusText('حدث خطأ أثناء حفظ الملف.');
      setIsBlobDownloading(false);
    }
  };

  const handleDownload = async () => {
    if (!url.trim()) {
      setStatusText('الرجاء إدخال رابط فيديو صالح.');
      return;
    }

    setIsDownloading(true);
    setFinalDownloadUrl('');
    setVideoTitle('');
    setStatusText('جاري إعداد التحميل...');

    try {
      const initRes = await fetch(`/api/loader/init?url=${encodeURIComponent(url)}&format=${format}`);
      const initData = await initRes.json();
      
      if (!initData.success) {
        throw new Error(initData.message || 'فشل في إعداد التحميل.');
      }

      setVideoTitle(initData.title || '');
      setStatusText('جاري المعالجة والتحويل... قد يستغرق ذلك بضع ثوانٍ.');
      
      const downloadId = initData.id;

      let retries = 0;
      const pollProgress = async () => {
        try {
          const progRes = await fetch(`/api/loader/progress?id=${downloadId}`);
          const progData = await progRes.json();

          if (progData.success === 1 && progData.download_url) {
            const proxyUrl = `/api/loader/download?url=${encodeURIComponent(progData.download_url)}`;
            setFinalDownloadUrl(proxyUrl);
            setStatusText('جاهز للتحميل والتعديل!');
            setIsDownloading(false);
            
            // Add to history
            setHistory(prev => {
              const exists = prev.find(item => item.id === downloadId);
              if (exists) return prev; // Avoid duplicates
              
              const newItem = {
                id: downloadId,
                title: initData.title || 'فيديو بدون عنوان',
                originalUrl: url,
                downloadUrl: proxyUrl,
                format,
                date: Date.now()
              };
              return [newItem, ...prev];
            });
            return;
          } else if (progData.success === 0) {
            const progressNum = progData.progress || 0;
            const progressPercent = Math.min(100, Math.max(0, Math.round(progressNum / 10)));
            setStatusText(`جاري التحويل... ${progressPercent}% اكتمل.`);
            
            if (retries < 60) {
              retries++;
              setTimeout(pollProgress, 2000);
            } else {
              throw new Error('انتهت مهلة التحويل.');
            }
          } else {
            throw new Error(progData.text || 'حدث خطأ أثناء التحويل.');
          }
        } catch (e: any) {
          setStatusText(e.message || 'حدث خطأ أثناء التحويل.');
          setIsDownloading(false);
        }
      };

      setTimeout(pollProgress, 2000);
    } catch (e: any) {
      console.error(e);
      setStatusText(e.message || 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
      setIsDownloading(false);
    }
  };

  const handleAction = (e: React.MouseEvent, item: DownloadHistory, action: string) => {
    e.stopPropagation();
    setActiveMenuId(null);
    
    switch (action) {
      case 'rename':
        const newTitle = window.prompt('أدخل الاسم الجديد للفيديو:', item.title);
        if (newTitle && newTitle.trim() !== '') {
          setHistory(prev => prev.map(v => v.id === item.id ? { ...v, title: newTitle.trim() } : v));
        }
        break;
      case 'save':
        // Trigger direct native download
        let dUrl = item.downloadUrl;
        if (!dUrl.startsWith('/api/loader/download')) {
           dUrl = `/api/loader/download?url=${encodeURIComponent(dUrl)}`;
        }
        downloadFileAsBlob(dUrl, item.title + '.mp4');
        break;
      case 'share':
        if (navigator.share) {
          navigator.share({
            title: item.title,
            text: 'شاهد هذا الفيديو',
            url: item.downloadUrl,
          }).catch(console.error);
        } else {
          alert('ميزة المشاركة غير مدعومة في متصفحك.');
        }
        break;
      case 'delete':
        if (window.confirm('هل أنت متأكد من حذف هذا الفيديو؟')) {
          setHistory(prev => prev.filter(v => v.id !== item.id));
        }
        break;
      case 'split':
      case 'audio':
      case 'trim':
      case 'text':
      case 'merge':
        setEditorVideo(item);
        setEditorAction(action as any);
        setEditorOpen(true);
        break;
    }
  };

  const toggleMenu = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setActiveMenuId(prev => prev === id ? null : id);
  };

  const VideoListItem = ({ item }: { item: DownloadHistory }) => (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm hover:border-slate-700 transition">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center shrink-0">
          <PlayCircle size={24} />
        </div>
        <div className="flex-1 min-w-0 text-right overflow-hidden">
          <h4 className="font-bold text-slate-200 truncate" title={item.title}>{item.title}</h4>
          <p className="text-xs text-slate-500 mt-1" dir="ltr" title={item.originalUrl}>{new URL(item.originalUrl).hostname}</p>
        </div>
      </div>
      
      <div className="relative">
        <button 
          onClick={(e) => toggleMenu(e, item.id)}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
        >
          <MoreVertical size={20} />
        </button>
        
        {activeMenuId === item.id && (
          <div className="absolute top-12 left-0 w-64 bg-slate-800 border border-slate-700 rounded-2xl shadow-xl z-50 py-2 overflow-hidden" dir="rtl" onClick={e => e.stopPropagation()}>
            <button onClick={(e) => handleAction(e, item, 'rename')} className="w-full px-4 py-2 text-sm text-right text-slate-200 hover:bg-slate-700 flex items-center gap-3"><Edit2 size={16} /> تغيير اسم الفيديو</button>
            <button onClick={(e) => handleAction(e, item, 'save')} className="w-full px-4 py-2 text-sm text-right text-slate-200 hover:bg-slate-700 flex items-center gap-3"><Download size={16} /> حفظ الفيديو في الاستوديو</button>
            <button onClick={(e) => handleAction(e, item, 'share')} className="w-full px-4 py-2 text-sm text-right text-slate-200 hover:bg-slate-700 flex items-center gap-3"><Share2 size={16} /> مشاركة الفيديو</button>
            <div className="h-px bg-slate-700 my-1"></div>
            <button onClick={(e) => handleAction(e, item, 'split')} className="w-full px-4 py-2 text-sm text-right text-slate-200 hover:bg-slate-700 flex items-center gap-3"><Scissors size={16} /> تقسيم الفيديو</button>
            <button onClick={(e) => handleAction(e, item, 'audio')} className="w-full px-4 py-2 text-sm text-right text-slate-200 hover:bg-slate-700 flex items-center gap-3"><FileAudio size={16} /> تحويل الفيديو إلى صوت</button>
            <button onClick={(e) => handleAction(e, item, 'trim')} className="w-full px-4 py-2 text-sm text-right text-slate-200 hover:bg-slate-700 flex items-center gap-3"><Crop size={16} /> قص الفيديو</button>
            <button onClick={(e) => handleAction(e, item, 'text')} className="w-full px-4 py-2 text-sm text-right text-slate-200 hover:bg-slate-700 flex items-center gap-3"><Type size={16} /> الكتابة على الفيديو</button>
            <button onClick={(e) => handleAction(e, item, 'merge')} className="w-full px-4 py-2 text-sm text-right text-slate-200 hover:bg-slate-700 flex items-center gap-3"><Merge size={16} /> دمج (صوت/فيديو)</button>
            <div className="h-px bg-slate-700 my-1"></div>
            <button onClick={(e) => handleAction(e, item, 'delete')} className="w-full px-4 py-2 text-sm text-right text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-3"><Trash2 size={16} /> حذف الفيديو من الهاتف</button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-start font-sans text-right select-text p-4 pb-20" dir="rtl">
      {/* Top Left History Button */}
      <div className="w-full max-w-4xl flex justify-end mb-4 z-50 relative">
        <button 
          onClick={() => setShowHistoryModal(true)}
          className="absolute top-0 left-0 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white px-5 py-2.5 rounded-2xl text-sm font-bold flex items-center gap-2 shadow-lg transition-all"
        >
          <History size={18} className="text-blue-400" />
          الروابط المحملة
          {history.length > 0 && (
            <span className="bg-blue-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full mr-2">{history.length}</span>
          )}
        </button>
      </div>

      <div className="w-full max-w-4xl bg-slate-900 rounded-[40px] p-8 md:p-12 shadow-2xl border border-slate-800 relative z-10">
        {/* Decorative background blobs */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-600 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-600 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>

        {/* Header */}
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-6 mt-10 md:mt-0">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">
              مُحمّل الفيديوهات <span className="text-transparent bg-clip-text bg-gradient-to-l from-blue-400 to-purple-400">الذكي</span>
            </h1>
            <p className="text-slate-400 text-lg">تنزيل المحتوى من اليوتيوب ومواقع أخرى مباشرة</p>
          </div>
          <div className="w-16 h-16 shrink-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Download className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
        </div>

        {/* Main Form */}
        <div className="relative z-10 space-y-8">
          {/* URL Input */}
          <div className="space-y-3">
            <label className="text-slate-300 font-bold mr-2 text-sm uppercase tracking-widest block">رابط الفيديو (YouTube, TikTok, Twitter...)</label>
            <div className="relative flex items-center">
              <input 
                type="text" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..." 
                className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl pl-12 pr-6 py-5 text-blue-400 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors text-lg"
                dir="ltr"
              />
              <div className="absolute left-4 pointer-events-none">
                <Link className="w-6 h-6 text-slate-500" />
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Quality Selection */}
            <div className="space-y-3">
              <label className="text-slate-300 font-bold mr-2 text-sm uppercase tracking-widest block">الجودة/الصيغة</label>
              <div className="relative flex items-center">
                <select 
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl pr-6 pl-12 py-4 text-white appearance-none focus:outline-none focus:border-purple-500 transition-colors cursor-pointer"
                >
                  <option value="1080">فيديو مباشر الجودة عالية (1080p MP4)</option>
                  <option value="720">فيديو مباشر جودة متوسطة (720p MP4)</option>
                  <option value="480">فيديو مباشر جودة ضعيفة (480p MP4)</option>
                  <option value="mp3">صوت فقط (MP3)</option>
                </select>
                <div className="absolute left-4 pointer-events-none">
                  <Settings className="w-5 h-5 text-slate-500" />
                </div>
              </div>
            </div>
            
            {/* Status Section */}
            <div className="space-y-3 flex flex-col justify-end">
              {statusText && (
                <div className="rounded-2xl p-4 border text-sm flex items-start gap-3 w-full h-full bg-slate-950/50 border-slate-800/50 text-blue-300">
                  <Info className="w-5 h-5 shrink-0 mt-0.5 text-blue-400" />
                  <div className="flex flex-col gap-1">
                    {videoTitle && <strong className="text-blue-200 line-clamp-1 truncate" title={videoTitle}>{videoTitle}</strong>}
                    <p className="leading-relaxed">{statusText}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Download Button */}
          {!finalDownloadUrl ? (
            <button 
              disabled={isDownloading}
              onClick={handleDownload}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white py-6 mt-4 rounded-[24px] text-2xl font-black shadow-xl shadow-blue-500/10 transition-all hover:shadow-blue-500/20 flex items-center justify-center gap-4 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDownloading ? (
                <span className="animate-pulse">جاري التحضير...</span>
              ) : (
                <>
                  <Download className="w-8 h-8 group-hover:translate-y-1 transition-transform" strokeWidth={3} />
                  تجهيز التحميل
                </>
              )}
            </button>
          ) : (
            <div className="flex gap-4">
              <button 
                onClick={() => downloadFileAsBlob(finalDownloadUrl, videoTitle ? `${videoTitle}.mp4` : 'video.mp4')}
                disabled={isBlobDownloading}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white py-6 mt-4 rounded-[24px] text-2xl font-black shadow-xl shadow-emerald-500/10 transition-all hover:shadow-emerald-500/20 flex items-center justify-center gap-4 group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
              >
                {isBlobDownloading && (
                  <div 
                    className="absolute inset-0 bg-white/20 transition-all duration-300" 
                    style={{ width: `${blobDownloadProgress}%`, right: 0, left: 'auto' }}
                  ></div>
                )}
                <span className="relative z-10 flex items-center justify-center gap-4">
                  <Download className="w-8 h-8 group-hover:translate-y-1 transition-transform" strokeWidth={3} />
                  {isBlobDownloading ? `جاري الحفظ (${blobDownloadProgress}%)` : 'تحميل الملف الآن'}
                </span>
              </button>
              <button 
                onClick={() => setFinalDownloadUrl('')}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-8 py-6 mt-4 rounded-[24px] text-lg font-bold transition-all shadow-xl"
              >
                رجوع
              </button>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-10 pt-6 border-t border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-4">
            <span className="px-3 py-1 bg-slate-950 text-slate-400 rounded-full text-xs font-bold border border-slate-800">Smart API</span>
          </div>
          <p className="text-slate-500 text-sm font-semibold">
            مع تحيات المطور <span className="text-blue-400 font-bold">Amir Lamay</span>
          </p>
        </div>
      </div>

      {/* History List (Bottom) */}
      <div className="w-full max-w-4xl mt-12 space-y-4 relative z-10">
        <h3 className="text-xl font-bold text-slate-300 mb-6 flex items-center gap-2">
          <ListVideo className="text-blue-400" />
          الفيديوهات المحملة مسبقاً والتعديلات
        </h3>
        
        {history.length === 0 ? (
          <div className="text-center py-10 text-slate-500 bg-slate-900 border border-slate-800 rounded-3xl border-dashed">
            لا توجد فيديوهات محملة بعد
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((item) => (
              <VideoListItem key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* History Popup Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-[30px] w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl relative overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <History className="text-blue-400" />
                الروابط المحملة سلفاً
              </h2>
              <button 
                onClick={() => setShowHistoryModal(false)}
                className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full transition"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {history.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  القائمة فارغة
                </div>
              ) : (
                history.map((item) => (
                  <div key={item.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <h4 className="font-bold text-slate-200 mb-2 truncate" title={item.title}>{item.title}</h4>
                    <div className="flex items-center gap-2">
                       <input 
                         type="text" 
                         readOnly 
                         value={item.originalUrl} 
                         className="flex-1 bg-slate-900 text-slate-400 text-sm p-2 rounded-xl border border-slate-800 outline-none" 
                         dir="ltr"
                       />
                       <button 
                         onClick={() => downloadFileAsBlob(item.downloadUrl.startsWith('/api/') ? item.downloadUrl : `/api/loader/download?url=${encodeURIComponent(item.downloadUrl)}`, item.title + '.mp4')}
                         className="bg-blue-600 hover:bg-blue-500 text-white p-2 text-sm rounded-xl font-bold transition flex items-center gap-1 cursor-pointer"
                       >
                         تنزيل <Download size={14} />
                       </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      <EditorModal 
        isOpen={editorOpen} 
        onClose={() => setEditorOpen(false)} 
        video={editorVideo} 
        action={editorAction} 
      />

    </div>
  );
}
