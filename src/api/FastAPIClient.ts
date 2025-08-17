import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE; // from .env.[mode] files

export const sendMessage = async (message:string) => {
    try {
        const {data} = await axios.post(`${BASE_URL}/message`, {message});
        return data; // expect { reply: string } from FastAPI
    } catch (error: any) {
        console.error("API Error:", error);
        return { reply: "Error: Could not connect to API"};
    }
};