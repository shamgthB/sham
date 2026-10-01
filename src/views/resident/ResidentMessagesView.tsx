import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import type { ChatMessage, Resident } from '../../types';
import { MessageSquare, Send, Shield } from 'lucide-react';

export const ResidentMessagesView: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [resident, setResident] = useState<Resident | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const allRes = await api.getResidents();
      const myRes = allRes.find((r) => r.userId === user?.id) || allRes[0];
      setResident(myRes);

      const msgs = await api.getMessages();
      setMessages(msgs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await api.sendMessage({
        message: newMessage,
        receiverId: 'usr-admin',
      });
      setNewMessage('');
      const msgs = await api.getMessages();
      setMessages(msgs);
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    }
  };

  const conversation = messages.filter((m) => {
    if (!resident) return false;
    return (
      (m.senderId === resident.id && m.receiverId === 'usr-admin') ||
      (m.senderId === 'usr-admin' && m.receiverId === resident.id) ||
      m.senderName === resident.fullName ||
      m.receiverName === resident.fullName
    );
  });

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-indigo-600" />
          Direct Contact with Hostel Warden & Management
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Have a question about hostel guidelines, rent receipts, or gate passes? Chat directly with the warden.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-[560px]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">Hostel Warden & Management Desk</h3>
              <p className="text-[11px] text-emerald-600 font-medium">● Available 24/7 on campus</p>
            </div>
          </div>
        </div>

        {/* Message Area */}
        <div className="flex-1 p-5 overflow-y-auto space-y-3 bg-slate-50/40">
          {conversation.length > 0 ? (
            conversation.map((msg) => {
              const isMe = msg.senderRole === 'resident' || msg.senderId === resident?.id;
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed ${
                      isMe
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
              <p>No messages yet. Send a query below to start a chat with the manager.</p>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-3.5 border-t border-slate-100 flex items-center gap-2 bg-white">
          <input
            type="text"
            placeholder="Type your message to the hostel management..."
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
      </div>
    </div>
  );
};
