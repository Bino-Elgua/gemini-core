import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { Agent, AgentType, AgentMessage, BrandDNA } from '../types';
import { chatWithAgent } from '../services/agentService';
import { universalAiService } from '../services/universalAiService';
import { Link } from 'react-router-dom';
import { 
  Bot, Plus, Settings, BookOpen, Shield, MessageSquare, Rocket, Trash2, Save, 
  Terminal, User, Send, RefreshCw, Dna, ChevronDown, Layers, CheckCircle2, 
  AlertCircle, ChevronLeft, ChevronRight, Sliders, Mic, Database, ShieldCheck, 
  Brain, Zap, Activity, UserCheck, Globe, Info, History, Lock, Search, Sparkles, 
  Wand2, Music, Volume2, Headphones
} from 'lucide-react';
import { BrandSelector } from '../components/BrandSelector';

// Tab configuration with icons
const AGENT_TABS = [
  { id: 'instructions', label: 'Instructions Matrix', icon: BookOpen, color: 'blue' },
  { id: 'neural', label: 'Neural Base', icon: Brain, color: 'purple' },
  { id: 'safety', label: 'Safety Protocols', icon: ShieldCheck, color: 'red' },
  { id: 'knowledge', label: 'Knowledge Store', icon: Database, color: 'green' },
  { id: 'sonic', label: 'Sonic Lab', icon: Music, color: 'orange' },
  { id: 'test', label: 'Test & Verify', icon: CheckCircle2, color: 'cyan' },
];

const AgentForgePage = () => {
  const { agents, addAgent, updateAgent, deleteAgent, brands, currentBrand, setBrand } = useStore();
  const [selectedAgentId, setSelectedAgentId] = useState<string>(agents[0]?.id || '');
  const [activeTab, setActiveTab] = useState<string>('instructions');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [scrollPosition, setScrollPosition] = useState(0);
  const tabScrollRef = useRef<HTMLDivElement>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Agent>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isGeneratingInstruction, setIsGeneratingInstruction] = useState(false);
  
  // Test Chat State
  const [chatHistory, setChatHistory] = useState<AgentMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [simulationMetrics, setSimulationMetrics] = useState({ latency: 0, tokens: 0, fromCache: false });
  
  // Sonic Lab State
  const [sonicSettings, setSonicSettings] = useState({
    voice: 'neutral' as 'male' | 'female' | 'neutral',
    tone: 'professional' as string,
    pace: 'normal' as 'slow' | 'normal' | 'fast',
    volume: 80
  });
  const [generatedAudio, setGeneratedAudio] = useState<{ id: string; url: string; type: string } | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const updateField = (field: keyof Agent, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  useEffect(() => {
    const agent = agents.find(a => a.id === selectedAgentId);
    if (agent) {
      setFormData(agent);
      setIsDirty(false);
      if (chatHistory.length === 0) {
        setChatHistory([{
          id: 'init',
          role: 'model',
          text: `Neural link established. Callsign: ${agent.name}. Sync status: ${currentBrand?.name || 'Global'}. Ready for simulation.`,
          timestamp: new Date().toISOString()
        }]);
      }
    }
  }, [selectedAgentId, agents, currentBrand]);

  // Horizontal scroll tabs
  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabScrollRef.current) {
      const scroll = direction === 'left' ? -300 : 300;
      tabScrollRef.current.scrollBy({ left: scroll, behavior: 'smooth' });
    }
  };

  // Sonic Lab Audio Generation
  const handleGenerateAudio = async () => {
    if (!formData.systemInstruction) return;
    setIsGeneratingAudio(true);
    
    try {
      // Simulate Lyria 3 audio generation
      const prompt = `Generate ${sonicSettings.tone} voice-over in ${sonicSettings.voice} voice at ${sonicSettings.pace} pace:\n${formData.systemInstruction}`;
      
      const response = await universalAiService.generateText({
        prompt,
        featureId: 'sonic-lab-generation',
        responseMimeType: 'text/plain'
      });

      // Mock audio URL (in production, would be from Lyria 3)
      setGeneratedAudio({
        id: `audio_${Date.now()}`,
        url: `https://sonic.google.com/audio/${Date.now()}.wav`,
        type: 'jingle'
      });
    } catch (error) {
      console.error('Audio generation failed:', error);
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const newMessage: AgentMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      text: chatInput,
      timestamp: new Date().toISOString()
    };

    setChatHistory(prev => [...prev, newMessage]);
    setChatInput('');
    setIsTyping(true);

    try {
      const response = await chatWithAgent(selectedAgentId, chatInput);
      const botMessage: AgentMessage = {
        id: `msg_${Date.now()}_bot`,
        role: 'model',
        text: response.reply,
        timestamp: new Date().toISOString()
      };
      
      setChatHistory(prev => [...prev, botMessage]);
      setSimulationMetrics({
        latency: response.latency || 250,
        tokens: response.tokenCount || 500,
        fromCache: response.fromCache || false
      });
    } catch (error) {
      const errorMessage: AgentMessage = {
        id: `msg_${Date.now()}_error`,
        role: 'model',
        text: 'Connection error. Retrying...',
        timestamp: new Date().toISOString()
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
  };

  const agent = agents.find(a => a.id === selectedAgentId);

  return (
    <div className="h-full flex bg-black">
      {/* Left Sidebar */}
      {isSidebarOpen && (
        <div className="w-64 border-r border-zinc-800 bg-zinc-900/50 flex flex-col">
          <div className="p-4 border-b border-zinc-800">
            <button
              onClick={() => addAgent()}
              className="w-full flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" /> New Agent
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {agents.map(agent => (
              <button
                key={agent.id}
                onClick={() => setSelectedAgentId(agent.id)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                  selectedAgentId === agent.id
                    ? 'bg-brand-600/20 border border-brand-500 text-brand-400'
                    : 'bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Bot className="w-4 h-4" />
                  <span className="font-semibold text-sm">{agent.name}</span>
                </div>
                <div className="text-xs text-zinc-500 ml-6">{agent.type}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar with Horizontal Tabs */}
        <div className="border-b border-zinc-800 bg-black/80 backdrop-blur">
          {/* Header */}
          <div className="px-6 py-4 flex items-center justify-between border-b border-zinc-800/50">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400"
              >
                {isSidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </button>
              <div>
                <h2 className="text-xl font-bold text-white">{agent?.name || 'Agent Forge'}</h2>
                <p className="text-xs text-zinc-400">{currentBrand?.name || 'Global Context'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isDirty && (
                <button
                  onClick={() => {
                    updateAgent(selectedAgentId, formData as Agent);
                    setIsDirty(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg font-semibold transition-colors"
                >
                  <Save className="w-4 h-4" /> Save
                </button>
              )}
            </div>
          </div>

          {/* Horizontal Tab Scroll */}
          <div className="flex items-center px-6 gap-2 pb-2">
            <button
              onClick={() => scrollTabs('left')}
              className="p-1 hover:bg-zinc-800 rounded text-zinc-400"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div
              ref={tabScrollRef}
              className="flex-1 overflow-x-auto scrollbar-hide flex gap-2 pb-2"
              style={{ scrollBehavior: 'smooth' }}
            >
              {AGENT_TABS.map(tab => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
                      isActive
                        ? `bg-${tab.color}-500/20 text-${tab.color}-400 border border-${tab.color}-500/50`
                        : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50'
                    }`}
                  >
                    <TabIcon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => scrollTabs('right')}
              className="p-1 hover:bg-zinc-800 rounded text-zinc-400"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {/* INSTRUCTIONS MATRIX */}
          {activeTab === 'instructions' && (
            <div className="max-w-5xl mx-auto p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-white mb-2">System Instruction</label>
                <textarea
                  value={formData.systemInstruction || ''}
                  onChange={(e) => updateField('systemInstruction', e.target.value)}
                  placeholder="Define core behavior, constraints, and response patterns..."
                  className="w-full h-48 bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-white font-mono text-sm resize-none focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {['expertise', 'tone', 'constraints', 'context'].map((field) => (
                  <div key={field}>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">{field}</label>
                    <input
                      type="text"
                      value={formData[field as keyof Agent] || ''}
                      onChange={(e) => updateField(field as keyof Agent, e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:border-brand-500 focus:outline-none"
                      placeholder={`Enter ${field}...`}
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={async () => {
                  setIsGeneratingInstruction(true);
                  try {
                    const generated = await universalAiService.generateText({
                      prompt: `Generate a detailed system instruction for a ${formData.type || 'lead'} agent named ${formData.name || 'Agent'}.`,
                      featureId: 'agent-instruction-generation'
                    });
                    updateField('systemInstruction', generated);
                  } finally {
                    setIsGeneratingInstruction(false);
                  }
                }}
                disabled={isGeneratingInstruction}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg font-semibold transition-colors"
              >
                <Wand2 className="w-4 h-4" /> {isGeneratingInstruction ? 'Generating...' : 'AI Generate'}
              </button>
            </div>
          )}

          {/* NEURAL BASE */}
          {activeTab === 'neural' && (
            <div className="max-w-5xl mx-auto p-6 space-y-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-500" />
                Neural Configuration
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-white mb-2">Memory Type</label>
                  <select className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white">
                    <option>Long-term (24h)</option>
                    <option>Session (2h)</option>
                    <option>Stateless</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-white mb-2">Temperature</label>
                  <input type="range" min="0" max="1" step="0.1" defaultValue="0.7" className="w-full" />
                </div>
              </div>
            </div>
          )}

          {/* SAFETY PROTOCOLS */}
          {activeTab === 'safety' && (
            <div className="max-w-5xl mx-auto p-6 space-y-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-red-500" />
                Safety & Guardrails
              </h3>
              <div className="space-y-3">
                {['Block profanity', 'Prevent data leaks', 'Rate limiting', 'Content filtering'].map((guard) => (
                  <label key={guard} className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
                    <span className="text-white">{guard}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* KNOWLEDGE STORE */}
          {activeTab === 'knowledge' && (
            <div className="max-w-5xl mx-auto p-6 space-y-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-green-500" />
                Knowledge Base
              </h3>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
                <p className="text-zinc-400">Knowledge documents and RAG sources configured here.</p>
              </div>
            </div>
          )}

          {/* SONIC LAB */}
          {activeTab === 'sonic' && (
            <div className="max-w-5xl mx-auto p-6 space-y-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Music className="w-5 h-5 text-orange-500" />
                Sonic Lab - Audio & Voice
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-white mb-2">Voice</label>
                  <select
                    value={sonicSettings.voice}
                    onChange={(e) => setSonicSettings(prev => ({ ...prev, voice: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="neutral">Neutral</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-white mb-2">Pace</label>
                  <select
                    value={sonicSettings.pace}
                    onChange={(e) => setSonicSettings(prev => ({ ...prev, pace: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white"
                  >
                    <option value="slow">Slow</option>
                    <option value="normal">Normal</option>
                    <option value="fast">Fast</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-white mb-2">Tone</label>
                  <input
                    type="text"
                    value={sonicSettings.tone}
                    onChange={(e) => setSonicSettings(prev => ({ ...prev, tone: e.target.value }))}
                    placeholder="professional, friendly, urgent..."
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-white mb-2">Volume</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sonicSettings.volume}
                    onChange={(e) => setSonicSettings(prev => ({ ...prev, volume: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                </div>
              </div>

              <button
                onClick={handleGenerateAudio}
                disabled={isGeneratingAudio}
                className="flex items-center gap-2 px-6 py-3 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 rounded-lg font-semibold transition-colors"
              >
                <Volume2 className="w-4 h-4" />
                {isGeneratingAudio ? 'Generating Audio...' : 'Generate Voice-Over'}
              </button>

              {generatedAudio && (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 flex items-center gap-4">
                  <Headphones className="w-8 h-8 text-orange-500" />
                  <div className="flex-1">
                    <p className="font-semibold text-white">{generatedAudio.type}</p>
                    <audio controls className="w-full mt-2" src={generatedAudio.url} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TEST & VERIFY */}
          {activeTab === 'test' && (
            <div className="max-w-5xl mx-auto p-6 space-y-4">
              <h3 className="text-lg font-bold text-white">Test Agent</h3>

              <div
                ref={scrollRef}
                className="h-96 bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 overflow-y-auto space-y-4 mb-4"
              >
                {chatHistory.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-brand-600 text-white'
                          : 'bg-zinc-800 text-zinc-200'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-zinc-800 text-zinc-200 px-4 py-2 rounded-lg">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Test the agent..."
                  className="flex-1 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-brand-500 focus:outline-none"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isTyping}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              {simulationMetrics.latency > 0 && (
                <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-3 flex gap-4 text-sm">
                  <div><span className="text-cyan-400 font-semibold">{simulationMetrics.latency}ms</span> latency</div>
                  <div><span className="text-cyan-400 font-semibold">{simulationMetrics.tokens}</span> tokens</div>
                  {simulationMetrics.fromCache && <div className="text-cyan-400">From cache</div>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentForgePage;
