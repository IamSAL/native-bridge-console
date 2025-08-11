import React, { useState, useEffect, useCallback } from 'react';
import { Copy, RefreshCw, QrCode, Download } from 'lucide-react';
import QRCode from 'react-qr-code';

interface AdditionalData {
  "00": string;
  "01": string;
  "02": string;
}

interface EmvoQrData {
  payloadFormatIndicator: string;
  pointOfInitiationMethod: string;
  merchantAccountInfo: string;
  merchantId: string;
  merchantCategoryCode: string;
  transactionCurrency: string;
  countryCode: string;
  merchantName: string;
  merchantCity: string;
  additionalData: AdditionalData;
  crc: string;
}

interface TLVTag {
  tag: string;
  value: string;
  length: number;
  subTags?: TLVTag[];
}

const EmvoQrGenerator: React.FC = () => {
  const [formData, setFormData] = useState<EmvoQrData>({
    payloadFormatIndicator: "01",
    pointOfInitiationMethod: "11",
    merchantAccountInfo: "0018com.konai.konacard0115410790020044601",
    merchantId: "com.konai.konacard",
    merchantCategoryCode: "3001",
    transactionCurrency: "410",
    countryCode: "KR",
    merchantName: "KONA",
    merchantCity: "KONA",
    additionalData: {
      "00": "KO",
      "01": "테스트",
      "02": "경기도"
    },
    crc: "A26F"
  });

  const [qrString, setQrString] = useState<string>("");
  const [tlvs, setTlvs] = useState<TLVTag[]>([]);
  const [qrSize, setQrSize] = useState<number>(200);
  const [inputQrString, setInputQrString] = useState<string>("");

  // Helper function to calculate length for EMVO QR format
  // For this specific format, length is character count, not UTF-8 byte count
  const getEmvoLength = (str: string): number => {
    return str.length; // Character count, not byte count
  };

  // Helper function to format length as 2-digit string
  const formatLength = (length: number): string => {
    return length.toString().padStart(2, '0');
  };

  // Helper function to create TLV string using EMVO length calculation
  const createTLV = useCallback((tag: string, value: string): string => {
    const length = getEmvoLength(value);
    return tag + formatLength(length) + value;
  }, []);

  // Function to generate merchant account info from merchantId and a fixed value
  const generateMerchantAccountInfo = useCallback((merchantId: string): string => {
    const merchantIdTLV = createTLV("00", merchantId);
    const fixedValueTLV = createTLV("01", merchantId || "410790020044601");
    return merchantIdTLV + fixedValueTLV;
  }, [createTLV]);

  // Function to generate additional data TLV
  const generateAdditionalDataTLV = useCallback((additionalData: AdditionalData): string => {
    const subTLV00 = createTLV("00", additionalData["00"]);
    const subTLV01 = createTLV("01", additionalData["01"]);
    const subTLV02 = createTLV("02", additionalData["02"]);
    return subTLV00 + subTLV01 + subTLV02;
  }, [createTLV]);

  // Function to calculate CRC16-CCITT
  const calculateCRC16 = (data: string): string => {
    let crc = 0xFFFF;
    const bytes = new TextEncoder().encode(data);
    
    for (let i = 0; i < bytes.length; i++) {
      crc ^= bytes[i] << 8;
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) {
          crc = (crc << 1) ^ 0x1021;
        } else {
          crc = crc << 1;
        }
        crc &= 0xFFFF;
      }
    }
    
    return crc.toString(16).toUpperCase().padStart(4, '0');
  };

  // Function to generate QR string and TLVs
  const generateQrString = useCallback((): void => {
    const merchantAccountInfo = generateMerchantAccountInfo(formData.merchantId);
    const additionalDataValue = generateAdditionalDataTLV(formData.additionalData);

    // Build the QR string without CRC first
    let qrWithoutCrc = "";
    qrWithoutCrc += createTLV("00", formData.payloadFormatIndicator);
    qrWithoutCrc += createTLV("01", formData.pointOfInitiationMethod);
    qrWithoutCrc += createTLV("44", merchantAccountInfo);
    qrWithoutCrc += createTLV("52", formData.merchantCategoryCode);
    qrWithoutCrc += createTLV("53", formData.transactionCurrency);
    qrWithoutCrc += createTLV("58", formData.countryCode);
    qrWithoutCrc += createTLV("59", formData.merchantName);
    qrWithoutCrc += createTLV("60", formData.merchantCity);
    qrWithoutCrc += createTLV("64", additionalDataValue);

    // Calculate CRC for the string + "6304"
    const crcInput = qrWithoutCrc + "6304";
    const calculatedCrc = calculateCRC16(crcInput);
    
    // Complete QR string with CRC
    const finalQrString = qrWithoutCrc + createTLV("63", calculatedCrc);
    setQrString(finalQrString);

    // Generate TLV structure
    const newTlvs: TLVTag[] = [
      { tag: "00", value: formData.payloadFormatIndicator, length: getEmvoLength(formData.payloadFormatIndicator) },
      { tag: "01", value: formData.pointOfInitiationMethod, length: getEmvoLength(formData.pointOfInitiationMethod) },
      {
        tag: "44",
        value: merchantAccountInfo,
        length: getEmvoLength(merchantAccountInfo),
        subTags: [
          { tag: "00", value: formData.merchantId, length: getEmvoLength(formData.merchantId) },
          { tag: "01", value: "410790020044601", length: getEmvoLength("410790020044601") }
        ]
      },
      { tag: "52", value: formData.merchantCategoryCode, length: getEmvoLength(formData.merchantCategoryCode) },
      { tag: "53", value: formData.transactionCurrency, length: getEmvoLength(formData.transactionCurrency) },
      { tag: "58", value: formData.countryCode, length: getEmvoLength(formData.countryCode) },
      { tag: "59", value: formData.merchantName, length: getEmvoLength(formData.merchantName) },
      { tag: "60", value: formData.merchantCity, length: getEmvoLength(formData.merchantCity) },
      {
        tag: "64",
        value: additionalDataValue,
        length: getEmvoLength(additionalDataValue),
        subTags: [
          { tag: "00", value: formData.additionalData["00"], length: getEmvoLength(formData.additionalData["00"]) },
          { tag: "01", value: formData.additionalData["01"], length: getEmvoLength(formData.additionalData["01"]) },
          { tag: "02", value: formData.additionalData["02"], length: getEmvoLength(formData.additionalData["02"]) }
        ]
      },
      { tag: "63", value: calculatedCrc, length: getEmvoLength(calculatedCrc) }
    ];
    
    setTlvs(newTlvs);
  }, [formData, createTLV, generateAdditionalDataTLV, generateMerchantAccountInfo]);

  // Function to parse TLV data from QR string
  const parseTLV = useCallback((data: string, startIndex: number = 0): { tag: string; length: number; value: string; nextIndex: number } | null => {
    if (startIndex >= data.length - 3) return null;
    
    const tag = data.substring(startIndex, startIndex + 2);
    const lengthStr = data.substring(startIndex + 2, startIndex + 4);
    const length = parseInt(lengthStr, 10);
    
    if (isNaN(length) || startIndex + 4 + length > data.length) return null;
    
    const value = data.substring(startIndex + 4, startIndex + 4 + length);
    const nextIndex = startIndex + 4 + length;
    
    return { tag, length, value, nextIndex };
  }, []);

  // Function to parse sub-TLVs for merchant account info and additional data
  const parseSubTLVs = useCallback((data: string): { [key: string]: string } => {
    const subTlvs: { [key: string]: string } = {};
    let index = 0;
    
    while (index < data.length) {
      const parsed = parseTLV(data, index);
      if (!parsed) break;
      
      subTlvs[parsed.tag] = parsed.value;
      index = parsed.nextIndex;
    }
    
    return subTlvs;
  }, [parseTLV]);

  // Function to parse QR string and populate form fields
  const parseQrString = useCallback((qrStringToParse: string): void => {
    try {
      const parsedData: Partial<EmvoQrData> = {
        additionalData: { "00": "", "01": "", "02": "" }
      };
      
      let index = 0;
      
      while (index < qrStringToParse.length) {
        const parsed = parseTLV(qrStringToParse, index);
        if (!parsed) break;
        
        switch (parsed.tag) {
          case "00":
            parsedData.payloadFormatIndicator = parsed.value;
            break;
          case "01":
            parsedData.pointOfInitiationMethod = parsed.value;
            break;
          case "44": {
            // Parse merchant account info sub-TLVs
            const merchantSubTlvs = parseSubTLVs(parsed.value);
            parsedData.merchantAccountInfo = parsed.value;
            parsedData.merchantId = merchantSubTlvs["00"] || "";
            break;
          }
          case "52":
            parsedData.merchantCategoryCode = parsed.value;
            break;
          case "53":
            parsedData.transactionCurrency = parsed.value;
            break;
          case "58":
            parsedData.countryCode = parsed.value;
            break;
          case "59":
            parsedData.merchantName = parsed.value;
            break;
          case "60":
            parsedData.merchantCity = parsed.value;
            break;
          case "64": {
            // Parse additional data sub-TLVs
            const additionalSubTlvs = parseSubTLVs(parsed.value);
            parsedData.additionalData = {
              "00": additionalSubTlvs["00"] || "",
              "01": additionalSubTlvs["01"] || "",
              "02": additionalSubTlvs["02"] || ""
            };
            break;
          }
          case "63":
            parsedData.crc = parsed.value;
            break;
        }
        
        index = parsed.nextIndex;
      }
      
      // Update form data with parsed values
      setFormData(prev => ({
        ...prev,
        ...parsedData,
        additionalData: parsedData.additionalData || prev.additionalData
      }));

      // Clear the input QR string after successful parsing
      setInputQrString("");
      
    } catch (error) {
      console.error("Error parsing QR string:", error);
      alert("Invalid QR string format. Please check your input.");
    }
  }, [parseTLV, parseSubTLVs]);

  // Generate QR string on component mount and when form data changes
  useEffect(() => {
    generateQrString();
  }, [generateQrString]);

  const handleInputChange = (field: keyof EmvoQrData, value: string) => {
    if (field === 'additionalData') return; // Handle separately
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAdditionalDataChange = (key: keyof AdditionalData, value: string) => {
    setFormData(prev => ({
      ...prev,
      additionalData: {
        ...prev.additionalData,
        [key]: value
      }
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadQRCode = () => {
    const svg = document.getElementById("qr-code-svg");
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);
      
      const downloadLink = document.createElement("a");
      downloadLink.href = svgUrl;
      downloadLink.download = "emvo-qr-code.svg";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(svgUrl);
    }
  };

  const downloadQRCodePNG = () => {
    const svg = document.getElementById("qr-code-svg");
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      
      canvas.width = 400;
      canvas.height = 400;
      
      img.onload = () => {
        if (ctx) {
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const downloadLink = document.createElement("a");
              downloadLink.href = url;
              downloadLink.download = "emvo-qr-code.png";
              document.body.appendChild(downloadLink);
              downloadLink.click();
              document.body.removeChild(downloadLink);
              URL.revokeObjectURL(url);
            }
          }, "image/png");
        }
      };
      
      img.src = "data:image/svg+xml;base64," + btoa(svgData);
    }
  };

  const resetForm = () => {
    setFormData({
      payloadFormatIndicator: "01",
      pointOfInitiationMethod: "11",
      merchantAccountInfo: "0018com.konai.konacard0115410790020044601",
      merchantId: "com.konai.konacard",
      merchantCategoryCode: "3001",
      transactionCurrency: "410",
      countryCode: "KR",
      merchantName: "KONA",
      merchantCity: "KONA",
      additionalData: {
        "00": "KO",
        "01": "테스트",
        "02": "경기도"
      },
      crc: "A26F"
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <QrCode className="h-6 w-6 text-blue-500" />
          <h1 className="text-2xl font-bold">EMVO QR Generator</h1>
        </div>
        <button
          onClick={resetForm}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Reset</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">QR Code Data</h2>
          
          {/* QR String Parser Section */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h3 className="text-lg font-medium mb-3 text-blue-800 dark:text-blue-200">Parse QR String</h3>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-blue-700 dark:text-blue-300">
                Paste QR string to parse and populate fields:
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={inputQrString}
                  onChange={(e) => setInputQrString(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && inputQrString.trim()) {
                      parseQrString(inputQrString);
                    }
                  }}
                  placeholder="00020101021144410018com.konai.konacard..."
                  className="flex-1 px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm font-mono"
                />
                <button
                  onClick={() => parseQrString(inputQrString)}
                  disabled={!inputQrString.trim()}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors text-sm"
                >
                  Parse
                </button>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                This will automatically populate all form fields below based on the QR string.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Payload Format Indicator</label>
              <input
                type="text"
                value={formData.payloadFormatIndicator}
                onChange={(e) => handleInputChange('payloadFormatIndicator', e.target.value)}
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Point of Initiation Method</label>
              <input
                type="text"
                value={formData.pointOfInitiationMethod}
                onChange={(e) => handleInputChange('pointOfInitiationMethod', e.target.value)}
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Merchant ID</label>
              <input
                type="text"
                value={formData.merchantId}
                onChange={(e) => handleInputChange('merchantId', e.target.value)}
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Merchant Category Code</label>
              <input
                type="text"
                value={formData.merchantCategoryCode}
                onChange={(e) => handleInputChange('merchantCategoryCode', e.target.value)}
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Transaction Currency</label>
              <input
                type="text"
                value={formData.transactionCurrency}
                onChange={(e) => handleInputChange('transactionCurrency', e.target.value)}
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Country Code</label>
              <input
                type="text"
                value={formData.countryCode}
                onChange={(e) => handleInputChange('countryCode', e.target.value)}
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Merchant Name</label>
              <input
                type="text"
                value={formData.merchantName}
                onChange={(e) => handleInputChange('merchantName', e.target.value)}
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Merchant City</label>
              <input
                type="text"
                value={formData.merchantCity}
                onChange={(e) => handleInputChange('merchantCity', e.target.value)}
                className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-3">Additional Data</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Country (00)</label>
                  <input
                    type="text"
                    value={formData.additionalData["00"]}
                    onChange={(e) => handleAdditionalDataChange("00", e.target.value)}
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description (01)</label>
                  <input
                    type="text"
                    value={formData.additionalData["01"]}
                    onChange={(e) => handleAdditionalDataChange("01", e.target.value)}
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Location (02)</label>
                  <input
                    type="text"
                    value={formData.additionalData["02"]}
                    onChange={(e) => handleAdditionalDataChange("02", e.target.value)}
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Output Section */}
        <div className="space-y-6">
          {/* QR Code Image */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">QR Code Image</h2>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium">Size:</label>
                  <select
                    value={qrSize}
                    onChange={(e) => setQrSize(Number(e.target.value))}
                    className="px-2 py-1 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm"
                  >
                    <option value={128}>128px</option>
                    <option value={200}>200px</option>
                    <option value={300}>300px</option>
                    <option value={400}>400px</option>
                  </select>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={downloadQRCode}
                    className="flex items-center space-x-1 px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-sm transition-colors"
                  >
                    <Download className="h-3 w-3" />
                    <span>SVG</span>
                  </button>
                  <button
                    onClick={downloadQRCodePNG}
                    className="flex items-center space-x-1 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors"
                  >
                    <Download className="h-3 w-3" />
                    <span>PNG</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-center bg-white rounded p-4">
              {qrString && (
                <QRCode
                  id="qr-code-svg"
                  value={qrString}
                  size={qrSize}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  viewBox={`0 0 ${qrSize} ${qrSize}`}
                />
              )}
            </div>
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 text-center">
              Scan this QR code to test the EMVO payment data
            </div>
          </div>

          {/* QR String */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Generated QR String</h2>
              <button
                onClick={() => copyToClipboard(qrString)}
                className="flex items-center space-x-1 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors"
              >
                <Copy className="h-3 w-3" />
                <span>Copy</span>
              </button>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded p-4 font-mono text-sm break-all">
              {qrString}
            </div>
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Length: {qrString.length} characters
            </div>
          </div>

          {/* TLV Structure */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">TLV Structure</h2>
              <button
                onClick={() => copyToClipboard(JSON.stringify(tlvs, null, 2))}
                className="flex items-center space-x-1 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors"
              >
                <Copy className="h-3 w-3" />
                <span>Copy JSON</span>
              </button>
            </div>
            <div className="space-y-3">
              {tlvs.map((tlv, index) => (
                <div key={index} className="bg-gray-50 dark:bg-gray-900 rounded p-3">
                  <div className="font-mono text-sm">
                    <div className="flex items-center space-x-4">
                      <span className="font-semibold text-blue-600 dark:text-blue-400">Tag: {tlv.tag}</span>
                      <span className="text-gray-600 dark:text-gray-400">Length: {tlv.length}</span>
                    </div>
                    <div className="mt-1 break-all">
                      <span className="text-gray-800 dark:text-gray-200">Value: {tlv.value}</span>
                    </div>
                    {tlv.subTags && (
                      <div className="mt-2 ml-4 space-y-1">
                        <div className="text-xs text-gray-600 dark:text-gray-400 font-semibold">Sub Tags:</div>
                        {tlv.subTags.map((subTag, subIndex) => (
                          <div key={subIndex} className="text-xs bg-gray-100 dark:bg-gray-800 rounded p-2">
                            <span className="text-green-600 dark:text-green-400">Tag: {subTag.tag}</span>
                            <span className="ml-2 text-gray-600 dark:text-gray-400">Length: {subTag.length}</span>
                            <div className="break-all">Value: {subTag.value}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmvoQrGenerator;
