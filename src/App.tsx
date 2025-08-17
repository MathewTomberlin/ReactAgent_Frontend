import { useState } from 'react'
import { useAppContext } from './context/AppContext'
import './App.css'

function App() {
  const {messages, sendToAgent} = useAppContext();
  const [input, setInput] = useState('');
  
  const handleSubmit = async () => {
    if(input.trim() !== ""){
      await sendToAgent(input);
      setInput('');
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-3xl font-bold mb-4">Agentic AI Frontend</h1>

      <div className="w-full max-w-md mb-4">
        <input
          className="w-full p-2 border rounded"
          value={input}
          onChange={e=>setInput(e.target.value)}
          placeholder="Type a message..."
        />
        <button
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
          onClick={handleSubmit}
        >
          Send
        </button>
      </div>

      <div className="w-full max-w-md bg-white p-4 rounded shadow">
        <h2 className="font-semibold mb-2">Messages:</h2>
        <ul>
          {messages.map((msg,idx)=>(
            <li
              key={idx} 
              className={`py-1 ${
                msg.sender === "user" ? "text-right font-semibold" : "text-left"
              }`}
            >{msg.text}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App
