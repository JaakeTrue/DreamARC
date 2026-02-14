// src/components/GameChanger.jsx
import React, { useState, useRef, useEffect } from 'react';
import './GameChanger.css';

const GameChanger = () => {
    const [messages, setMessages] = useState([
        { 
            id: 1, 
            text: "Hello! I'm your GameChanger AI Tutor. I'm here to help you with any subject you're studying. What would you like to learn today?", 
            isUser: false, 
            time: "2:30 PM" 
        },
        { 
            id: 2, 
            text: "Can you help me understand quadratic equations?", 
            isUser: true, 
            time: "2:31 PM" 
        },
        { 
            id: 3, 
            text: "Absolutely! Quadratic equations are equations of the form ax² + bx + c = 0. They can be solved using factoring, completing the square, or the quadratic formula. Would you like me to explain one of these methods in detail?", 
            isUser: false, 
            time: "2:31 PM" 
        }
    ]);
    const [inputMessage, setInputMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const chatMessagesRef = useRef(null);

    const subjects = [
        { id: 1, name: "Mathematics", icon: "fas fa-calculator" },
        { id: 2, name: "Science", icon: "fas fa-flask" },
        { id: 3, name: "English", icon: "fas fa-language" },
        { id: 4, name: "History", icon: "fas fa-globe-americas" },
        { id: 5, name: "Programming", icon: "fas fa-code" },
        { id: 6, name: "Arts", icon: "fas fa-music" }
    ];

    const addMessage = (text, isUser) => {
        const newMessage = {
            id: messages.length + 1,
            text,
            isUser,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, newMessage]);
        return newMessage;
    };

    const simulateAIResponse = (userMessage) => {
        setIsTyping(true);
        
        setTimeout(() => {
            const responses = [
                "I'd be happy to help with that! Could you provide more details about what specifically you're struggling with?",
                "That's an excellent question. Let me break it down for you in simpler terms.",
                "I understand your question. Here's a step-by-step explanation to help clarify this concept.",
                "Great question! This is a common topic that many students find challenging. Let me explain it clearly.",
                "I can help with that! First, let's make sure we're on the same page about the fundamentals."
            ];
            
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            addMessage(randomResponse, false);
            setIsTyping(false);
        }, 2000);
    };

    const handleSendMessage = () => {
        if (inputMessage.trim()) {
            addMessage(inputMessage, true);
            setInputMessage('');
            simulateAIResponse(inputMessage);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    };

    useEffect(() => {
        if (chatMessagesRef.current) {
            chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    return (
        <div className="gamechanger-container">
            <div className="dashboard">
                <div className="left-panel">
                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">Your Progress</h2>
                            <i className="fas fa-chart-line"></i>
                        </div>
                        <div className="stats">
                            <div className="stat-card">
                                <div className="stat-value">12</div>
                                <div className="stat-label">Sessions Completed</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value">87%</div>
                                <div className="stat-label">Mastery Level</div>
                            </div>
                        </div>
                        <div className="progress-container">
                            <div className="progress-bar">
                                <div className="progress"></div>
                            </div>
                            <div className="progress-text">
                                <span>Current Progress</span>
                                <span>75%</span>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">Subjects</h2>
                            <i className="fas fa-book-open"></i>
                        </div>
                        <div className="subjects">
                            {subjects.map(subject => (
                                <div key={subject.id} className="subject">
                                    <i className={subject.icon}></i>
                                    <div>{subject.name}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="api-status">
                        <i className="fas fa-check-circle"></i>
                        API Status: Connected to /api/learning/tutor-request
                    </div>
                </div>

                <div className="right-panel">
                    <div className="card">
                        <div className="chat-container">
                            <div className="chat-header">
                                <i className="fas fa-robot"></i>
                                <div>
                                    <h2>GameChanger AI Tutor</h2>
                                    <div className="status-indicator">
                                        <div className="status-dot"></div>
                                        <span>Online - Ready to help</span>
                                    </div>
                                </div>
                            </div>
                            <div className="chat-messages" ref={chatMessagesRef}>
                                {messages.map(message => (
                                    <div 
                                        key={message.id} 
                                        className={`message ${message.isUser ? 'user-message' : 'ai-message'}`}
                                    >
                                        {message.text}
                                        <div className="message-time">{message.time}</div>
                                    </div>
                                ))}
                                {isTyping && (
                                    <div className="typing-indicator">
                                        <span>AI Tutor is typing</span>
                                        <div className="typing-dots">
                                            <div className="typing-dot"></div>
                                            <div className="typing-dot"></div>
                                            <div className="typing-dot"></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="chat-input">
                                <input 
                                    type="text" 
                                    value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Ask me anything..."
                                />
                                <button onClick={handleSendMessage}>
                                    <i className="fas fa-paper-plane"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GameChanger;

