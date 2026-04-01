# 🏥 MediFlow AI - The Future of Clinical Operations

[![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)](https://reactjs.org/)
[![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3EC988?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Groq](https://img.shields.io/badge/Groq-AI-orange?style=for-the-badge)](https://groq.com/)

**MediFlow AI** is a cutting-edge, production-ready clinical ecosystem designed to modernize healthcare workflows. By integrating high-performance AI (Llama 3.3 via Groq) with a robust Supabase backend, it seamlessly connects patients, doctors, labs, and pharmacies in a unified, real-time environment.

---

## ✨ Key Features

### 🩺 Intelligent Diagnostics (Doctor Dashboard)
- **AI-Powered Analysis**: Leverages `llama-3.3-70b-versatile` for clinical insights, differential diagnoses, and risk assessment.
- **Clinical Ordering**: Direct integration for prescribing medications, requesting lab tests, and imaging.
- **Real-time Patient History**: Instant access to previous consultations and results.

### 🧪 Smart Laboratory & Radiology
- **AI Document Sync**: Automated text extraction from uploaded PDF/Word reports using advanced OCR and AI summarization.
- **Direct Fulfillment**: Real-time status updates from the lab/radiology suite back to the doctor.

### 💊 Automated Pharmacy
- **Digital Prescriptions**: Instant notification of new orders for pharmacists.
- **Status Tracking**: One-click dispensing and inventory status updates.

### 🌍 Universal Accessibility
- **Multilingual Support**: Switch seamlessly between **English**, **French**, and **Arabic**.
- **Responsive Design**: Premium, futuristic UI that works perfectly on desktop, tablet, and mobile.
- **Dark Mode First**: Sleek glassmorphism aesthetic optimized for clinical focus.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 18, Vite, TypeScript |
| **Styling** | Tailwind CSS, Framer Motion, Shadcn UI |
| **Database/Auth** | Supabase (PostgreSQL, Row Level Security) |
| **AI Intelligence** | Groq (Llama 3.3 70B Versatile) |
| **State Management** | TanStack Query (React Query) v5 |
| **Forms** | React Hook Form + Zod Validation |

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- A Supabase account
- A Groq API key

### 2. Database Setup
1. Create a new project on [Supabase](https://supabase.com).
2. Open the **SQL Editor** and run the contents of [supabase_schema.sql](file:///c:/Users/QUBIX%20TECH/Desktop/mediflow-ai-ui-main/supabase_schema.sql).
3. **Storage**:
   - Go to the **Storage** tab.
   - Create a **Public** bucket named `medical-results`.
   - The SQL script handles the storage policies, but ensure the bucket name matches exactly.

### 3. Environment Configuration
Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_GROQ_API_KEY=your_groq_api_key
```

### 4. Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

---

## 👥 Clinical Roles & Logic

MediFlow AI uses Role-Based Access Control (RBAC). When a user signs up, their profile is automatically created via a Supabase Trigger.

- **`patient`**: Can submit symptoms and view their own medical history.
- **`doctor`**: Full clinical suite, AI access, and ordering privileges.
- **`lab`**: Access to lab test requests and document upload features.
- **`radiology`**: Access to imaging requests and report generation.
- **`pharmacist`**: Management of medication fulfillment.

---

## 📂 Project Structure

```text
src/
├── components/     # Reusable UI components (Shadcn + Custom)
├── hooks/          # Custom React hooks
├── lib/            # Utility functions (Auth, Supabase, AI)
├── pages/          # Main route components
│   └── dashboards/ # Specialized role-based dashboards
├── types/          # TypeScript definitions
└── App.tsx         # Main application & routing
```

---

## 📝 License

This project is open-source. Built with ❤️ for the future of healthcare.
