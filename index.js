const express = require('express');
const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const qrcode = require('qrcode');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;
app.use(express.static('public'));

app.get("/", (_, res) => res.sendFile(__dirname + "/public/pair.html"));

let qrCodeSVG = ""; // Store QR SVG

app.get("/qr", (req, res) => {
  res.setHeader("Content-Type", "image/svg+xml");
  res.send(qrCodeSVG || "<h2>No QR yet</h2>");
});

const startSock = async () => {
  const { state, saveCreds } = await useMultiFileAuthState("auth");

  const sock = makeWASocket({
    auth: state,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { qr, connection } = update;
    if (qr) {
      qrCodeSVG = await qrcode.toString(qr, { type: "svg" });
    }
    if (connection === "open") {
      console.log("✅ Bot connected");
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const m = messages[0];
    if (!m.message || m.key.fromMe) return;
    const text = m.message.conversation || m.message.extendedTextMessage?.text;
    if (text === ".alive") {
      await sock.sendMessage(m.key.remoteJid, { text: "✅ Bot is alive!" });
    }
  });
};

startSock();
app.listen(port, () => console.log("Bot server running on", port));
