"use client";

import { useState, useRef, useCallback, useEffect } from "react";

declare global {
  interface Window {
    Tesseract?: {
      recognize: (
        image: string,
        langs: string,
        options?: { logger?: (m: { status: string; progress: number }) => void }
      ) => Promise<{ data: { text: string } }>;
    };
    ocrScriptLoaded?: () => void;
  }
}

export default function OcrPage() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  // Load Tesseract.js from CDN on mount
  useEffect(() => {
    if (document.querySelector("#tesseract-script")) return;
    const script = document.createElement("script");
    script.id = "tesseract-script";
    script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
    script.onload = () => console.log("Tesseract.js loaded");
    document.body.appendChild(script);
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOn(false);
  }, []);

  const startCamera = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraOn(true);
    } catch {
      setError("无法打开相机，请检查权限或在手机浏览器中打开");
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    setImageUrl(canvas.toDataURL("image/png"));
    stopCamera();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const runOcr = async () => {
    if (!imageUrl) return;
    if (!window.Tesseract) {
      setError("OCR 引擎还在加载中，请稍后再试");
      return;
    }
    setLoading(true);
    setProgress("识别中（中英文）...");
    setError("");

    try {
      const result = await window.Tesseract!.recognize(imageUrl, "chi_sim+eng", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setProgress(`识别中... ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      const text = result.data.text?.trim() || "";
      if (text) {
        setOcrText(text);
        setProgress("");
      } else {
        setError("未识别到文字，请确保图片清晰、文字较大");
        setProgress("");
      }
    } catch (err) {
      setError("OCR 失败：" + (err instanceof Error ? err.message : "未知错误"));
      setProgress("");
    }
    setLoading(false);
  };

  const copyText = () => {
    navigator.clipboard.writeText(ocrText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>OCR 识图</h1>
      <p style={styles.subtitle}>拍照或选择图片，识别文字后复制到聊天发送</p>

      {/* Buttons */}
      <div style={styles.buttons}>
        <button onClick={startCamera} style={styles.btn}>
          拍照
        </button>
        <button onClick={() => fileRef.current?.click()} style={styles.btn}>
          选图片
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFile}
          style={{ display: "none" }}
        />
      </div>

      {/* Camera */}
      {cameraOn && (
        <div style={styles.cameraWrap}>
          <video ref={videoRef} autoPlay playsInline style={styles.video} />
          <canvas ref={canvasRef} style={{ display: "none" }} />
          <div style={styles.cameraBtns}>
            <button onClick={capturePhoto} style={styles.btn}>
              拍摄
            </button>
            <button onClick={stopCamera} style={styles.btnSecondary}>
              取消
            </button>
          </div>
        </div>
      )}

      {/* Preview */}
      {imageUrl && (
        <div style={styles.preview}>
          <img src={imageUrl} alt="preview" style={styles.img} />
          <div style={styles.previewBtns}>
            <button onClick={runOcr} disabled={loading} style={{ ...styles.btn, ...(loading ? styles.btnDisabled : {}) }}>
              {loading ? progress || "识别中..." : "开始识别"}
            </button>
            <button
              onClick={() => {
                setImageUrl(null);
                setOcrText("");
                setError("");
              }}
              style={styles.btnSecondary}
            >
              重选
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && <p style={styles.error}>{error}</p>}

      {/* Result */}
      {ocrText && (
        <div style={styles.result}>
          <div style={styles.resultHeader}>
            <strong>识别结果：</strong>
            <button onClick={copyText} style={styles.btnSmall}>
              {copied ? "已复制" : "复制"}
            </button>
          </div>
          <pre style={styles.text}>{ocrText}</pre>
        </div>
      )}

      {/* Back */}
      <a href="/chat" style={styles.backLink}>
        返回聊天
      </a>
    </div>
  );
}

// Inline styles for mobile-first
const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 500,
    margin: "0 auto",
    padding: "20px 16px 40px",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  title: { fontSize: 24, margin: "0 0 4px" },
  subtitle: { color: "#666", fontSize: 14, margin: "0 0 20px" },
  buttons: { display: "flex", gap: 10, marginBottom: 16 },
  btn: {
    padding: "10px 20px",
    background: "#1677ff",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 16,
    cursor: "pointer",
  },
  btnSecondary: {
    padding: "10px 20px",
    background: "#f0f0f0",
    color: "#333",
    border: "none",
    borderRadius: 8,
    fontSize: 16,
    cursor: "pointer",
  },
  btnDisabled: { opacity: 0.5, cursor: "not-allowed" },
  btnSmall: {
    padding: "4px 12px",
    background: "#1677ff",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontSize: 14,
    cursor: "pointer",
  },
  cameraWrap: { marginBottom: 16 },
  video: { width: "100%", borderRadius: 8, background: "#000" },
  cameraBtns: { display: "flex", gap: 10, marginTop: 8 },
  preview: { marginBottom: 16 },
  img: { width: "100%", borderRadius: 8, marginBottom: 8 },
  previewBtns: { display: "flex", gap: 10 },
  error: { color: "#ff4d4f", margin: "8px 0", fontSize: 14 },
  result: {
    background: "#f6f8fa",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  resultHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  text: {
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    fontSize: 15,
    lineHeight: 1.6,
    margin: 0,
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  backLink: {
    display: "block",
    textAlign: "center",
    color: "#1677ff",
    textDecoration: "none",
    fontSize: 14,
  },
};
