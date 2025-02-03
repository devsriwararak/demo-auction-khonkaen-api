<<<<<<< HEAD
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
=======
import dotenv from "dotenv";
import http from "http";
import app from "./src/app.js";
import setupSocket from "./src/socket.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

// สร้าง HTTP Server
const server = http.createServer(app);
// app.set("server", server); // เก็บเซิร์ฟเวอร์ไว้ใน Express app
setupSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
>>>>>>> cd9e817317f80d1d7d35d8dd117121576314e6af
});