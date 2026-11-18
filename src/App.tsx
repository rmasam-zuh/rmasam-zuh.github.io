import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  Check,
  Download,
  Eye,
  EyeOff,
  Heart,
  Link2,
  Maximize2,
  Minimize2,
  QrCode,
  RotateCcw,
  X,
} from 'lucide-react';

const SHARED_SITE_URL =
  'https://ais-pre-ffsm4mg4pr3so5db5ssasw-824275867712.asia-northeast1.run.app';

const BIRTHDAY_PAGE_SRC = `${import.meta.env.BASE_URL}assets/aistudio/birthday_heart_photo_b4408e35.html`;

type CardThemeId = 'crimson' | 'ivory' | 'mono';

interface CardTheme {
  id: CardThemeId;
  label: string;
  cardBg: string;
  cardBorder: string;
  titleColor: string;
  subtitleColor: string;
  accentColor: string;
  qrDark: string;
  qrLight: string;
}

const CARD_THEMES: Record<CardThemeId, CardTheme> = {
  crimson: {
    id: 'crimson',
    label: 'Velvet Crimson',
    cardBg: '#16050C',
    cardBorder: '#47162B',
    titleColor: '#FFF2F6',
    subtitleColor: '#D6A8B8',
    accentColor: '#F472B6',
    qrDark: '#260613',
    qrLight: '#FFFFFF',
  },
  ivory: {
    id: 'ivory',
    label: 'Warm Ivory',
    cardBg: '#FFF9FB',
    cardBorder: '#E7CFD8',
    titleColor: '#2A0815',
    subtitleColor: '#7A4C5E',
    accentColor: '#BE123C',
    qrDark: '#2A0815',
    qrLight: '#FFFFFF',
  },
  mono: {
    id: 'mono',
    label: 'Classic Mono',
    cardBg: '#FFFFFF',
    cardBorder: '#D4D4D8',
    titleColor: '#111111',
    subtitleColor: '#52525B',
    accentColor: '#111111',
    qrDark: '#000000',
    qrLight: '#FFFFFF',
  },
};

function getInitialSiteUrl(): string {
  if (typeof window === 'undefined') return SHARED_SITE_URL;
  const { hostname, origin, pathname } = window.location;
  if (hostname.includes('ais-dev-') || hostname === 'localhost' || hostname === '127.0.0.1') {
    return SHARED_SITE_URL;
  }
  const cleanPath = pathname.endsWith('/') ? pathname : `${pathname.replace(/\/[^/]*$/, '')}/`;
  return `${origin}${cleanPath}`;
}

function getCurrentCleanUrl(): string {
  if (typeof window === 'undefined') return SHARED_SITE_URL;
  const { origin, pathname } = window.location;
  const cleanPath = pathname.endsWith('/') ? pathname : `${pathname.replace(/\/[^/]*$/, '')}/`;
  return `${origin}${cleanPath}`;
}

async function copyTextToClipboard(value: string): Promise<boolean> {
  if (!value) return false;
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Fallback below
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.className = 'fixed opacity-0 pointer-events-none';
  document.body.appendChild(textarea);
  textarea.select();
  let success = false;
  try {
    success = document.execCommand('copy');
  } catch {
    success = false;
  }
  document.body.removeChild(textarea);
  return success;
}

export default function App() {
  const stageRef = useRef<HTMLDivElement | null>(null);

  const [frameKey, setFrameKey] = useState(0);
  const [privacyVeil, setPrivacyVeil] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [headerCopied, setHeaderCopied] = useState(false);

  const [qrOpen, setQrOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('qr') === '1' || window.location.hash === '#qr';
  });

  const [targetUrl, setTargetUrl] = useState(getInitialSiteUrl);
  const [ghUser, setGhUser] = useState('');
  const [ghRepo, setGhRepo] = useState('');
  const [cardTitle, setCardTitle] = useState('For My Love');
  const [cardSubtitle, setCardSubtitle] = useState('Scan with your camera to open');
  const [themeId, setThemeId] = useState<CardThemeId>('crimson');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrError, setQrError] = useState('');
  const [modalCopied, setModalCopied] = useState(false);
  const [downloadingCard, setDownloadingCard] = useState(false);

  const activeTheme = CARD_THEMES[themeId];
  const trimmedUrl = useMemo(() => targetUrl.trim(), [targetUrl]);
  const currentCleanUrl = useMemo(() => getCurrentCleanUrl(), []);

  const applyGitHubPagesUrl = useCallback((user: string, repo: string) => {
    const cleanUser = user.trim().replace(/^@/, '');
    const cleanRepo = repo.trim().replace(/^\/+|\/+$/g, '');
    if (!cleanUser) return;
    if (cleanRepo) {
      setTargetUrl(`https://${cleanUser}.github.io/${cleanRepo}/`);
    } else {
      setTargetUrl(`https://${cleanUser}.github.io/`);
    }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    if (!qrOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setQrOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [qrOpen]);

  useEffect(() => {
    let cancelled = false;

    if (!trimmedUrl) {
      setQrDataUrl('');
      setQrError('Enter a website link to generate a scannable QR code.');
      return;
    }

    setQrError('');
    QRCode.toDataURL(trimmedUrl, {
      errorCorrectionLevel: 'H',
      margin: 3,
      width: 1024,
      color: {
        dark: activeTheme.qrDark,
        light: activeTheme.qrLight,
      },
    })
      .then((url) => {
        if (!cancelled) {
          setQrDataUrl(url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrDataUrl('');
          setQrError('Unable to encode this URL into a QR code.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [trimmedUrl, activeTheme.qrDark, activeTheme.qrLight]);

  const handleReplay = useCallback(() => {
    setPrivacyVeil(false);
    setFrameKey((k) => k + 1);
  }, []);

  const handleToggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement && stageRef.current?.requestFullscreen) {
        await stageRef.current.requestFullscreen();
      } else if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore fullscreen blocks inside restricted iframes
    }
  }, []);

  const handleCopyHeaderLink = useCallback(async () => {
    const linkToCopy = trimmedUrl || currentCleanUrl;
    const ok = await copyTextToClipboard(linkToCopy);
    if (ok) {
      setHeaderCopied(true);
      window.setTimeout(() => setHeaderCopied(false), 2000);
    }
  }, [trimmedUrl, currentCleanUrl]);

  const handleCopyModalLink = useCallback(async () => {
    if (!trimmedUrl) return;
    const ok = await copyTextToClipboard(trimmedUrl);
    if (ok) {
      setModalCopied(true);
      window.setTimeout(() => setModalCopied(false), 2000);
    }
  }, [trimmedUrl]);

  const handleDownloadRawQr = useCallback(() => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = 'birthday-website-qr.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [qrDataUrl]);

  const handleDownloadCard = useCallback(async () => {
    if (!qrDataUrl || downloadingCard) return;
    setDownloadingCard(true);

    try {
      const width = 900;
      const height = 1180;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = activeTheme.cardBg;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = activeTheme.cardBorder;
      ctx.lineWidth = 4;
      ctx.strokeRect(36, 36, width - 72, height - 72);

      ctx.save();
      ctx.translate(width / 2, 132);
      ctx.fillStyle = activeTheme.accentColor;
      ctx.beginPath();
      ctx.moveTo(0, 18);
      ctx.bezierCurveTo(-28, -8, -42, 20, 0, 50);
      ctx.bezierCurveTo(42, 20, 28, -8, 0, 18);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = activeTheme.titleColor;
      ctx.textAlign = 'center';
      ctx.font = '600 58px Georgia, serif';
      ctx.fillText(cardTitle.trim() || 'For My Love', width / 2, 250, width - 140);

      const qrSize = 560;
      const qrX = (width - qrSize) / 2;
      const qrY = 320;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(qrX - 24, qrY - 24, qrSize + 48, qrSize + 48);

      const qrImg = new Image();
      await new Promise<void>((resolve, reject) => {
        qrImg.onload = () => resolve();
        qrImg.onerror = () => reject(new Error('QR image load failed'));
        qrImg.src = qrDataUrl;
      });
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      ctx.fillStyle = activeTheme.subtitleColor;
      ctx.font = '500 30px system-ui, -apple-system, sans-serif';
      ctx.fillText(
        cardSubtitle.trim() || 'Scan with your camera to open',
        width / 2,
        985,
        width - 140
      );

      ctx.globalAlpha = 0.72;
      ctx.font = '400 20px system-ui, -apple-system, sans-serif';
      ctx.fillText('PRIVATE KEEPSAKE', width / 2, 1075);
      ctx.globalAlpha = 1;

      const cardUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = cardUrl;
      link.download = 'birthday-qr-card.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setDownloadingCard(false);
    }
  }, [qrDataUrl, downloadingCard, activeTheme, cardTitle, cardSubtitle]);

  return (
    <div className="h-dvh w-full bg-[#050103] text-[#F9EFF3] flex flex-col overflow-hidden">
      {/* Minimal 52px Editorial Header */}
      <header className="h-[52px] shrink-0 px-4 sm:px-6 border-b border-[#29101B] bg-[#0B0207] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Heart className="w-4 h-4 text-[#F472B6] fill-[#F472B6] shrink-0" />
          <h1 className="font-display text-lg sm:text-xl font-semibold tracking-tight text-[#FFF3F7] truncate">
            Birthday Keepsake
          </h1>
        </div>

        <span className="hidden md:inline text-xs uppercase tracking-[0.16em] text-[#B88C9D] whitespace-nowrap">
          Private Edition &middot; Unlisted
        </span>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={handleReplay}
            title="Replay animation"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#321220] bg-[#13040B] hover:bg-[#200814] text-xs font-medium text-[#EAD0DA] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Replay</span>
          </button>

          <button
            type="button"
            onClick={() => setPrivacyVeil((v) => !v)}
            title={privacyVeil ? 'Reveal keepsake' : 'Hide screen behind privacy veil'}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              privacyVeil
                ? 'border-[#F43F5E]/60 bg-[#9F1239] text-white'
                : 'border-[#321220] bg-[#13040B] hover:bg-[#200814] text-[#EAD0DA]'
            }`}
          >
            {privacyVeil ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden lg:inline">{privacyVeil ? 'Reveal' : 'Privacy'}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            className="hidden sm:inline-flex items-center justify-center p-1.5 rounded-lg border border-[#321220] bg-[#13040B] hover:bg-[#200814] text-[#EAD0DA] transition-colors cursor-pointer"
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setQrOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#BE123C] hover:bg-[#E11D48] text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>QR Code</span>
          </button>

          <button
            type="button"
            onClick={handleCopyHeaderLink}
            title="Copy website link"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#321220] bg-[#13040B] hover:bg-[#200814] text-xs font-medium text-[#EAD0DA] transition-colors cursor-pointer"
          >
            {headerCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#F472B6]" />
                <span className="hidden sm:inline">Copied</span>
              </>
            ) : (
              <>
                <Link2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Copy Link</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Primary Stage: Original Interactive Birthday Heart Photo Experience */}
      <main ref={stageRef} className="flex-1 relative overflow-hidden bg-[#050103]">
        <iframe
          key={frameKey}
          src={BIRTHDAY_PAGE_SRC}
          title="Happy Birthday My Love"
          className="w-full h-full border-0 block"
          allow="fullscreen"
        />

        {privacyVeil && (
          <div className="absolute inset-0 z-20 bg-[#080205]/95 backdrop-blur-2xl flex flex-col items-center justify-center px-6 text-center">
            <Heart className="w-8 h-8 text-[#F472B6] fill-[#F472B6] mb-4" />
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#FFF3F7]">
              Private Birthday Keepsake
            </h2>
            <p className="mt-2 max-w-sm text-sm text-[#D1A8B8]">
              Screen is veiled for privacy. Tap below whenever you are ready to reveal it.
            </p>
            <button
              type="button"
              onClick={() => setPrivacyVeil(false)}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#BE123C] hover:bg-[#E11D48] px-5 py-2.5 text-sm font-semibold text-white transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>Reveal Keepsake</span>
            </button>
          </div>
        )}
      </main>

      {/* QR Code Studio Modal Overlay */}
      {qrOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="qr-modal-title"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-y-auto p-4 sm:p-6 flex items-start lg:items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setQrOpen(false);
            }
          }}
        >
          <div className="w-full max-w-5xl rounded-2xl border border-[#3B1526] bg-[#090206] text-[#F9EFF3] shadow-2xl overflow-hidden my-auto">
            <div className="px-5 sm:px-7 py-4 border-b border-[#29101B] bg-[#0E0309] flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <QrCode className="w-4 h-4 text-[#F472B6] shrink-0" />
                <h2
                  id="qr-modal-title"
                  className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-[#FFF3F7] truncate"
                >
                  Keepsake QR Code Studio
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setQrOpen(false)}
                aria-label="Close QR Code Studio"
                className="p-1.5 rounded-lg border border-[#3B1526] bg-[#16050C] hover:bg-[#240915] text-[#EAD0DA] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left: Scannable QR Preview Card */}
              <div className="lg:col-span-5 flex flex-col items-center">
                <div
                  className={`w-full max-w-xs sm:max-w-sm rounded-2xl border p-7 text-center shadow-2xl transition-colors ${
                    themeId === 'crimson'
                      ? 'bg-[#16050C] border-[#47162B] text-[#FFF2F6]'
                      : themeId === 'ivory'
                        ? 'bg-[#FFF9FB] border-[#E7CFD8] text-[#2A0815]'
                        : 'bg-white border-zinc-300 text-zinc-900'
                  }`}
                >
                  <div className="flex justify-center mb-3">
                    <Heart
                      className={`w-6 h-6 ${
                        themeId === 'crimson'
                          ? 'text-[#F472B6] fill-[#F472B6]'
                          : themeId === 'ivory'
                            ? 'text-[#BE123C] fill-[#BE123C]'
                            : 'text-zinc-900 fill-zinc-900'
                      }`}
                    />
                  </div>

                  <h3 className="font-display text-3xl font-semibold tracking-tight leading-tight">
                    {cardTitle.trim() || 'For My Love'}
                  </h3>

                  <div className="mt-5 mx-auto w-56 h-56 sm:w-60 sm:h-60 rounded-xl bg-white p-3 flex items-center justify-center shadow-sm">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt={`QR code linking to ${trimmedUrl}`}
                        className="w-full h-full object-contain block"
                      />
                    ) : (
                      <p className="text-xs text-zinc-600 px-4">{qrError}</p>
                    )}
                  </div>

                  <p
                    className={`mt-5 text-sm font-medium ${
                      themeId === 'crimson'
                        ? 'text-[#D6A8B8]'
                        : themeId === 'ivory'
                          ? 'text-[#7A4C5E]'
                          : 'text-zinc-600'
                    }`}
                  >
                    {cardSubtitle.trim() || 'Scan with your camera to open'}
                  </p>
                </div>
              </div>

              {/* Right: Controls & Downloads */}
              <div className="lg:col-span-7 space-y-5">
                <div className="rounded-xl border border-[#5B1B36] bg-[#19060E] p-4 text-xs text-[#F2CFD9] space-y-1.5 leading-relaxed">
                  <p className="font-semibold text-[#FFF3F7]">
                    GitHub Pages &amp; Public Link Setup
                  </p>
                  <p>
                    Click <strong className="text-white">Save to GitHub</strong> in the AI Studio toolbar to push this project, then enable{' '}
                    <strong className="text-white">Settings &rarr; Pages &rarr; GitHub Actions</strong> in that repository. Enter your GitHub username and repo name below so your QR code opens her birthday page directly.
                  </p>
                </div>

                <div className="space-y-4 rounded-xl border border-[#2C111D] bg-[#100309] p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-[#2A101C]">
                    <div>
                      <label
                        htmlFor="gh-user"
                        className="block text-xs font-medium uppercase tracking-wider text-[#C79BAE] mb-1.5"
                      >
                        GitHub Username
                      </label>
                      <input
                        id="gh-user"
                        type="text"
                        value={ghUser}
                        onChange={(e) => {
                          const nextUser = e.target.value;
                          setGhUser(nextUser);
                          applyGitHubPagesUrl(nextUser, ghRepo);
                        }}
                        placeholder="your-username"
                        className="w-full rounded-lg border border-[#3B1526] bg-[#080205] px-3 py-2 text-sm text-[#FFF2F6] placeholder:text-[#6B4555] focus:outline-none focus:border-[#F472B6]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="gh-repo"
                        className="block text-xs font-medium uppercase tracking-wider text-[#C79BAE] mb-1.5"
                      >
                        GitHub Repo Name
                      </label>
                      <input
                        id="gh-repo"
                        type="text"
                        value={ghRepo}
                        onChange={(e) => {
                          const nextRepo = e.target.value;
                          setGhRepo(nextRepo);
                          applyGitHubPagesUrl(ghUser, nextRepo);
                        }}
                        placeholder="birthday-love"
                        className="w-full rounded-lg border border-[#3B1526] bg-[#080205] px-3 py-2 text-sm text-[#FFF2F6] placeholder:text-[#6B4555] focus:outline-none focus:border-[#F472B6]"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <label
                        htmlFor="qr-url"
                        className="text-xs font-medium uppercase tracking-wider text-[#C79BAE]"
                      >
                        Destination Link
                      </label>
                      <div className="flex items-center gap-3">
                        {currentCleanUrl !== SHARED_SITE_URL && targetUrl !== currentCleanUrl && (
                          <button
                            type="button"
                            onClick={() => setTargetUrl(currentCleanUrl)}
                            className="text-xs text-[#E5C8D3] hover:text-white cursor-pointer"
                          >
                            Use current URL
                          </button>
                        )}
                        {targetUrl !== SHARED_SITE_URL && (
                          <button
                            type="button"
                            onClick={() => setTargetUrl(SHARED_SITE_URL)}
                            className="inline-flex items-center gap-1 text-xs text-[#F472B6] hover:text-[#F9A8D4] cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Use shared URL</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <input
                        id="qr-url"
                        type="url"
                        value={targetUrl}
                        onChange={(e) => setTargetUrl(e.target.value)}
                        placeholder="https://..."
                        className="flex-1 min-w-0 rounded-lg border border-[#3B1526] bg-[#080205] px-3 py-2 text-sm text-[#FFF2F6] placeholder:text-[#785161] focus:outline-none focus:border-[#F472B6]"
                      />
                      <button
                        type="button"
                        onClick={handleCopyModalLink}
                        disabled={!trimmedUrl}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#3B1526] bg-[#190610] hover:bg-[#250A17] text-xs font-medium text-[#F5D9E4] transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
                      >
                        {modalCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#F472B6]" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Link2 className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="card-title"
                        className="block text-xs font-medium uppercase tracking-wider text-[#C79BAE] mb-1.5"
                      >
                        Card Heading
                      </label>
                      <input
                        id="card-title"
                        type="text"
                        maxLength={40}
                        value={cardTitle}
                        onChange={(e) => setCardTitle(e.target.value)}
                        className="w-full rounded-lg border border-[#3B1526] bg-[#080205] px-3 py-2 text-sm text-[#FFF2F6] focus:outline-none focus:border-[#F472B6]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="card-subtitle"
                        className="block text-xs font-medium uppercase tracking-wider text-[#C79BAE] mb-1.5"
                      >
                        Card Caption
                      </label>
                      <input
                        id="card-subtitle"
                        type="text"
                        maxLength={54}
                        value={cardSubtitle}
                        onChange={(e) => setCardSubtitle(e.target.value)}
                        className="w-full rounded-lg border border-[#3B1526] bg-[#080205] px-3 py-2 text-sm text-[#FFF2F6] focus:outline-none focus:border-[#F472B6]"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="block text-xs font-medium uppercase tracking-wider text-[#C79BAE] mb-2">
                      Card Style
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {(Object.values(CARD_THEMES) as CardTheme[]).map((theme) => {
                        const selected = theme.id === themeId;
                        return (
                          <button
                            key={theme.id}
                            type="button"
                            onClick={() => setThemeId(theme.id)}
                            className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                              selected
                                ? 'bg-[#9F1239] border-[#F43F5E]/60 text-white'
                                : 'bg-[#080205] border-[#3B1526] text-[#D8B2C0] hover:border-[#632440]'
                            }`}
                          >
                            {theme.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleDownloadCard}
                    disabled={!qrDataUrl || downloadingCard}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#BE123C] hover:bg-[#E11D48] px-5 py-3 text-sm font-semibold text-white transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Keepsake Card (PNG)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadRawQr}
                    disabled={!qrDataUrl}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#47162B] bg-[#16050C] hover:bg-[#240915] px-4 py-3 text-sm font-medium text-[#F5D9E4] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>QR Only (PNG)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
