import axios from "axios";

// Use environment variable or fallback to localhost for development
const BASE_URL = import.meta.env.VITE_API_BASE || "http://localhost:8080";

export const sendMessage = async (message:string) => {
    try {
        const {data} = await axios.post(`${BASE_URL}/message`, {message});
        return data; // expect { reply: string } from FastAPI
    } catch (error: any) {
        console.error("API Error:", error);
        return { reply: "Error: Could not connect to API"};
    }
};