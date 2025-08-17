import {createContext, useContext, useState} from 'react';
import type {ReactNode} from 'react';
import { sendMessage } from '../api/FastAPIClient';

interface Message {
    sender: 'user' | 'agent';
    text: string;
}

interface AppState {
    messages: Message[];
    isLoading: boolean;
    addUserMessage: (message: string) => void;
    sendToAgent: (text:string) => void;
}

const AppContext = createContext<AppState>({
    messages:[], 
    isLoading: false,
    addUserMessage:()=>{},
    sendToAgent:()=>{},
});

export const AppProvider = ({ children }:{children:ReactNode}) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const addUserMessage = (text:string) => {
        setMessages(prev => [...prev, {sender:"user",text }]);
    };

    const sendToAgent = async (text:string) => {
        addUserMessage(text);
        setIsLoading(true);
        
        try {
            const response = await sendMessage(text);
            setMessages(prev => [...prev, {sender:"agent", text:response.reply}]);
        } catch (error) {
            console.error('Error sending message:', error);
            setMessages(prev => [...prev, {sender:"agent", text:"Sorry, I encountered an error. Please try again."}]);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <AppContext.Provider value={{messages, isLoading, addUserMessage, sendToAgent}}>
            {children}
        </AppContext.Provider>
    );
}

// Custom hook for consuming the context
export const useAppContext = () => useContext(AppContext);