// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// If you are using Vite, use import.meta.env
// If not, you can hardcode the strings for now to test
const supabaseUrl: string = 'https://rhxyomfmcgkwzzoqspbl.supabase.co';
const supabaseKey: string = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoeHlvbWZtY2drd3p6b3FzcGJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NDMyNjIsImV4cCI6MjA4NTExOTI2Mn0.DCSY4UY3wkwDxXEaE736EwuFXW8dhyqeBxZ2g55ORRE';

export const supabase = createClient(supabaseUrl, supabaseKey);