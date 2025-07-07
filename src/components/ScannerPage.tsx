import React, { useState, useRef, useCallback } from 'react';
import { BarcodeScanner } from 'react-barcode-scanner';
import "react-barcode-scanner/polyfill"
import { 
  Camera, 
  Upload, 
  AlertTriangle, 
  CheckCircle, 
  Copy, 
  RefreshCw,
  Info,
  Smartphone,
  Monitor,
  Zap,
  QrCode,
  X
} from 'lucide-react';
import { useMessages } from '../context/MessageContext';
import { detectBridgeType, BridgeType } from '../utils/bridgeUtils';
import ErrorBoundary from './ErrorBoundary';

interface ScanResult {
  text: string;
  format?: string;
  timestamp: Date;
  source: 'camera' | 'file';
}

interface DebugInfo {
  userAgent: string;
  platform: string;
  bridgeType: BridgeType;
  cameraSupported: boolean;
  fileUploadSupported: boolean;
  mediaDevices: boolean;
  webRTC: boolean;
  permissions: {
    camera?: string;
    microphone?: string;
  };
}

const ScannerPage: React.FC = () => {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addMessageToHistory } = useMessages();
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [permissionChecked, setPermissionChecked] = useState(false);

  React.useEffect(() => {
    collectDebugInfo();
  }, []);

  React.useEffect(() => {
    // Only check permission if running in Android bridge environment
    if (typeof window !== "undefined" && (window as any).AndroidBridge) {
      (window as any).AndroidBridge.checkCameraPermission();
      (window as any).onCameraPermissionResult = function (granted: boolean | string) {
        setPermissionChecked(true);
        setPermissionGranted(granted === true || granted === "true");
      };
    } else if (debugInfo?.bridgeType === 'ANDROID') {
      // If bridge expected but not present, show error
      setPermissionChecked(true);
      setPermissionGranted(false);
    } else {
      // Not Android bridge, assume permission is handled by browser
      setPermissionChecked(true);
      setPermissionGranted(true);
    }
  }, [debugInfo?.bridgeType]);

  const collectDebugInfo = async () => {
    const info: DebugInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      bridgeType: detectBridgeType(),
      cameraSupported: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      fileUploadSupported: !!(window.File && window.FileReader && window.FileList && window.Blob),
      mediaDevices: !!navigator.mediaDevices,
      webRTC: !!(window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection),
      permissions: {}
    };

    // Check permissions if available
    if (navigator.permissions) {
      try {
        const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        info.permissions.camera = cameraPermission.state;
      } catch (e) {
        console.log('Camera permission check not supported');
      }
    }

    setDebugInfo(info);
  };

  const handleScan = useCallback((result: string, rawResult) => {
    if (result) {
      const scanData: ScanResult = {
        text: result,
        timestamp: new Date(),
        source: 'camera',
        rawResult
      };
      
      setScanResult(scanData);
      setScanHistory(prev => [scanData, ...prev.slice(0, 9)]); // Keep last 10 scans
      setIsScanning(false);
      
      // Add to message history for native bridge testing
      addMessageToHistory({
        scanResult: result,
        scanType: 'qr_barcode',
        source: 'camera',
        timestamp: scanData.timestamp.toISOString()
      }, true, debugInfo?.bridgeType);
    }
  }, [addMessageToHistory, debugInfo]);

  const handleError = useCallback((error: any) => {
    console.log("ERROR OCCURED", error)
    // console.error('Scanner error:', error);
    // setError(`Scanner error: ${error?.message || 'Unknown error'}`);
    // setIsScanning(false);
  }, []);

  const startScanning = () => {
    setError(null);
    setScanResult(null);
    setIsScanning(true);
  };

  const stopScanning = () => {
    setIsScanning(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      
      // Create an image element to process
      const img = new Image();
      img.onload = () => {
        try {
          // For demo purposes, we'll simulate a scan result
          // In a real implementation, you'd use a library like @zxing/library directly
          const mockResult = `File upload scan: ${file.name} (${new Date().toISOString()})`;
          
          const scanData: ScanResult = {
            text: mockResult,
            timestamp: new Date(),
            source: 'file'
          };
          
          setScanResult(scanData);
          setScanHistory(prev => [scanData, ...prev.slice(0, 9)]);
          
          addMessageToHistory({
            scanResult: mockResult,
            scanType: 'qr_barcode',
            source: 'file',
            fileName: file.name,
            timestamp: scanData.timestamp.toISOString()
          }, true, debugInfo?.bridgeType);
          
        } catch (error) {
          setError('Failed to process uploaded image');
        }
      };
      img.src = imageData;
    };
    
    reader.onerror = () => {
      setError('Failed to read uploaded file');
    };
    
    reader.readAsDataURL(file);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const clearHistory = () => {
    setScanHistory([]);
  };

  const getBridgeIcon = (bridgeType: BridgeType) => {
    switch (bridgeType) {
      case BridgeType.ANDROID:
      case BridgeType.IOS:
      case BridgeType.REACT_NATIVE:
        return <Smartphone className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const canUseCamera = debugInfo?.cameraSupported;
  const canUploadFile = debugInfo?.fileUploadSupported;
  const hasAnySupport = canUseCamera || canUploadFile;

  return (
    <ErrorBoundary>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold flex items-center space-x-2">
                <QrCode className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
                <span>QR/Barcode Scanner</span>
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">
                Test barcode and QR code scanning across different platforms
              </p>
            </div>
            <div className="flex items-center justify-between sm:justify-end space-x-2">
              <div className="flex items-center space-x-2 text-sm">
                {getBridgeIcon(debugInfo?.bridgeType || BridgeType.NONE)}
                <span className="text-gray-500 dark:text-gray-400">
                  {debugInfo?.bridgeType || 'Loading...'}
                </span>
              </div>
              <button
                onClick={() => setShowDebugInfo(!showDebugInfo)}
                className="sm:hidden p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-md"
              >
                <Info className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Support Warning */}
        {!hasAnySupport && debugInfo && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Scanner Not Supported</span>
            </div>
            <p className="text-red-600 dark:text-red-400 mt-1 text-sm">
              Neither camera access nor file upload is supported in this environment.
            </p>
          </div>
        )}

        {/* Scanner Interface */}
        {hasAnySupport && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
            {/* Scanner Controls */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
              <div className="p-4 border-b dark:border-gray-700">
                <div className="flex space-x-2 sm:space-x-4">
                  {canUseCamera && (
                    <button
                      onClick={() => setActiveTab('camera')}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors text-sm sm:text-base ${
                        activeTab === 'camera'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                      }`}
                    >
                      <Camera className="h-4 w-4" />
                      <span>Camera</span>
                    </button>
                  )}
                  {canUploadFile && (
                    <button
                      onClick={() => setActiveTab('upload')}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors text-sm sm:text-base ${
                        activeTab === 'upload'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                      }`}
                    >
                      <Upload className="h-4 w-4" />
                      <span>Upload</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4">
                {activeTab === 'camera' && canUseCamera && (
                  <div className="space-y-4">
                    {!permissionChecked ? (
                      <div className="flex items-center justify-center h-40">
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Checking camera permission...</p>
                      </div>
                    ) : !permissionGranted ? (
                      <div className="flex items-center justify-center h-40">
                        <p className="text-red-500 dark:text-red-400 text-sm">Camera permission not granted.</p>
                      </div>
                    ) : (
                      <>
                        <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden relative">
                          {isScanning ? (
                            <ErrorBoundary fallback={
                              <div className="flex items-center justify-center h-full">
                                <div className="text-center">
                                  <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                                  <p className="text-red-500 text-sm">Camera failed to load</p>
                                  <button
                                    onClick={stopScanning}
                                    className="mt-2 px-3 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded"
                                  >
                                    Stop
                                  </button>
                                </div>
                              </div>
                            }>
                              <BarcodeScanner
                                width="100%"
                                height="100%"
                                onUpdate={(err, result) => {
                                  if (result) {
                                    handleScan(result.getText(), result);
                                  }
                                  if (err) {
                                    handleError(err);
                                  }
                                }}
                              />
                            </ErrorBoundary>
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <div className="text-center">
                                <Camera className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-2" />
                                <p className="text-gray-500 dark:text-gray-400 text-sm">
                                  Click start to begin scanning
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          {!isScanning ? (
                            <button
                              onClick={startScanning}
                              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors text-sm sm:text-base"
                            >
                              <Camera className="h-4 w-4" />
                              <span>Start Scanning</span>
                            </button>
                          ) : (
                            <button
                              onClick={stopScanning}
                              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors text-sm sm:text-base"
                            >
                              <X className="h-4 w-4" />
                              <span>Stop Scanning</span>
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'upload' && canUploadFile && (
                  <div className="space-y-4">
                    <div 
                      className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 sm:p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 dark:text-gray-400 mb-1 text-sm sm:text-base">
                        Click to upload an image with QR/barcode
                      </p>
                      <p className="text-xs sm:text-sm text-gray-400">
                        Supports JPG, PNG, GIF formats
                      </p>
                    </div>
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                )}

                {error && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                    <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm">{error}</span>
                    </div>
                  </div>
                )}

                {scanResult && (
                  <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                        <CheckCircle className="h-4 w-4" />
                        <span className="font-medium text-sm sm:text-base">Scan Successful</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(scanResult.text)}
                        className="p-1 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded border font-mono text-xs sm:text-sm break-all">
                      {scanResult.text}
                    </div>
                    <div className="mt-2 text-xs text-green-600 dark:text-green-400">
                      Source: {scanResult.source} • {scanResult.timestamp.toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Scan History & Debug Info - Desktop */}
            <div className="hidden xl:block space-y-6">
              <ScanHistoryPanel 
                scanHistory={scanHistory}
                onClearHistory={clearHistory}
                onCopyToClipboard={copyToClipboard}
              />
              
              {debugInfo && (
                <DebugInfoPanel debugInfo={debugInfo} getBridgeIcon={getBridgeIcon} />
              )}
            </div>
          </div>
        )}

        {/* Mobile History & Debug Info */}
        <div className="xl:hidden space-y-4">
          <ScanHistoryPanel 
            scanHistory={scanHistory}
            onClearHistory={clearHistory}
            onCopyToClipboard={copyToClipboard}
          />
          
          {debugInfo && (showDebugInfo || !hasAnySupport) && (
            <DebugInfoPanel debugInfo={debugInfo} getBridgeIcon={getBridgeIcon} />
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

// Extracted components for better organization
interface ScanHistoryPanelProps {
  scanHistory: ScanResult[];
  onClearHistory: () => void;
  onCopyToClipboard: (text: string) => void;
}

const ScanHistoryPanel: React.FC<ScanHistoryPanelProps> = ({ 
  scanHistory, 
  onClearHistory, 
  onCopyToClipboard 
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
    <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
      <h3 className="font-medium">Scan History</h3>
      {scanHistory.length > 0 && (
        <button
          onClick={onClearHistory}
          className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
        >
          Clear
        </button>
      )}
    </div>
    <div className="max-h-64 sm:max-h-80 overflow-y-auto">
      {scanHistory.length === 0 ? (
        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
          <p className="text-sm">No scans yet</p>
        </div>
      ) : (
        <ul className="divide-y dark:divide-gray-700">
          {scanHistory.map((scan, index) => (
            <li key={index} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-750">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-xs sm:text-sm truncate">
                    {scan.text}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {scan.source} • {scan.timestamp.toLocaleTimeString()}
                  </div>
                </div>
                <button
                  onClick={() => onCopyToClipboard(scan.text)}
                  className="ml-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
              <div>
                   <details className="text-xs">
        <summary className="cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
          Raw
        </summary>
        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded font-mono break-all text-xs">
         <pre>
          {JSON.stringify(scan.rawResult,null,2)}
         </pre>
        </div>
      </details>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  </div>
);

interface DebugInfoPanelProps {
  debugInfo: DebugInfo;
  getBridgeIcon: (bridgeType: BridgeType) => React.ReactNode;
}

const DebugInfoPanel: React.FC<DebugInfoPanelProps> = ({ debugInfo, getBridgeIcon }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
    <div className="p-4 border-b dark:border-gray-700">
      <h3 className="font-medium flex items-center space-x-2">
        <Info className="h-4 w-4" />
        <span>Debug Information</span>
      </h3>
    </div>
    <div className="p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500 dark:text-gray-400">Platform:</span>
          <div className="font-mono text-xs sm:text-sm break-all">{debugInfo.platform}</div>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Bridge:</span>
          <div className="flex items-center space-x-1">
            {getBridgeIcon(debugInfo.bridgeType)}
            <span className="font-mono text-xs sm:text-sm">{debugInfo.bridgeType}</span>
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="text-gray-500 dark:text-gray-400 text-sm">Capabilities:</div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className={`flex items-center space-x-2 ${debugInfo.cameraSupported ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            <div className={`w-2 h-2 rounded-full ${debugInfo.cameraSupported ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>Camera</span>
          </div>
          <div className={`flex items-center space-x-2 ${debugInfo.fileUploadSupported ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            <div className={`w-2 h-2 rounded-full ${debugInfo.fileUploadSupported ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>File Upload</span>
          </div>
          <div className={`flex items-center space-x-2 ${debugInfo.mediaDevices ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            <div className={`w-2 h-2 rounded-full ${debugInfo.mediaDevices ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>Media Devices</span>
          </div>
          <div className={`flex items-center space-x-2 ${debugInfo.webRTC ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            <div className={`w-2 h-2 rounded-full ${debugInfo.webRTC ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>WebRTC</span>
          </div>
        </div>
      </div>

      {debugInfo.permissions.camera && (
        <div>
          <span className="text-gray-500 dark:text-gray-400 text-sm">Camera Permission:</span>
          <div className={`font-mono text-sm ${
            debugInfo.permissions.camera === 'granted' 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-yellow-600 dark:text-yellow-400'
          }`}>
            {debugInfo.permissions.camera}
          </div>
        </div>
      )}

      <details className="text-xs">
        <summary className="cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
          User Agent
        </summary>
        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded font-mono break-all text-xs">
          {debugInfo.userAgent}
        </div>
      </details>
    </div>
  </div>
);

export default ScannerPage;