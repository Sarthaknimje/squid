"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaTrophy, FaMedal, FaChartLine, FaUsers, FaCalendarAlt, FaClock, FaInfoCircle, FaCheck, FaExclamationTriangle } from "react-icons/fa";
import BotIcon from "@/components/ui/BotIcon";
import { useAIAgent } from "@/contexts/AIAgentContext";
import Link from "next/link";
import Image from "next/image";

type Tournament = {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  entryFee: string;
  participants: number;
  maxParticipants: number;
  prize: string;
  status: 'upcoming' | 'active' | 'completed';
  games: string[];
  level: number;
  isRegistered?: boolean;
};

export default function TournamentPage() {
  const { agent } = useAIAgent();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'active' | 'completed'>('active');
  const [showModal, setShowModal] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [showRegistrationSuccess, setShowRegistrationSuccess] = useState(false);
  const [registeredTournaments, setRegisteredTournaments] = useState<string[]>([]);

  // Mock data for tournaments
  const tournaments: Tournament[] = [
    {
      id: "tournament-1",
      name: "Spring Deathmatch Series",
      description: "The first official tournament of the season. Compete against 256 AI agents for glory and prizes.",
      startDate: "2025-03-20",
      endDate: "2025-03-25",
      entryFee: "0.05 ETH",
      participants: 187,
      maxParticipants: 256,
      prize: "10 ETH + Legendary NFT Agent",
      status: 'active',
      games: ["Red Light, Green Light", "Tug of War", "Marbles", "Glass Bridge", "Squid Game"],
      level: 3
    },
    {
      id: "tournament-2",
      name: "Weekend Challenge Cup",
      description: "A fast-paced weekend tournament with accelerated matches and high stakes.",
      startDate: "2025-03-22",
      endDate: "2025-03-23",
      entryFee: "0.02 ETH",
      participants: 64,
      maxParticipants: 64,
      prize: "3 ETH + Epic NFT Agent",
      status: 'active',
      games: ["Red Light, Green Light", "Tug of War", "Glass Bridge"],
      level: 1
    },
    {
      id: "tournament-3",
      name: "Advanced Strategies Championship",
      description: "A tournament designed for high-level agents with strategic capabilities.",
      startDate: "2025-04-05",
      endDate: "2025-04-10",
      entryFee: "0.1 ETH",
      participants: 42,
      maxParticipants: 128,
      prize: "15 ETH + Legendary NFT Agent",
      status: 'upcoming',
      games: ["Tug of War", "Marbles", "Glass Bridge", "Squid Game"],
      level: 5
    },
    {
      id: "tournament-4",
      name: "Rookie Showcase",
      description: "A tournament specifically for new agents to prove their worth.",
      startDate: "2025-03-28",
      endDate: "2025-03-30",
      entryFee: "0.01 ETH",
      participants: 89,
      maxParticipants: 128,
      prize: "1 ETH + Rare NFT Agent",
      status: 'upcoming',
      games: ["Red Light, Green Light", "Marbles"],
      level: 1
    },
    {
      id: "tournament-5",
      name: "Winter Championship",
      description: "The prestigious winter tournament with the highest prize pool of the season.",
      startDate: "2025-01-15",
      endDate: "2025-01-22",
      entryFee: "0.08 ETH",
      participants: 256,
      maxParticipants: 256,
      prize: "25 ETH + Legendary NFT Agent",
      status: 'completed',
      games: ["Red Light, Green Light", "Tug of War", "Marbles", "Glass Bridge", "Squid Game"],
      level: 4
    },
    {
      id: "tournament-6",
      name: "Strategic Masters",
      description: "A tournament focused on strategic gameplay and long-term planning.",
      startDate: "2025-02-10",
      endDate: "2025-02-15",
      entryFee: "0.07 ETH",
      participants: 128,
      maxParticipants: 128,
      prize: "8 ETH + Epic NFT Agent",
      status: 'completed',
      games: ["Marbles", "Glass Bridge", "Squid Game"],
      level: 3
    }
  ];

  // Check for registration status on load
  useEffect(() => {
    // In a real app, this would be fetched from an API or blockchain
    const savedRegistrations = localStorage.getItem('registeredTournaments');
    if (savedRegistrations) {
      setRegisteredTournaments(JSON.parse(savedRegistrations));
    }
  }, []);

  // Filter tournaments based on active tab
  const filteredTournaments = tournaments
    .filter(t => t.status === activeTab)
    .map(t => ({
      ...t,
      isRegistered: registeredTournaments.includes(t.id)
    }));

  const openTournamentDetails = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setShowModal(true);
  };

  const registerForTournament = (tournamentId: string) => {
    if (!agent) return;
    
    // Add tournament to registered list
    const newRegistrations = [...registeredTournaments, tournamentId];
    setRegisteredTournaments(newRegistrations);
    
    // Save to localStorage (in a real app, this would be API/blockchain)
    localStorage.setItem('registeredTournaments', JSON.stringify(newRegistrations));
    
    // Close modal and show success message
    setShowModal(false);
    setShowRegistrationSuccess(true);
    
    // Hide success message after 3 seconds
    setTimeout(() => {
      setShowRegistrationSuccess(false);
    }, 3000);
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const getTimeLeft = (endDate: string) => {
    const end = new Date(endDate).getTime();
    const now = new Date().getTime();
    const timeLeft = end - now;
    
    if (timeLeft < 0) return 'Ended';
    
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    return `${days}d ${hours}h`;
  };

  const canRegister = (tournament: Tournament) => {
    if (!agent) return false;
    if (registeredTournaments.includes(tournament.id)) return false;
    if (tournament.status !== 'upcoming' && tournament.status !== 'active') return false;
    if (tournament.participants >= tournament.maxParticipants) return false;
    if (agent.level < tournament.level) return false;
    
    return true;
  };

  const getRegistrationStatusMessage = (tournament: Tournament) => {
    if (!agent) return "Create an agent to enter tournaments";
    if (registeredTournaments.includes(tournament.id)) return "You're registered for this tournament";
    if (tournament.participants >= tournament.maxParticipants) return "Tournament is full";
    if (agent.level < tournament.level) return `Agent level too low (Level ${tournament.level}+ required)`;
    
    return "";
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Tournament Arena</h1>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Enter your AI agent in competitive tournaments to win prizes and earn rare NFT agents.
            Test your agent's abilities against others in the ultimate death match competitions.
          </p>
        </div>
        
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <motion.div 
            className="bg-gray-800 rounded-lg p-5 border-2 border-gray-700"
            whileHover={{ y: -5 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center">
              <div className="p-3 bg-blue-500 bg-opacity-20 rounded-lg mr-4">
                <FaUsers className="text-blue-400 text-2xl" />
              </div>
              <div>
                <h3 className="text-sm text-gray-400">Active Players</h3>
                <p className="text-2xl font-bold text-white">1,256</p>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            className="bg-gray-800 rounded-lg p-5 border-2 border-gray-700"
            whileHover={{ y: -5 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center">
              <div className="p-3 bg-pink-500 bg-opacity-20 rounded-lg mr-4">
                <FaTrophy className="text-pink-400 text-2xl" />
              </div>
              <div>
                <h3 className="text-sm text-gray-400">Active Tournaments</h3>
                <p className="text-2xl font-bold text-white">12</p>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            className="bg-gray-800 rounded-lg p-5 border-2 border-gray-700"
            whileHover={{ y: -5 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center">
              <div className="p-3 bg-yellow-500 bg-opacity-20 rounded-lg mr-4">
                <FaMedal className="text-yellow-400 text-2xl" />
              </div>
              <div>
                <h3 className="text-sm text-gray-400">Total Prize Pool</h3>
                <p className="text-2xl font-bold text-white">214 ETH</p>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            className="bg-gray-800 rounded-lg p-5 border-2 border-gray-700"
            whileHover={{ y: -5 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center">
              <div className="p-3 bg-green-500 bg-opacity-20 rounded-lg mr-4">
                <FaChartLine className="text-green-400 text-2xl" />
              </div>
              <div>
                <h3 className="text-sm text-gray-400">Your Rank</h3>
                <p className="text-2xl font-bold text-white">{agent ? `#${Math.floor(Math.random() * 1000) + 1}` : 'N/A'}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Tournament Agent Status */}
        {!agent ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 rounded-lg p-6 mb-8 border-2 border-yellow-600"
          >
            <div className="flex items-center">
              <FaExclamationTriangle className="text-yellow-400 text-2xl mr-3" />
              <div>
                <h3 className="text-xl font-bold text-white">No AI Agent Found</h3>
                <p className="text-gray-300">You need to create an AI agent to participate in tournaments.</p>
              </div>
            </div>
            <Link 
              href="/train" 
              className="mt-4 bg-squid-pink hover:bg-opacity-80 text-white font-bold py-2 px-6 rounded-md transition duration-200 inline-block"
            >
              Create Agent
            </Link>
          </motion.div>
        ) : (
          <AnimatePresence>
            {showRegistrationSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-green-500 text-white p-4 rounded-lg mb-6 flex items-center shadow-lg"
              >
                <FaCheck className="mr-2" />
                <span>Registration successful! Your agent has been entered into the tournament.</span>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Tabs */}
        <div className="flex mb-8 border-b border-gray-700">
          <button
            className={`px-4 py-3 font-medium flex items-center relative ${
              activeTab === "active"
                ? "text-squid-pink border-b-2 border-squid-pink"
                : "text-gray-400 hover:text-white"
            }`}
            onClick={() => setActiveTab("active")}
          >
            Active Tournaments
          </button>
          <button
            className={`px-4 py-3 font-medium flex items-center relative ${
              activeTab === "upcoming"
                ? "text-squid-pink border-b-2 border-squid-pink"
                : "text-gray-400 hover:text-white"
            }`}
            onClick={() => setActiveTab("upcoming")}
          >
            Upcoming Tournaments
          </button>
          <button
            className={`px-4 py-3 font-medium flex items-center relative ${
              activeTab === "completed"
                ? "text-squid-pink border-b-2 border-squid-pink"
                : "text-gray-400 hover:text-white"
            }`}
            onClick={() => setActiveTab("completed")}
          >
            Completed Tournaments
          </button>
        </div>
        
        {/* Tournament List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTournaments.map((tournament) => (
            <motion.div
              key={tournament.id}
              className="bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-700 flex flex-col"
              whileHover={{ y: -5 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="relative h-40 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-purple-600 opacity-50"></div>
                
                <div className="absolute inset-0 flex items-center justify-center">
                  <FaTrophy className="text-white text-6xl" />
                </div>
                
                {tournament.isRegistered && (
                  <div className="absolute top-4 right-4 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    Registered
                  </div>
                )}
                
                {tournament.level > 1 && (
                  <div className="absolute top-4 left-4 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                    Level {tournament.level}+
                  </div>
                )}
              </div>
              
              <div className="p-6 flex-grow">
                <h3 className="text-xl font-bold text-white mb-2">{tournament.name}</h3>
                <p className="text-gray-300 text-sm mb-4 line-clamp-2">{tournament.description}</p>
                
                <div className="flex flex-wrap text-xs text-gray-400 mb-4 gap-2">
                  <div className="flex items-center mr-3">
                    <FaCalendarAlt className="mr-1" />
                    <span>{formatDate(tournament.startDate)}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <FaUsers className="mr-1" />
                    <span>{tournament.participants}/{tournament.maxParticipants}</span>
                  </div>
                  
                  {activeTab === 'active' && (
                    <div className="flex items-center">
                      <FaClock className="mr-1" />
                      <span>Ends in: {getTimeLeft(tournament.endDate)}</span>
                    </div>
                  )}
                </div>
                
                <div className="bg-gray-700 p-3 rounded-md mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 text-sm">Prize Pool:</span>
                    <span className="text-white font-bold">{tournament.prize}</span>
                  </div>
                </div>
              </div>
              
              <div className="px-6 pb-6">
                {tournament.isRegistered ? (
                  <div className="bg-green-500 bg-opacity-20 border border-green-500 text-green-500 py-2 rounded-md text-center font-medium">
                    Registered
                  </div>
                ) : (
                  <div className="flex flex-col space-y-2">
                    <button
                      onClick={() => openTournamentDetails(tournament)}
                      className="bg-squid-pink hover:bg-opacity-80 text-white font-bold py-2 rounded-md transition duration-200"
                    >
                      View Details
                    </button>
                    
                    {!canRegister(tournament) && (
                      <div className="text-yellow-400 text-xs text-center">
                        {getRegistrationStatusMessage(tournament)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
        
        {filteredTournaments.length === 0 && (
          <div className="text-center py-16 bg-gray-800 rounded-lg">
            <FaInfoCircle className="text-gray-500 text-5xl mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No {activeTab} tournaments found</h3>
            <p className="text-gray-400">Check back later for new tournaments</p>
          </div>
        )}
        
        {/* Tournament Details Modal */}
        {showModal && selectedTournament && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <motion.div 
              className="bg-gray-800 rounded-lg max-w-2xl w-full overflow-hidden shadow-2xl border-2 border-gray-700"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
            >
              <div className="relative h-40 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-purple-600 opacity-50"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <FaTrophy className="text-white text-6xl" />
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  className="absolute top-4 right-4 bg-black bg-opacity-50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-opacity-70"
                >
                  &times;
                </button>
              </div>
              
              <div className="p-6">
                <h2 className="text-2xl font-bold text-white mb-2">{selectedTournament.name}</h2>
                <p className="text-gray-300 mb-4">{selectedTournament.description}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <h3 className="text-sm text-gray-400 mb-2">Details</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Dates:</span>
                        <span className="text-white">{formatDate(selectedTournament.startDate)} - {formatDate(selectedTournament.endDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Entry Fee:</span>
                        <span className="text-white">{selectedTournament.entryFee}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Participants:</span>
                        <span className="text-white">{selectedTournament.participants}/{selectedTournament.maxParticipants}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Level Requirement:</span>
                        <span className="text-white">Level {selectedTournament.level}+</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <h3 className="text-sm text-gray-400 mb-2">Prize Details</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-300">1st Place:</span>
                        <span className="text-white">{selectedTournament.prize}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">2nd Place:</span>
                        <span className="text-white">{parseInt(selectedTournament.prize.split(' ')[0]) / 4} ETH + Epic NFT</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">3rd Place:</span>
                        <span className="text-white">{parseInt(selectedTournament.prize.split(' ')[0]) / 10} ETH + Rare NFT</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mb-6">
                  <h3 className="text-sm text-gray-400 mb-2">Games Included</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedTournament.games.map((game) => (
                      <span 
                        key={game} 
                        className="bg-gray-700 text-white text-sm px-3 py-1 rounded-full"
                      >
                        {game}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-6 py-3 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition duration-200"
                  >
                    Close
                  </button>
                  
                  {canRegister(selectedTournament) && (
                    <button
                      onClick={() => registerForTournament(selectedTournament.id)}
                      className="px-6 py-3 bg-squid-pink hover:bg-opacity-80 text-white rounded-md transition duration-200 font-bold"
                    >
                      Register Now
                    </button>
                  )}
                </div>
                
                {!canRegister(selectedTournament) && (
                  <div className="mt-4 bg-yellow-500 bg-opacity-10 border border-yellow-500 text-yellow-500 p-3 rounded-md text-sm text-center">
                    {getRegistrationStatusMessage(selectedTournament)}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
} 