# MediFlow AI - Advanced Medical Assistant

MediFlow AI is a production-ready clinical dashboard system integrated with Supabase and Groq AI (Llama 3.3). It automates the entire clinical workflow from patient registration to doctor diagnostics, lab/radiology fulfillment, and pharmacist delivery.

## 🚀 Key Features

- **Doctor Dashboard**: AI-powered diagnostics using Groq, real-time patient history, and clinical ordering.
- **AI Document Analysis**: Automated text extraction and summarization for PDF/Word lab reports.
- **Role-Based Access**: Specialized dashboards for Doctors, Pharmacists, Lab Technicians, and Radiology.
- **Multilingual UI**: Full support for English, French, and Arabic (RTL).

## 🛠️ Setup Instructions

### 1. Supabase Configuration
1. Create a new project at [supabase.com](https://supabase.com).
2. Run the code in `supabase_schema.sql` (in the root) inside your **Supabase SQL Editor**.
3. **Storage**: Go to the Storage tab and create a **Public** bucket named `medical-results`.

### 2. Environment Variables
Create a `.env` file in the root and add your keys:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GROQ_API_KEY=your_groq_api_key
```

### 3. Installation
```bash
npm install
npm run dev
```

## 🏗️ Clinical Roles
When signing up, use metadata to define roles or manually update the `profiles` table:
- `doctor`: Clinical analysis and prescriptions.
- `lab`: Laboratory test fulfillment + AI Doc Sync.
- `radiology`: Imaging reports + AI Doc Sync.
- `pharmacist`: Medication dispensing.
- `patient`: Symptom submission and history viewing.

## 📄 AI Model
Powered by **Groq: llama-3.3-70b-versatile** for high-precision clinical considerations.
