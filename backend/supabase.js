import { createClient } from "https://esm.sh/@supabase/supabase-js";

const supabaseUrl = "https://nnzplqorqgviuvuucvnf.supabase.co";

const supabaseKey = "sb_publishable_VdO9PpoViXRSbp_CrwPrzw_g0ycBfvP";

export const supabase = createClient(supabaseUrl, supabaseKey);