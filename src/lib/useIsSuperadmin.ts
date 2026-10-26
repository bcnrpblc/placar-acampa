import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/** True when the signed-in user is the superadmin (server-checked). */
export const useIsSuperadmin = () => {
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  useEffect(() => {
    supabase.rpc('is_superadmin').then(({ data }) => setIsSuperadmin(data === true));
  }, []);
  return isSuperadmin;
};
