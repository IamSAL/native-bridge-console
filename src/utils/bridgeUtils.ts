import { MessagePayload } from '../context/MessageContext';

export type ModuleStatus = 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export type WebViewResponseObject = {
  userId?: string;
  physicalCardNo?: string;
  mobileCardNo?: string;
  paymentSuccess?: boolean;
  paymentResponse?: any;
  cardPar?: string;
  bankCode?: string;
  bankName?: string;
  resultCode?: string;
  chargedAmount?: number | string;
  status?: ModuleStatus;
  scanResult?: string;
  scanType?: string;
  source?: string;
  fileName?: string;
  timestamp?: string;
};

export type WebViewResponse = {
  message: string;
  data: WebViewResponseObject;
};

export enum BridgeType {
  REACT_NATIVE = 'React Native WebView',
  IOS = 'iOS WebKit',
  ANDROID = 'Android Bridge',
  NONE = 'Not Available'
}

export const detectBridgeType = (): BridgeType => {
  // @ts-ignore - These properties might not exist in all environments
  if (window.ReactNativeWebView) {
    return BridgeType.REACT_NATIVE;
  // @ts-ignore
  } else if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.jsMessageHandler) {
    return BridgeType.IOS;
  // @ts-ignore
  } else if (window.androidBridge) {
    return BridgeType.ANDROID;
  } else {
    return BridgeType.NONE;
  }
};

const clearSessionStroage = () => {
  sessionStorage.removeItem("CALLBACK_URL");
};

const DefaultPayload: WebViewResponse = {
  message: 'CloseWebView',
  data: { status: 'IN_PROGRESS' },
};

export function closeModule(data: WebViewResponse = DefaultPayload): boolean {
  console.log('### Closing the Module ###', JSON.stringify(data));

  const callbackUrl = sessionStorage.getItem("CALLBACK_URL");

  if (callbackUrl) {
    const url = new URL(callbackUrl);
    url.searchParams.set('kpdata', JSON.stringify(data.data));
    clearSessionStroage();
    window.location.replace(url.toString());
    return true;
  }
  
  const sendNativeMessage = (messageData: string): boolean => {
    try {
      // @ts-ignore
      if (window.ReactNativeWebView) {
        // @ts-ignore
        window.ReactNativeWebView.postMessage(messageData);
        return true;
      } else if (
        // @ts-ignore
        window.webkit &&
        // @ts-ignore
        window.webkit.messageHandlers.jsMessageHandler
      ) {
        // @ts-ignore
        window.webkit.messageHandlers.jsMessageHandler.postMessage(messageData);
        return true;
        // @ts-ignore
      } else if (window.androidBridge) {
        // @ts-ignore
        window.androidBridge.postMessage(messageData);
        return true;
      } else {
        console.error('Native communication not supported.');
        return false;
      }
    } catch (error) {
      console.error('Failed to send native message:', error);
      return false;
    }
  };
  
  return sendNativeMessage(
    JSON.stringify({
      type: 'message',
      data: { message: 'CloseWebView', data: data.data },
    })
  );
}

export const getDefaultPayload = (): MessagePayload => {
  return {
    userId: "12345",
    mobileCardNo: 'MC123456789',
    physicalCardNo: 'PC987654321',
    paymentSuccess: true,
    paymentResponse: {
      code: '200',
      description: 'Payment processed successfully'
    },
    cardPar: 'CP1234PAR5678'
  };
};

export const messageTemplates = [
  {
    name: 'Default',
    payload: {
      userId: "12345",
      status: "IN_PROGRESS"
    }
  },
  {
    name: 'Payment Success',
    payload: {
      userId: "12345",
      mobileCardNo: 'MC123456789',
      physicalCardNo: 'PC987654321',
      paymentSuccess: true,
      paymentResponse: {
        code: '200',
        description: 'Payment processed successfully'
      },
      cardPar: 'CP1234PAR5678'
    }
  },
  {
    name: 'Payment Failure',
    payload: {
      userId: "12345",
      mobileCardNo: 'MC123456789',
      physicalCardNo: 'PC987654321',
      paymentSuccess: false,
      paymentResponse: {
        code: '400',
        description: 'Payment processing failed'
      },
      cardPar: 'CP1234PAR5678'
    }
  },
  {
    name: 'User Data Only',
    payload: {
      userId: "12345",
      mobileCardNo: 'MC123456789',
      physicalCardNo: 'PC987654321'
    }
  },
  {
    name: 'QR Scan Result',
    payload: {
      userId: "12345",
      scanResult: "https://example.com/qr-content",
      scanType: "qr_code",
      source: "camera",
      timestamp: new Date().toISOString()
    }
  },
  {
    name: 'Barcode Scan Result',
    payload: {
      userId: "12345",
      scanResult: "1234567890123",
      scanType: "barcode",
      source: "camera",
      timestamp: new Date().toISOString()
    }
  }
];