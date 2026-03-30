-- MediFlow AI - Full Database Schema
-- Run this in your Supabase SQL Editor

-- 1. CLEAN SLATE (Optional: Uncomment to reset everything)
-- DROP TABLE IF EXISTS public.ai_analysis CASCADE;
-- DROP TABLE IF EXISTS public.prescriptions CASCADE;
-- DROP TABLE IF EXISTS public.lab_tests CASCADE;
-- DROP TABLE IF EXISTS public.radiology_reports CASCADE;
-- DROP TABLE IF EXISTS public.consultations CASCADE;
-- DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. PROFILES (Extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  updated_at timestamp with time zone DEFAULT now(),
  full_name text,
  email text,
  age int DEFAULT 30,
  role text CHECK (role IN ('patient', 'doctor', 'pharmacist', 'lab', 'radiology')) DEFAULT 'patient'
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 3. CONSULTATIONS
CREATE TABLE IF NOT EXISTS public.consultations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid REFERENCES public.profiles(id) NOT NULL,
  doctor_id uuid REFERENCES public.profiles(id),
  symptoms text[] NOT NULL,
  duration text,
  status text CHECK (status IN ('new', 'pending', 'review', 'urgent', 'completed')) DEFAULT 'new',
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients can insert consultations." ON public.consultations FOR INSERT WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "Users can view relevant consultations." ON public.consultations FOR SELECT USING (
  auth.uid() = patient_id OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('doctor', 'pharmacist', 'lab', 'radiology')
  )
);
CREATE POLICY "Doctors can delete consultations." ON public.consultations FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'doctor')
);
CREATE POLICY "Doctors can update consultations." ON public.consultations FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'doctor')
);

-- 4. AI ANALYSIS
CREATE TABLE IF NOT EXISTS public.ai_analysis (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  consultation_id uuid REFERENCES public.consultations(id) ON DELETE CASCADE,
  possible_conditions jsonb,
  missing_information text[],
  recommended_next_steps text[],
  risk_level text,
  notes_for_doctor text,
  clinical_findings_summary text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.ai_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Doctors can manage AI analysis." ON public.ai_analysis FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'doctor')
);

-- 5. PRESCRIPTIONS
CREATE TABLE IF NOT EXISTS public.prescriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  consultation_id uuid REFERENCES public.consultations(id) ON DELETE CASCADE,
  medications text[],
  instructions text,
  status text CHECK (status IN ('pending', 'delivered')) DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view prescriptions." ON public.prescriptions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('doctor', 'pharmacist'))
);
CREATE POLICY "Patients can view own prescriptions." ON public.prescriptions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.consultations WHERE id = consultation_id AND patient_id = auth.uid())
);
CREATE POLICY "Doctors can insert prescriptions." ON public.prescriptions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'doctor')
);
CREATE POLICY "Pharmacists can update prescription status." ON public.prescriptions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'pharmacist')
);

-- 6. LAB TESTS
CREATE TABLE IF NOT EXISTS public.lab_tests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  consultation_id uuid REFERENCES public.consultations(id) ON DELETE CASCADE,
  test_name text NOT NULL,
  clinical_indication text,
  status text DEFAULT 'pending',
  result_notes text,
  document_url text,
  extracted_text text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.lab_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view lab tests." ON public.lab_tests FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('doctor', 'lab'))
);
CREATE POLICY "Lab technicians can update status." ON public.lab_tests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'lab')
);

-- 7. RADIOLOGY REPORTS
CREATE TABLE IF NOT EXISTS public.radiology_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  consultation_id uuid REFERENCES public.consultations(id) ON DELETE CASCADE,
  request_type text NOT NULL,
  body_part text,
  imaging_type text,
  clinical_indication text,
  status text DEFAULT 'pending',
  findings text,
  document_url text,
  extracted_text text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.radiology_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view radiology." ON public.radiology_reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('doctor', 'radiology'))
);
CREATE POLICY "Radiology technicians can update status." ON public.radiology_reports FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'radiology')
);

-- 8. AUTH TRIGGER (Automatically creates profile on signup)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, age)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'patient'),
    COALESCE((new.raw_user_meta_data->>'age')::int, 30)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 9. STORAGE SETUP (Optional: Bucket creation via SQL might require dashboard steps)
-- Note: Manually create 'medical-results' bucket in Supabase Dashboard and set to Public.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('medical-results', 'medical-results', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'medical-results');
CREATE POLICY "Public View" ON storage.objects FOR SELECT USING (bucket_id = 'medical-results');
