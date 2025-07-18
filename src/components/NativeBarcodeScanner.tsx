import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, AlertTriangle, CheckCircle, Copy, RefreshCw, Zap, ChevronDown, Eye } from 'lucide-react';
import { useMessages } from '../context/MessageContext';
import { detectBridgeType } from '../utils/bridgeUtils';
import ErrorBoundary from './ErrorBoundary';
import {
  BarcodeDetector, 
  ZXING_WASM_VERSION,
  prepareZXingModule,
} from "barcode-detector/ponyfill";
// Type definitions for the Barcode Detection API

prepareZXingModule({
  overrides: {
    locateFile: (path, prefix) => {
      if (path.endsWith(".wasm")) {
        return `https://unpkg.com/zxing-wasm@${ZXING_WASM_VERSION}/dist/reader/${path}`;
      }
      return prefix + path;
    },
  },
});

interface DetectedBarcode {
  rawValue: string;
  format: string;
  boundingBox: DOMRectReadOnly;
  cornerPoints: Array<{ x: number; y: number }>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): BarcodeDetector;
  getSupportedFormats(): Promise<string[]>;
}

declare global {
  interface Window {
    BarcodeDetector: BarcodeDetectorConstructor;
  }
}

interface ScanResult {
  text: string;
  format: string;
  timestamp: Date;
  source: 'camera';
}

interface ProcessedFrame {
  dataUrl: string;
  timestamp: Date;
  frameNumber: number;
}

const NativeBarcodeScanner: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [processedFrames, setProcessedFrames] = useState<ProcessedFrame[]>([]);
  const [showDebugView, setShowDebugView] = useState(false);
  const [frameCounter, setFrameCounter] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetector | null>(null);
  const animationRef = useRef<number | null>(null);
  const isScanningRef = useRef<boolean>(false);
  const { addMessageToHistory } = useMessages();

  
  const checkBarcodeDetectionSupport = useCallback(async () => {
    try {
      // Check if BarcodeDetector is supported
      if (!('BarcodeDetector' in window)) {
        console.log("barcode not supported");
        setIsSupported(false);
        setError('Barcode Detection API is not supported in this browser');
        return;
      }

      // Check if CODE_128 and CODE_39 are supported
      const supportedFormats = await BarcodeDetector.getSupportedFormats();
      console.log({supportedFormats});
      const hasRequiredFormats = supportedFormats.includes('code_128') && supportedFormats.includes('code_39');
      
      if (!hasRequiredFormats) {
        setIsSupported(false);
        setError('CODE_128 and CODE_39 formats are not supported');
        return;
      }

      setIsSupported(true);
      await checkCameraPermission();
    } catch (error) {
      console.error('Failed to check barcode detection support:', error);
      setIsSupported(false);
      setError('Failed to check barcode detection support');
    }
  }, []);

  useEffect(() => {
    checkBarcodeDetectionSupport();
    return () => {
      stopScanning();
    };
  }, [checkBarcodeDetectionSupport]);

  const checkCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
    } catch (error) {
      console.error('Camera permission error:', error);
      setHasPermission(false);
      setError('Camera permission denied or not available');
    }
  };

  const getFocusAreaBounds = () => {
    if (!videoRef.current) return null;
    
    const video = videoRef.current;
    const videoRect = video.getBoundingClientRect();
    
    // Focus area dimensions - responsive for mobile
    const focusWidth = Math.min(300, window.innerWidth * 0.8);
    const focusHeight = Math.min(160, window.innerHeight * 0.2);
    
    // Calculate focus area position (center of screen)
    const focusX = (videoRect.width - focusWidth) / 2;
    const focusY = (videoRect.height - focusHeight) / 2;
    
    // Convert to video coordinates
    const scaleX = video.videoWidth / videoRect.width;
    const scaleY = video.videoHeight / videoRect.height;
    
    return {
      x: focusX * scaleX,
      y: focusY * scaleY,
      width: focusWidth * scaleX,
      height: focusHeight * scaleY
    };
  };

  const cropVideoToFocusArea = (video: HTMLVideoElement) => {
    if (!canvasRef.current) return null;
    
    const focusArea = getFocusAreaBounds();
    if (!focusArea) return null;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    // Set canvas size to focus area
    canvas.width = focusArea.width;
    canvas.height = focusArea.height;
    
    // Draw the cropped video frame
    ctx.drawImage(
      video,
      focusArea.x, focusArea.y, focusArea.width, focusArea.height,
      0, 0, focusArea.width, focusArea.height
    );
    
    return canvas;
  };

  const saveProcessedFrame = (canvas: HTMLCanvasElement) => {
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    const newFrame: ProcessedFrame = {
      dataUrl,
      timestamp: new Date(),
      frameNumber: frameCounter + 1
    };
    
    setFrameCounter(prev => prev + 1);
    setProcessedFrames(prev => {
      const updated = [newFrame, ...prev];
      return updated.slice(0, 10); // Keep only last 10 frames
    });
  };

  const startScanning = async () => {
    try {
      setIsScanning(true);
      isScanningRef.current = true;
      setError(null);
      setScanResult(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;

        // Create barcode detector for CODE_128 and CODE_39
        detectorRef.current = new BarcodeDetector({
          formats: ['code_128', 'code_39']
        });

        // Start detection loop
        const detectBarcodes = async () => {
          console.log("Detection loop running, isScanning:", isScanningRef.current);
          if (!videoRef.current || !detectorRef.current) return;

          // Check if we should continue scanning
          if (!isScanningRef.current) {
            console.log("Stopping detection loop");
            return;
          }

          try {
            // Crop video to focus area before detection
            const croppedCanvas = cropVideoToFocusArea(videoRef.current);
            if (croppedCanvas) {
              // Save frame for debugging
              saveProcessedFrame(croppedCanvas);

              console.log("Detecting barcodes in cropped canvas");
              const barcodes = await detectorRef.current.detect(croppedCanvas);
              console.log("Barcodes found:", barcodes.length);

              if (barcodes.length > 0) {
                const barcode = barcodes[0];
                console.log("Barcode detected:", barcode.rawValue);
                handleBarcodeDetected(barcode);
                return;
              }
            }
          } catch (error) {
            console.error('Detection error:', error);
          }

          // Continue scanning
          animationRef.current = requestAnimationFrame(detectBarcodes);
        };

        // Start detection after video is loaded
        videoRef.current.onloadedmetadata = () => {
          console.log("Video loaded, starting detection");
          detectBarcodes();
        };
      }
    } catch (error) {
      console.error('Failed to start camera:', error);
      setError('Failed to start camera');
      setIsScanning(false);
      isScanningRef.current = false;
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
    isScanningRef.current = false;
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    detectorRef.current = null;
  };

  const handleBarcodeDetected = (barcode: DetectedBarcode) => {
    const result: ScanResult = {
      text: barcode.rawValue,
      format: barcode.format,
      timestamp: new Date(),
      source: 'camera'
    };
    
    setScanResult(result);
    setIsScanning(false);
    isScanningRef.current = false;
    stopScanning();
    
    // Add to message history
    addMessageToHistory({
      scanResult: result.text,
      scanType: 'barcode',
      format: result.format,
      source: 'native_camera',
      timestamp: result.timestamp.toISOString()
    }, true, detectBridgeType());
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const resetScanner = () => {
    setScanResult(null);
    setError(null);
  };

  if (isSupported === null) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Checking barcode detection support...</p>
        </div>
      </div>
    );
  }

  if (!isSupported) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center p-4">
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 max-w-md text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-white text-xl font-bold mb-2">Not Supported</h2>
          <p className="text-red-300 mb-4">{error}</p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (hasPermission === null) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Checking camera permission...</p>
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center p-4">
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 max-w-md text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-white text-xl font-bold mb-2">Camera Access Required</h2>
          <p className="text-red-300 mb-4">{error}</p>
          <div className="space-y-2">
            <button
              onClick={checkCameraPermission}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              Request Permission
            </button>
            <button
              onClick={() => window.history.back()}
              className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="fixed inset-0 bg-black">
        {/* Video Stream */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          playsInline
          muted
        />
        
        {/* Hidden canvas for cropping */}
        <canvas
          ref={canvasRef}
          className="hidden"
        />
        
        {/* Debug View Dropdown */}
        {processedFrames.length > 0 && (
          <div className="absolute top-16 right-4 z-10">
            <button
              onClick={() => setShowDebugView(!showDebugView)}
              className="flex items-center space-x-2 bg-black/70 hover:bg-black/80 text-white px-3 py-2 rounded-lg text-sm transition-colors"
            >
              <Eye className="h-4 w-4" />
              <span>Debug ({processedFrames.length})</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showDebugView ? 'rotate-180' : ''}`} />
            </button>
            
            {showDebugView && (
              <div className="mt-2 bg-black/90 rounded-lg p-3 max-h-96 overflow-y-auto">
                <h3 className="text-white text-sm font-medium mb-2">Last 10 Processed Frames</h3>
                <div className="space-y-2">
                  {processedFrames.map((frame, index) => (
                    <div key={frame.frameNumber} className="border border-gray-600 rounded p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-300">Frame #{frame.frameNumber}</span>
                        <span className="text-xs text-gray-400">{frame.timestamp.toLocaleTimeString()}</span>
                      </div>
                      <img
                        src={frame.dataUrl}
                        alt={`Processed frame ${frame.frameNumber}`}
                        className="w-full h-16 object-cover rounded border"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Focus Box Overlay - Responsive */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative border-2 border-white rounded-lg" style={{
            width: `${Math.min(300, window.innerWidth * 0.8)}px`,
            height: `${Math.min(160, window.innerHeight * 0.2)}px`
          }}>
            {/* Corner indicators */}
            <div className="absolute -top-1 -left-1 w-3 h-3 sm:w-4 sm:h-4 border-l-2 border-t-2 border-blue-500"></div>
            <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 border-r-2 border-t-2 border-blue-500"></div>
            <div className="absolute -bottom-1 -left-1 w-3 h-3 sm:w-4 sm:h-4 border-l-2 border-b-2 border-blue-500"></div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 border-r-2 border-b-2 border-blue-500"></div>
            
            {/* Scanning line animation */}
            {isScanning && (
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500 animate-pulse"></div>
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-bounce"></div>
              </div>
            )}
          </div>
        </div>
        
        {/* Header - Mobile responsive */}
        <div className="absolute top-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-b from-black/50 to-transparent">
          <div className="flex items-center justify-between">
            <button
              onClick={() => window.history.back()}
              className="p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
            >
              <X className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </button>
            
            <div className="flex items-center space-x-2 text-white">
              <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
              <span className="font-medium text-sm sm:text-base">Native Barcode Scanner</span>
            </div>
            
            <div className="w-9 h-9 sm:w-10 sm:h-10"></div>
          </div>
        </div>
        
        {/* Bottom Controls - Mobile responsive */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-black/70 to-transparent">
          <div className="text-center space-y-3 sm:space-y-4">
            {/* Instructions */}
            <div className="text-white text-xs sm:text-sm">
              <p className="font-medium mb-1">Position barcode within the focus area</p>
              <p className="text-gray-300 text-xs">Supports CODE_128 and CODE_39 formats</p>
            </div>
            
            {/* Scan Button */}
            <div className="flex justify-center">
              {!isScanning ? (
                <button
                  onClick={startScanning}
                  className="px-6 py-2.5 sm:px-8 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors flex items-center space-x-2 text-sm sm:text-base"
                >
                  <span>Start Scanning</span>
                </button>
              ) : (
                <button
                  onClick={stopScanning}
                  className="px-6 py-2.5 sm:px-8 sm:py-3 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors flex items-center space-x-2 text-sm sm:text-base"
                >
                  <span>Stop Scanning</span>
                </button>
              )}
            </div>
            
            {/* Error Display */}
            {error && (
              <div className="bg-red-900/20 border border-red-500 rounded-lg p-3 sm:p-4">
                <div className="flex items-center space-x-2 text-red-400">
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-xs sm:text-sm">{error}</span>
                </div>
              </div>
            )}
            
            {/* Success Display */}
            {scanResult && (
              <div className="bg-green-900/20 border border-green-500 rounded-lg p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2 text-green-400">
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="font-medium text-xs sm:text-sm">Barcode Detected!</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(scanResult.text)}
                    className="p-1 hover:bg-green-700/20 rounded transition-colors"
                  >
                    <Copy className="h-3 w-3 sm:h-4 sm:w-4 text-green-400" />
                  </button>
                </div>
                <div className="text-left space-y-1">
                  <div className="text-white font-mono text-xs sm:text-sm break-all">
                    {scanResult.text}
                  </div>
                  <div className="text-gray-300 text-xs">
                    Format: {scanResult.format.toUpperCase()} • {scanResult.timestamp.toLocaleString()}
                  </div>
                </div>
                <div className="mt-3 flex space-x-2">
                  <button
                    onClick={() => {
                      resetScanner();
                      setIsScanning(true);
                    }}
                    className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors text-xs sm:text-sm"
                  >
                    Scan Again
                  </button>
                  <button
                    onClick={() => window.history.back()}
                    className="flex-1 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors text-xs sm:text-sm"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default NativeBarcodeScanner;