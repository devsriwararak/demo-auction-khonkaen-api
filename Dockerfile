# ใช้ Node.js เวอร์ชันล่าสุด
FROM node:18

# ตั้งค่าทำงานภายใน /app
WORKDIR /app

# คัดลอกไฟล์ package.json และติดตั้ง dependencies
COPY package.json ./
RUN npm install --production
RUN npm rebuild bcrypt --build-from-source

# คัดลอกไฟล์ทั้งหมดเข้า container
COPY . .

# กำหนดให้รันเซิร์ฟเวอร์ Node.js (Express)
CMD ["npm", "start"]