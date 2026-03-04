// config.js - Configurações do Supabase

const SUPABASE_URL = "https://eyvdyhpdahkplapltaut.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5dmR5aHBkYWhrcGxhcGx0YXV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMzQxNTMsImV4cCI6MjA4NzYxMDE1M30.4bQ0J65OdXlpSn85uH07fLGPZCwGbTo1-WoltBLrS5Q";

// Expõe para uso global
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

console.log('✅ Config carregado');
console.log('🔗 URL:', SUPABASE_URL);
console.log('🔑 Key:', SUPABASE_ANON_KEY ? 'Configurada ✅' : '❌ VAZIA!');