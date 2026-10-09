# 🏆 Pujo Media — Full-Stack Festival Competition & AI Scoring Engine

[![Node.js](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%20%7C%20Prisma-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.prisma.io/)
[![Python](https://img.shields.io/badge/AI%20Service-FastAPI%20%7C%20PyTorch-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org/)
[![AWS S3](https://img.shields.io/badge/Storage-AWS%20S3-FF9900?style=for-the-badge&logo=amazon-s3&logoColor=white)](https://aws.amazon.com/s3/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

**Pujo Media** is a production full-stack competition management and media voting platform for Kolkata Durga Puja festivals. It pairs an enterprise **Node.js/Prisma backend** with an automated **Python AI computer vision scoring microservice** (`ai-scoring/`) to evaluate pandal aesthetics, idol craftsmanship, lighting installations, and crowd management.

---

## 🛠️ Microservice Architecture

```
+-------------------------------------------------------------+
|                    Client Web & Mobile Apps                 |
+-------------------------------------------------------------+
                              |
                              v  REST API
+-------------------------------------------------------------+
|                 Node.js / Express Backend                   |
|     - PostgreSQL with Prisma ORM (`@prisma/client`)         |
|     - Media uploads to AWS S3 (`@aws-sdk/client-s3`)        |
|     - Authentication via Firebase Admin SDK                 |
|     - Rate limiting, Helmet security headers, Postman suite |
+-------------------------------------------------------------+
                              |
                              v  Internal RPC / HTTP
+-------------------------------------------------------------+
|             Python AI Scoring Service (`ai-scoring/`)       |
|     - Computer Vision model scoring aesthetic quality       |
|     - Evaluates lighting contrast & crowd safety            |
|     - Containerized via Dockerfile                          |
+-------------------------------------------------------------+
```

---

## 📁 Repository Layout

```text
Pujo_media/
├── backend/                  # Express REST API, Prisma schemas, S3 controllers
├── ai-scoring/               # Python AI vision scoring microservice & Dockerfile
├── Pujomedia_API_Collection  # Complete Postman API testing suite
├── DATABASE_CLEANUP_GUIDE.md # Database maintenance and migration protocol
├── DEPLOYMENT.md             # Production cloud deployment guide
├── SETUP.md                  # Development environment setup
├── LICENSE                   # MIT License
└── README.md
```

---

## 🚀 Getting Started

### 1. Setup Backend
```bash
cd backend
npm install
npx prisma migrate dev
npm start
```

### 2. Setup AI Scoring Microservice
```bash
cd ai-scoring
pip install -r requirements.txt
python main.py
```

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
