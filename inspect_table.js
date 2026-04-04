
const { createClient } = require("@supabase/supabase-js");

// Credentials from supabase.js
const supabaseUrl = "https://meiljgoztnhnyvtfkzuh.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1laWxqZ296dG5obnl2dGZrenVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMTI0OTksImV4cCI6MjA4MDY4ODQ5OX0.X7zve3MSvaoplAHl45BpC57h9G4IY5suhBBteIoEU3I";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectAdsTable() {
    console.log("Fetching ads table structure...");

    // Try to insert a dummy record to trigger a response that might contain schema info, 
    // or just fetch one.
    const { data, error } = await supabase
        .from("express_ads")
        .select("*")
        .limit(1);

    if (error) {
        console.error("Error fetching table info:", error);
        return;
    }

    if (data && data.length > 0) {
        console.log("Table Columns Object Keys:", Object.keys(data[0]));
        console.log("Sample Row:", data[0]);
    } else {
        console.log("Table is empty. Attempting to get info via options if possible (not supported directly in client).");
        console.log("Assuming columns based on codebase usage:");
        console.log("- id");
        console.log("- title");
        console.log("- description");
        console.log("- image_url");
        console.log("- style");
        console.log("- placement");
        console.log("- [various styling columns]");
    }
}

inspectAdsTable();
