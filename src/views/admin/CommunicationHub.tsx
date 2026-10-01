import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import type { ChatMessage, Resident } from '../../types';
import {
  MessageSquare,
  Send,
  User,
  Search,
  Shield,
  Clock,
} from 'lucide-react';

export const CommunicationHub: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResidentId, setSelectedResidentId] = useState<string>('');
  const [newMessage, setNewMessage] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [msgs, res] = await Promise.all([api.getMessages(), api.getResidents()]);
      setMessages(msgs);
      setResidents(res);
      if (res.length > 0 && !selectedResidentId) {
        setSelectedResidentId(res[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedResidentId) return;

    try {
      await api.sendMessage({
        message: newMessage,
        receiverId: selectedResidentId,
      });
      setNewMessage('');
      const updatedMsgs = await api.getMessages();
      setMessages(updatedMsgs);
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    }
  };

  const activeResident = residents.find((r) => r.id === selectedResidentId);

  // Messages between owner and this resident
  const conversation = messages.filter((m) => {
    if (!activeResident) return false;
    return (
      (m.senderId === 'usr-admin' && m.receiverId === activeResident.id) ||
      (m.senderId === activeResident.id && m.receiverId === 'usr-admin') ||
      m.senderName === activeResident.fullName ||
      m.receiverName === activeResident.fullName
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-indigo-600" />
          Internal Resident Messaging
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Private, direct communication with tenants without exposing personal phone numbers.
        </p>
      </div>

      {/* Chat Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col md:flex-row h-[600px]">
        {/* Left: Resident Conversations List */}
        <div className="w-full md:w-72 border-r border-slate-200 flex flex-col bg-slate-50/50">
          <div className="p-3.5 border-b border-slate-200 bg-white">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Tenants ({residents.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {residents.map((r) => {
              const isSelected = r.id === selectedResidentId;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedResidentId(r.id)}
                  className={`w-full p-3 flex items-center gap-3 text-left transition-colors ${
                    isSelected ? 'bg-indigo-50/80 border-l-4 border-indigo-600' : 'hover:bg-slate-100/60'
                  }`}
                >
                  <img
                    src={r.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80'}
                    alt={r.fullName}
                    className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs text-slate-900 truncate">{r.fullName}</div>
                    <div className="text-[11px] text-slate-500">
                      Room {r.roomNumber} ({r.bedNumber})
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Active Conversation View */}
        <div className="flex-1 flex flex-col bg-white">
          {activeResident ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <img
                    src={activeResident.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80'}
                    alt={activeResident.fullName}
                    className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{activeResident.fullName}</h3>
                    <p className="text-[11px] text-slate-500">
                      Room {activeResident.roomNumber} • Floor {activeResident.floor} • {activeResident.phone}
                    </p>
                  </div>
                </div>

                <span className="text-[10px] px-2.5 py-1 rounded-full font-bold uppercase bg-emerald-100 text-emerald-800">
                  {activeResident.status}
                </span>
              </div>

              {/* Messages Scroll Area */}
              <div className="flex-1 p-5 overflow-y-auto space-y-3 bg-slate-50/40 custom-scrollbar">
                {conversation.length > 0 ? (
                  conversation.map((msg) => {
                    const isFromAdmin = msg.senderRole === 'admin' || msg.senderId === 'usr-admin';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isFromAdmin ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed ${
                            isFromAdmin
                              ? 'bg-indigo-600 text-white rounded-br-xs shadow-xs'
                              : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs shadow-2xs'
                          }`}
                        >
                          <p>{msg.message}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 px-1">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
                    <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
                    <p>No messages yet with {activeResident.fullName}.</p>
                    <p className="text-[11px]">Send a message to start the conversation.</p>
                  </div>
                )}
              </div>

              {/* Input Form */}
              <form onSubmit={handleSend} className="p-3.5 border-t border-slate-100 flex items-center gap-2 bg-white">
                <input
                  type="text"
                  placeholder={`Send direct message to ${activeResident.fullName}...`}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 px-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" /> Send
                </button>
              </form>
            </>
          ) : (
            <div className="flex items-center justify-center flex-1 text-slate-400 text-xs">
              Select a resident to start messaging
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
