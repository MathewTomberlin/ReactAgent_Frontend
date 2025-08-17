import {createContext, useContext, useState} from 'react';
import type {ReactNode} from 'react';
import { sendMessage } from '../api/FastAPIClient';

interface Message {
    sender: 'user' | 'agent';
    text: string;
}

interface AppState {
    messages: Message[];
    addUserMessage: (message: string) => void;
    sendToAgent: (text:string) => void;
}

const AppContext = createContext<AppState>({
    messages:[], 
    addUserMessage:()=>{},
    sendToAgent:()=>{},
});

export const AppProvider = ({ children }:{children:ReactNode}) => {
    const [messages, setMessages] = useState<Message[]>([]);

    const addUserMessage = (text:string) => {
        setMessages(prev => [...prev, {sender:"user",text }]);
    };

    const sendToAgent = async (text:string) => {
        addUserMessage(text);
        const response = await sendMessage(text);
        setMessages(prev => [...prev, {sender:"agent", text:response.reply}]);
    }

    return (
        <AppContext.Provider value={{messages, addUserMessage, sendToAgent}}>
            {children}
        </AppContext.Provider>
    );
}

// Custom hook for consuming the context
export const useAppContext = () => useContext(AppContext);