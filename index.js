const {
  useMultiFileAuthState,
  DisconnectReason,
  makeWASocket,
  downloadMediaMessage,
} = require("@whiskeysockets/baileys");
const { writeFile } = require("fs/promises");

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    markOnlineOnConnect: false,
    syncFullHistory: false,
  });

  sock.ev.process(async (ev) => {
    if (ev["creds.update"]) {
      await saveCreds();
    }

    if (ev["connection.update"]) {
      const { connection, lastDisconnect } = ev["connection.update"];
      if (connection === "open") {
        console.log("opened connection");
      } else if (connection === "close") {
        const shouldReconnect =
          lastDisconnect.error?.output?.statusCode !==
          DisconnectReason.loggedOut;
        console.log(
          "connection closed due to",
          lastDisconnect.error,
          ", reconnecting",
          shouldReconnect
        );
        if (shouldReconnect) {
          connectToWhatsApp();
        }
      }
    }

    if (ev["messages.upsert"]) {
      const message = ev["messages.upsert"].messages[0];
      if (message.message.audioMessage) {
        downloadMediaMessage(message, "buffer", {}).then((buffer) => {
          writeFile("./audio.oga", buffer);
        });
      }
    }
  });
}

(async () => {
  connectToWhatsApp();
})();
