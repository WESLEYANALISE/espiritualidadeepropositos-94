import { useEffect, useRef } from 'react';

interface YouTubePlayerProps {
  videoId: string;
  onVideoEnd: () => void;
  onVideoStart: () => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const YouTubePlayer = ({ videoId, onVideoEnd, onVideoStart }: YouTubePlayerProps) => {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load YouTube API if not already loaded
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = initializePlayer;
    } else {
      initializePlayer();
    }

    function initializePlayer() {
      if (containerRef.current) {
        playerRef.current = new window.YT.Player(containerRef.current, {
          videoId: videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 1,
            rel: 0,
            modestbranding: 1,
          },
          events: {
            onStateChange: (event: any) => {
              if (event.data === window.YT.PlayerState.ENDED) {
                onVideoEnd();
              } else if (event.data === window.YT.PlayerState.PLAYING) {
                onVideoStart();
              }
            },
          },
        });
      }
    }

    return () => {
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch (error) {
          // Ignore cleanup errors to prevent crashes
          console.warn('YouTube player cleanup error:', error);
        }
      }
    };
  }, [videoId, onVideoEnd, onVideoStart]);

  return <div ref={containerRef} className="w-full h-full" />;
};