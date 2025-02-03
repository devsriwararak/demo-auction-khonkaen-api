import dotenv from "dotenv";
import http from "http";
import app from "./src/app.js";
import setupSocket from "./src/socket.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

// สร้าง HTTP Server
const server = http.createServer(app);
setupSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);

});