// src/components/CameraBarcodeScannerModal.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  XMarkIcon,
  VideoCameraIcon,
  ArrowPathIcon,
  PhotoIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats,
  Html5QrcodeScannerState,
} from "html5-qrcode";
import { playSuccessBeep } from "../utils/barcodeGenerator";

interface CameraBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export const CameraBarcodeScannerModal: React.FC<CameraBarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
}) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedTimeRef = useRef<number>(0);
  const lastScannedCodeRef = useRef<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cameraError, setCameraError] = useState<string>("");
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [continuousMode, setContinuousMode] = useState<boolean>(true);
  const [recentScan, setRecentScan] = useState<{ code: string; time: number } | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraIndex, setSelectedCameraIndex] = useState<number>(0);

  const containerId = "pos-camera-barcode-scanner-view";

  const handleDecodedCode = (decodedText: string) => {
    const rawValue = (decodedText || "").trim();
    if (!rawValue) return;

    const now = Date.now();
    // 1.8s cooldown debounce for same code
    if (
      rawValue === lastScannedCodeRef.current &&
      now - lastScannedTimeRef.current < 1800
    ) {
      return;
    }

    lastScannedCodeRef.current = rawValue;
    lastScannedTimeRef.current = now;

    playSuccessBeep();
    setRecentScan({ code: rawValue, time: now });
    onScan(rawValue);

    if (!continuousMode) {
      onClose();
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.warn("Could not stop camera cleanly", err);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const startScanner = async (cameraId?: string) => {
    setCameraError("");
    await stopScanner();

    // Check DOM element
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
      const scanner = new Html5Qrcode(containerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.CODABAR,
        ],
        verbose: false,
      });
      scannerRef.current = scanner;

      const cameraConfig = cameraId
        ? { deviceId: { exact: cameraId } }
        : { facingMode: "environment" };

      await scanner.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: (w: number, h: number) => {
            const width = Math.floor(Math.min(w * 0.9, 380));
            const height = Math.floor(Math.min(h * 0.75, 200));
            return { width, height };
          },
          aspectRatio: 1.333333,
        },
        (decodedText) => {
          handleDecodedCode(decodedText);
        },
        () => {
          // Frame decode skip, normal in scan loops
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error("Camera start error", err);
      setCameraError(
        err?.message ||
          "Failed to access camera. Please allow camera permissions or test by uploading an image."
      );
      setIsScanning(false);
    }
  };

  // On modal open
  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    let isMounted = true;

    const init = async () => {
      try {
        const available = await Html5Qrcode.getCameras();
        if (!isMounted) return;

        if (available && available.length > 0) {
          setCameras(available);
          const backIndex = available.findIndex((c) =>
            /back|rear|environment/i.test(c.label)
          );
          const chosenIndex = backIndex >= 0 ? backIndex : 0;
          setSelectedCameraIndex(chosenIndex);
          await startScanner(available[chosenIndex].id);
        } else {
          await startScanner();
        }
      } catch {
        if (!isMounted) return;
        await startScanner();
      }
    };

    // Small delay to ensure modal DOM is mounted
    const t = setTimeout(init, 100);

    return () => {
      isMounted = false;
      clearTimeout(t);
      stopScanner();
    };
  }, [isOpen]);

  const switchCamera = async () => {
    if (cameras.length <= 1) {
      toast("Only one camera device detected");
      return;
    }
    const nextIndex = (selectedCameraIndex + 1) % cameras.length;
    setSelectedCameraIndex(nextIndex);
    await startScanner(cameras[nextIndex].id);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const scanner = scannerRef.current || new Html5Qrcode(containerId);
      const res = await scanner.scanFileV2(file, false);
      if (res?.decodedText) {
        handleDecodedCode(res.decodedText);
        toast.success(`Decoded: ${res.decodedText}`);
      } else {
        toast.error("No barcode detected in this image. Try another photo.");
      }
    } catch (err: any) {
      toast.error("Could not read barcode from image. Ensure bars are clear and well lit.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
      <div
        className="bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl border border-slate-800 overflow-hidden flex flex-col text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <VideoCameraIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Camera Barcode Scanner</h3>
              <p className="text-[11px] text-slate-400">
                Point camera at barcode or upload an image
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {cameras.length > 1 && (
              <button
                type="button"
                onClick={switchCamera}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title={`Switch camera (${cameras[selectedCameraIndex]?.label || "Next"})`}
              >
                <ArrowPathIcon className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Upload Barcode Image / Screenshot"
            >
              <PhotoIcon className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewfinder Area */}
        <div className="relative aspect-4/3 w-full bg-black flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center space-y-3 z-10">
              <p className="text-xs text-rose-400 font-medium">{cameraError}</p>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => startScanner()}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Retry Camera
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1"
                >
                  <PhotoIcon className="w-3.5 h-3.5" />
                  Upload Photo
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* HTML5 QR Code Mount Element */}
              <div
                id={containerId}
                className="w-full h-full overflow-hidden flex items-center justify-center [&_video]:w-full! [&_video]:h-full! [&_video]:object-cover! [&_video]:rounded-2xl! [&_img]:hidden!"
              />

              {/* Viewfinder Target Frame Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div
                  className={`relative w-64 h-36 rounded-2xl border-2 transition-all duration-300 ${
                    recentScan && Date.now() - recentScan.time < 500
                      ? "border-emerald-400 bg-emerald-500/20 shadow-lg shadow-emerald-500/50 scale-105"
                      : "border-indigo-400/90 shadow-2xl"
                  }`}
                >
                  {/* Corner accents */}
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-3 border-l-3 border-indigo-400 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-3 border-r-3 border-indigo-400 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-3 border-l-3 border-indigo-400 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-3 border-r-3 border-indigo-400 rounded-br-lg" />

                  {/* Red/Indigo animated laser scanner line */}
                  <div className="absolute inset-x-0 top-1/2 h-0.5 bg-rose-500/80 shadow-[0_0_8px_rgba(244,63,94,1)] animate-pulse" />
                </div>
              </div>

              {/* Recent Scan Pill */}
              {recentScan && Date.now() - recentScan.time < 2000 && (
                <div className="absolute bottom-3 px-3 py-1.5 rounded-full bg-emerald-500/95 text-slate-950 font-bold text-xs shadow-lg animate-bounce flex items-center gap-1.5 z-20">
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>Scanned:</span>
                  <span className="font-mono">{recentScan.code}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Controls */}
        <div className="px-5 py-3.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={continuousMode}
              onChange={(e) => setContinuousMode(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-700 bg-slate-800 cursor-pointer"
            />
            <span className="text-xs text-slate-300 font-medium">Continuous Scan Mode</span>
          </label>

          <span className="text-[11px] text-slate-400">
            {continuousMode ? "Keep scanning products" : "Close after 1 scan"}
          </span>
        </div>
      </div>
    </div>
  );
};
