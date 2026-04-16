import Constants from 'expo-constants';

/**
 * ⚠️ NETWORK CONFIGURATION:
 * Since you are using Expo on Android/iOS, you cannot use 'localhost'.
 * You must use the local IP address of your machine running the FastAPI backend.
 * 
 * To find your IP:
 * - Windows: ipconfig
 * - Mac/Linux: hostname -I or ifconfig
 */

const LOCAL_HOST_IP = '192.168.28.94'; // Updated based on your session

export const CONFIG = {
    API_URL: `http://${LOCAL_HOST_IP}:8000`,
    SUPABASE_URL: 'https://vminkxvmxnhgcooegwue.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtaW5reHZteG5oZ2Nvb2Vnd3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzk4MzksImV4cCI6MjA5MTg1NTgzOX0.RthKfiRkGCbOhGWHXWlvrEg6r052qoNJLeowwVxfwic',
};
