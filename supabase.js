import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Fill in Supabase project credentials directly; no environment variables are used.
const supabaseUrl = "https://meiljgoztnhnyvtfkzuh.supabase.co"; // e.g., https://xyzcompany.supabase.co
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1laWxqZ296dG5obnl2dGZrenVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMTI0OTksImV4cCI6MjA4MDY4ODQ5OX0.X7zve3MSvaoplAHl45BpC57h9G4IY5suhBBteIoEU3I"; // anon public key

export const supabase =
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.startsWith("REPLACE_WITH") &&
  !supabaseAnonKey.startsWith("REPLACE_WITH")
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          // On web use the browser's built-in localStorage adapter so session
          // state is read synchronously and INITIAL_SESSION fires instantly.
          // On iOS/Android use AsyncStorage (the RN-safe async adapter).
          storage: Platform.OS === "web" ? undefined : AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          // On web, parse the session token from the URL hash after OAuth
          // redirects. On native, deep-link handling is done separately and
          // URL detection is not needed (and can cause issues).
          detectSessionInUrl: Platform.OS === "web",
        },
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      })
    : null;

// Edge function helper
export const invokeEdgeFunction = async (functionName, body) => {
  if (!supabase) throw new Error("Supabase not initialized");
  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
  });
  if (error) throw error;
  return data;
};
