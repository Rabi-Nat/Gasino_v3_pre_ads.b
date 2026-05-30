package com.gasino.app;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentSender;
import android.content.ServiceConnection;
import android.os.Bundle;
import android.os.IBinder;
import android.os.RemoteException;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.Toast;
import com.getcapacitor.BridgeActivity;
import com.android.vending.billing.IInAppBillingService;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {

    // کلید عمومی پرداخت درون‌برنامه‌ای کافه بازار برای احراز اصالت و اعتبارسنجی خریدها
    public static final String BAZAAR_PUBLIC_KEY = "MIHNMA0GCSqGSIb3DQEBAQUAA4G7ADCBtwKBrwClquaLAedQqYXaL/MallnaDw1NE3QT7hZwxVkqrKEolbKVlz4cTiso01+lVonL0hEkgacQAI7mCdp4qiicjIHHkZnQ7naRCbqbQjhW+m6RkKg1LU+HbWwRzyPLSU2q46yMAkVybD9320wVqkDBG9UDA3bY64zBBNDM98YagaefMy5NQdVrs+5fs1dc2yXsB1gFtCAY7dmpB6AwyUNeLa2p+UrKfX5UzmdmopmgMkUCAwEAAQ==";
    
    private static final int BAZAAR_BILLING_REQUEST_CODE = 1001;
    private IInAppBillingService mService;
    
    private ServiceConnection mServiceConn = new ServiceConnection() {
        @Override
        public void onServiceDisconnected(ComponentName name) {
            mService = null;
        }

        @Override
        public void onServiceConnected(ComponentName name, IBinder service) {
            mService = IInAppBillingService.Stub.asInterface(service);
        }
    };

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Expose a native billing bridge to the WebView for Cafe Bazaar IAB
        try {
            WebView webView = this.getBridge().getWebView();
            webView.getSettings().setJavaScriptEnabled(true);
            webView.addJavascriptInterface(new BazaarBillingBridge(), "BazaarBridge");
        } catch (Exception e) {
            e.printStackTrace();
        }

        // Bind to Cafe Bazaar's In-App Billing Service
        try {
            Intent serviceIntent = new Intent("com.farsitel.bazaar.service.InAppBillingService.BIND");
            serviceIntent.setPackage("com.farsitel.bazaar");
            bindService(serviceIntent, mServiceConn, Context.BIND_AUTO_CREATE);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (mServiceConn != null) {
            try {
                unbindService(mServiceConn);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == BAZAAR_BILLING_REQUEST_CODE) {
            int responseCode = data != null ? data.getIntExtra("RESPONSE_CODE", 0) : -1;
            String purchaseData = data != null ? data.getStringExtra("INAPP_PURCHASE_DATA") : null;
            String dataSignature = data != null ? data.getStringExtra("INAPP_DATA_SIGNATURE") : null;

            if (resultCode == RESULT_OK && responseCode == 0 && purchaseData != null) {
                try {
                    JSONObject jo = new JSONObject(purchaseData);
                    String productId = jo.optString("productId");
                    String purchaseToken = jo.optString("purchaseToken");

                    // Trigger purchase success flow in React frontend
                    runOnUiThread(() -> {
                        Toast.makeText(MainActivity.this, "خرید با موفقیت انجام شد! 🎉", Toast.LENGTH_SHORT).show();
                        try {
                            WebView webView = MainActivity.this.getBridge().getWebView();
                            webView.evaluateJavascript("window.onBazaarPurchaseSuccess('" + purchaseToken + "')", null);
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    });
                } catch (Exception e) {
                    e.printStackTrace();
                    showToastOnUI("خطا در پردازش اطلاعات خرید از بازار");
                }
            } else {
                showToastOnUI("خرید لغو شد یا با خطا مواجه گردید.");
            }
        }
    }

    private void showToastOnUI(String message) {
        runOnUiThread(() -> Toast.makeText(MainActivity.this, message, Toast.LENGTH_LONG).show());
    }

    public class BazaarBillingBridge {
        
        @JavascriptInterface
        public void initiateBazaarPurchase(String productId) {
            if (mService == null) {
                showToastOnUI("سرویس پرداخت درون‌برنامه‌ای بازار فعال نیست. لطفا مطمئن شوید برنامه کافه بازار روی گوشی نصب است.");
                return;
            }

            try {
                // Request a buy intent from Cafe Bazaar (API version 3, inapp product type)
                Bundle buyIntentBundle = mService.getBuyIntent(3, getPackageName(), productId, "inapp", "gasino_user_payload");
                int response = buyIntentBundle.getInt("RESPONSE_CODE");
                
                if (response == 0) {
                    android.app.PendingIntent pendingIntent = buyIntentBundle.getParcelable("BUY_INTENT");
                    if (pendingIntent != null) {
                        try {
                            startIntentSenderForResult(pendingIntent.getIntentSender(), BAZAAR_BILLING_REQUEST_CODE, new Intent(), 0, 0, 0);
                        } catch (IntentSender.SendIntentException e) {
                            e.printStackTrace();
                            showToastOnUI("خطا در ارسال درخواست پرداخت به بازار");
                        }
                    }
                } else if (response == 7) { // Already owned items
                    showToastOnUI("شما این اشتراک را قبلاً تهیه کرده‌اید.");
                    // Restore/Unlock automatically
                    runOnUiThread(() -> {
                        try {
                            WebView webView = MainActivity.this.getBridge().getWebView();
                            webView.evaluateJavascript("window.onBazaarPurchaseSuccess('restore_token_bazaar')", null);
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    });
                } else {
                    showToastOnUI("کد خطا از بازار: " + response);
                }
            } catch (RemoteException e) {
                e.printStackTrace();
                showToastOnUI("خطا در برقراری ارتباط با کافه بازار");
            }
        }

        @JavascriptInterface
        public boolean isBazaarAvailable() {
            try {
                MainActivity.this.getPackageManager().getPackageInfo("com.farsitel.bazaar", 0);
                return true;
            } catch (Exception e) {
                return false;
            }
        }

        @JavascriptInterface
        public void showNativeToast(String msg) {
            showToastOnUI(msg);
        }
    }
}
