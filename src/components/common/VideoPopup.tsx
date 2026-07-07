import { useEffect, useState, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAuth } from '@/context/AuthContext';
import { usePredictions } from '@/hooks/usePredictions';

export function VideoPopup() {
  const { identity } = useAuth();
  const { predictions, loading } = usePredictions(identity?.userId);
  const [settings, setSettings] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  
  // New states for the audio workaround
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'popup'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSettings(data);
        
        if (data.mediaUrls && data.mediaUrls.length > 0) {
          setMediaUrl(data.mediaUrls[Math.floor(Math.random() * data.mediaUrls.length)]);
        }

        if (data.mode === 'disabled') {
          setDismissed(false);
        }
      }
    });
    return () => unsub();
  }, []);

  if (loading || !identity || !settings || settings.mode === 'disabled' || !mediaUrl || dismissed) {
    return null;
  }

  let shouldShow = false;

  if (settings.mode === 'forced') {
    shouldShow = true;
  } else if (settings.mode === 'auto' && settings.lastAutoWinTime) {
    const latestPredTime = Math.max(0, ...Object.values(predictions).map(p => p.updatedAt));
    if (latestPredTime < settings.lastAutoWinTime) {
      shouldShow = true;
    }
  }

  if (!shouldShow) return null;

  const isStreamable = mediaUrl.includes('streamable.com');
  let streamableEmbedUrl = '';
  
  if (isStreamable) {
    const match = mediaUrl.match(/streamable\.com\/([a-zA-Z0-9]+)/);
    if (match && match[1]) {
      // Streamable handles its own mute overlay if we pass muted=1
      streamableEmbedUrl = `https://streamable.com/e/${match[1]}?autoplay=1&muted=1`;
    }
  }

  const cleanUrl = mediaUrl.split('?')[0]; 
  const isVideo = cleanUrl.match(/\.(mp4|webm|ogg)$/i);

  const handleUnmute = () => {
    if (videoRef.current) {
      videoRef.current.muted = false;
      setIsMuted(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-fade-up">
      <div className="relative w-full max-w-3xl rounded-2xl bg-pitch-950 p-2 shadow-glow">
        <button
          onClick={() => setDismissed(true)}
          className="absolute -right-4 -top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-xl text-white font-black shadow-lg hover:bg-red-400 border-2 border-pitch-950 transition-transform hover:scale-110"
        >
          ✕
        </button>
        
        {isStreamable && streamableEmbedUrl ? (
          <iframe 
            src={streamableEmbedUrl}
            frameBorder="0"
            allow="autoplay; fullscreen"
            allowFullScreen
            className="w-full aspect-video rounded-xl bg-black"
          />
        ) : isVideo ? (
          <div className="relative flex w-full items-center justify-center bg-black rounded-xl overflow-hidden">
            <video 
              ref={videoRef}
              src={mediaUrl} 
              controls={!isMuted} // Hide controls until they unmute so the button is obvious
              autoPlay 
              muted // MUST be muted for the browser to allow it to auto-play
              loop 
              playsInline 
              className="w-full max-h-[85vh] object-contain" 
            />
            {isMuted && (
              <button
                onClick={handleUnmute}
                className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 hover:bg-black/10 transition-colors"
              >
                <div className="flex items-center gap-2 rounded-full bg-turf-500 px-6 py-3 font-bold text-pitch-950 shadow-[0_0_20px_rgba(52,211,153,0.5)] animate-pulse">
                  <span className="text-xl">🔊</span> Tap to Unmute
                </div>
              </button>
            )}
          </div>
        ) : (
          <img 
            src={mediaUrl} 
            alt="Celebration" 
            className="w-full max-h-[85vh] rounded-xl object-contain bg-black" 
          />
        )}
      </div>
    </div>
  );
}