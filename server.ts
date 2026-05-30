import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load environment variables from .env file for local development
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Debug middleware to log requests in AI Studio console
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // Health check route
  app.get("/api/health", (req, res) => {
    res.json({ 
        status: "ok", 
        env: {
            botToken: process.env.TELEGRAM_BOT_TOKEN ? "SET" : "MISSING",
            chatId: process.env.TELEGRAM_CHAT_ID ? "SET" : "MISSING"
        }
    });
  });

  // API route for Telegram Inquiry
  app.post("/api/inquiry", async (req, res) => {
    // Explicitly set JSON content type
    res.setHeader('Content-Type', 'application/json');

    try {
      const { name, phone, cart, totalItems } = req.body;
      
      const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
      const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

      console.log(`[DEBUG] Attempting Telegram send. TOKEN_LEN: ${botToken?.length || 0}, CHAT_ID: ${chatId}`);

      if (!botToken || !chatId) {
        console.error("[ERROR] Missing Telegram Credentials. Make sure TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are set.");
        return res.json({ 
          success: false, 
          message: "تنظیمات تلگرام (TOKEN یا CHAT_ID) یافت نشد.\n\nراهنما:\n۱. اگر از گیت‌هاب استفاده می‌کنید، فایل .env.example را به .env تغییر نام داده و توکن‌ها را در آن قرار دهید.\n۲. اگر در هاست هستید، این مقادیر را در قسمت Environment Variables تعریف کنید.\n۳. سرور را ریستارت کنید." 
        });
      }

      // Format the message
      let message = `🆕 *استعلام قیمت جدید*\n\n`;
      message += `👤 نام: ${name}\n`;
      message += `📞 تماس: ${phone}\n`;
      message += `📦 تعداد اقلام: ${totalItems}\n\n`;
      message += `*لیست کالاها:*\n`;
      
      cart.forEach((item: any, index: number) => {
        const unitLabel = item.unit === 'branch' ? 'شاخه' : 'عدد';
        message += `${index + 1}. ${item.name}: ${item.quantity} ${unitLabel}\n`;
      });

      console.log(`Sending inquiry to Telegram for: ${name}`);
      const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const response = await fetch(telegramUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "Markdown"
        })
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse Telegram response:", responseText);
        return res.json({ success: false, message: "پاسخ نامعتبر از تلگرام." });
      }
      
      if (!data.ok) {
        console.error("Telegram API response not OK:", data);
        let errorMsg = `خطای تلگرام: ${data.description || "نامشخص"}`;
        if (data.description?.includes("Unauthorized")) errorMsg = "توکن تلگرام (TOKEN) معتبر نیست.";
        if (data.description?.includes("chat not found")) errorMsg = "شناسه چت (CHAT_ID) معتبر نیست یا ربات در آن عضو نیست.";
        
        return res.json({ 
          success: false, 
          message: errorMsg 
        });
      }

      console.log("Inquiry sent successfully to Telegram.");
      return res.json({ success: true });
    } catch (error: any) {
      console.error("Critical error in /api/inquiry:", error);
      return res.json({ 
        success: false, 
        message: `خطای سرور: ${error.message || "نامشخص"}` 
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
