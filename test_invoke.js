const url = "https://upcrgniezskogefcvaew.supabase.co/functions/v1/weekly-report";
// Legacy Anon Key
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwY3JnbmllenNrb2dlZmN2YWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyMDc0MTYsImV4cCI6MjA4NDc4MzQxNn0.VxGE6RxHJo5GCn4oanMesPPNN6P6jLGGU-eQS7ayPbA";

(async () => {
    console.log("Invoking:", url);
    try {
        const resp = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${key}`,
                "Content-Type": "application/json"
            }
        });
        console.log("Status:", resp.status);
        const text = await resp.text();
        console.log("Body:", text);
    } catch (e) {
        console.error("Error:", e);
    }
})();
