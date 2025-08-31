const WebSocket = require("ws");

console.log("Testing WebSocket connection...");

const ws = new WebSocket("ws://localhost:8000");

ws.on("open", function open() {
  console.log("✅ WebSocket connected!");

  // Subscribe to a sector
  ws.send(
    JSON.stringify({
      type: "subscribe",
      sectorId:
        "13532690412221892442649023045766421456802536612955832571812608743959095510025",
    })
  );
});

ws.on("message", function message(data) {
  const msg = JSON.parse(data);
  console.log("📨 Received:", msg);

  if (msg.type === "subscribed") {
    console.log("✅ Successfully subscribed to sector!");
    setTimeout(() => {
      ws.close();
      process.exit(0);
    }, 2000);
  }
});

ws.on("error", function error(err) {
  console.error("❌ WebSocket error:", err.message);
  process.exit(1);
});

ws.on("close", function close() {
  console.log("🔌 WebSocket disconnected");
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log("⏰ Test timeout - connection failed");
  ws.close();
  process.exit(1);
}, 10000);
