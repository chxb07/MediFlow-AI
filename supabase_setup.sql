-- CLEAN SLATE: Run this to reset the schema correctly
DROP TABLE IF EXISTS public.ai_analysis CASCADE;
DROP TABLE IF EXISTS public.prescriptions CASCADE;
DROP TABLE IF EXISTS public.lab_tests CASCADE;
DROP TABLE IF EXISTS public.radiology_reports CASCADE;
DROP TABLE IF EXISTS public.consultations CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 1. PROFILES (Extends auth.users)
CREATE TABLE public.profiles (
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

-- 2. CONSULTATIONS
CREATE TABLE public.consultations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid REFERENCES public.profiles(id) NOT NULL,
  doctor_id uuid REFERENCES public.profiles(id), -- Assigned doctor
  symptoms text[] NOT NULL, -- Array of strings
  duration text,
  status text CHECK (status IN ('new', 'pending', 'review', 'urgent', 'completed')) DEFAULT 'new',
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients can insert consultations." ON public.consultations FOR INSERT WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "Users can view relevant consultations." ON public.consultations FOR SELECT USING (
  auth.uid() = patient_id OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'doctor')
);

-- 3. AI ANALYSIS
CREATE TABLE public.ai_analysis (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  consultation_id uuid REFERENCES public.consultations(id) ON DELETE CASCADE,
  possible_conditions jsonb,
  missing_information text[],
  recommended_next_steps text[],
  risk_level text,
  notes_for_doctor text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.ai_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Doctors can manage AI analysis." ON public.ai_analysis FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'doctor')
);

-- 4. PRESCRIPTIONS
CREATE TABLE public.prescriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  consultation_id uuid REFERENCES public.consultations(id) ON DELETE CASCADE,
  medications text[],
  instructions text,
  created_at timestamp with time zone DEFAULT now()
);

-- 5. TRIGGER FOR NEW USERS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'patient')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
