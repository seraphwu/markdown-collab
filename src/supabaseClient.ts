import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('請確認 .env 檔案中已設定 Supabase 的 URL 與 Key');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);