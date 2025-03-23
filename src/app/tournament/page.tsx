"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaTrophy, FaMedal, FaChartLine, FaUsers, FaCalendarAlt, FaClock, FaInfoCircle, FaCheck, FaExclamationTriangle } from "react-icons/fa";
import { useAIAgent } from "@/contexts/AIAgentContext";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/ui/Header";

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
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto py-10 px-4 lg:px-8">
        <h1 className="text-4xl font-bold mb-4 text-center">AI Deathmatch Tournament</h1>
        <p className="text-lg text-center text-gray-300 mb-10">
          Compete in a series of deadly challenges to prove your agent's superiority
        </p>
        
        {/* Tournament Bracket */}
        <div className="overflow-x-auto mb-10 pb-4">
          <div className="min-w-[900px]">
            {renderTournamentBracket()}
          </div>
        </div>
        
        {/* Current Game */}
        {currentMatchup && (
          <div className="bg-gray-800 rounded-lg p-6 mb-10">
            <h2 className="text-2xl font-bold mb-4">Current Match</h2>
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="flex flex-col items-center mb-4 md:mb-0">
                <div className="h-20 w-20 rounded-full bg-blue-600 flex items-center justify-center text-3xl mb-2">
                  {getAgentIcon(currentMatchup.player1.rarity)}
                </div>
                <h3 className="text-lg font-bold">{currentMatchup.player1.name}</h3>
                <p className="text-sm text-gray-400">
                  Level {currentMatchup.player1.level} · {currentMatchup.player1.rarity}
                </p>
              </div>
              
              <div className="flex flex-col items-center mb-4 md:mb-0">
                <div className="text-2xl font-bold mb-2">VS</div>
                <button
                  onClick={playCurrentMatch}
                  disabled={gameInProgress}
                  className={`px-4 py-2 rounded-md text-white ${
                    gameInProgress 
                      ? "bg-gray-600 cursor-not-allowed" 
                      : "bg-squid-pink hover:bg-squid-pink-dark"
                  }`}
                >
                  {gameInProgress ? "Game in Progress..." : "Start Match"}
                </button>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="h-20 w-20 rounded-full bg-red-600 flex items-center justify-center text-3xl mb-2">
                  {getAgentIcon(currentMatchup.player2.rarity)}
                </div>
                <h3 className="text-lg font-bold">{currentMatchup.player2.name}</h3>
                <p className="text-sm text-gray-400">
                  Level {currentMatchup.player2.level} · {currentMatchup.player2.rarity}
                </p>
              </div>
            </div>
            
            {gameInProgress && (
              <div className="mt-6">
                <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-squid-pink"
                    style={{ width: `${gameProgress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between mt-2 text-sm">
                  <span>Game in Progress</span>
                  <span>{gameProgress}%</span>
                </div>
              </div>
            )}
            
            {matchResult && (
              <div className="mt-6 p-4 bg-gray-700 rounded-lg">
                <h3 className="text-xl font-bold mb-2">Match Result</h3>
                <p className="text-lg">
                  Winner: <span className="font-bold text-green-400">{matchResult.winner.name}</span>
                </p>
                <p className="text-sm text-gray-300 mt-1">
                  {matchResult.description}
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* Tournament Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center">
              <div className="text-squid-pink text-2xl mr-3">
                <FaTrophy />
              </div>
              <div>
                <h3 className="text-lg font-bold">Tournament Status</h3>
                <p className="text-sm text-gray-300">{getTournamentStatus()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center">
              <div className="text-green-500 text-2xl mr-3">
                <FaCoins />
              </div>
              <div>
                <h3 className="text-lg font-bold">Prize Pool</h3>
                <p className="text-sm text-gray-300">1000 APT</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center">
              <div className="text-blue-500 text-2xl mr-3">
                <FaRobot />
              </div>
              <div>
                <h3 className="text-lg font-bold">Participants</h3>
                <p className="text-sm text-gray-300">{tournament.participants.length} Agents</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center">
              <div className="text-yellow-500 text-2xl mr-3">
                <FaInfoCircle />
              </div>
              <div>
                <h3 className="text-lg font-bold">Current Round</h3>
                <p className="text-sm text-gray-300">{currentRound} of {getTotalRounds()}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Your Agent */}
        {selectedAgent && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Your Agent</h2>
            <div className="flex items-start">
              <div className="h-20 w-20 rounded-full bg-blue-600 flex items-center justify-center text-3xl mr-4">
                {getAgentIcon(selectedAgent.rarity)}
              </div>
              <div>
                <h3 className="text-xl font-bold">{selectedAgent.name}</h3>
                <p className="text-sm text-gray-400 mb-2">
                  Level {selectedAgent.level} · {selectedAgent.rarity}
                </p>
                
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-medium flex items-center">
                        <FaBrain className="text-blue-400 mr-1" /> Intelligence
                      </span>
                      <span className="text-xs">{selectedAgent.attributes.Intelligence}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                      <div 
                        className="bg-blue-400 h-1.5 rounded-full" 
                        style={{ width: `${selectedAgent.attributes.Intelligence}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-medium flex items-center">
                        <FaRunning className="text-green-400 mr-1" /> Speed
                      </span>
                      <span className="text-xs">{selectedAgent.attributes.Speed}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                      <div 
                        className="bg-green-400 h-1.5 rounded-full" 
                        style={{ width: `${selectedAgent.attributes.Speed}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-medium flex items-center">
                        <FaShieldAlt className="text-red-400 mr-1" /> Defense
                      </span>
                      <span className="text-xs">{selectedAgent.attributes.Defense}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                      <div 
                        className="bg-red-400 h-1.5 rounded-full" 
                        style={{ width: `${selectedAgent.attributes.Defense}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-medium flex items-center">
                        <FaChessKnight className="text-yellow-400 mr-1" /> Strategy
                      </span>
                      <span className="text-xs">{selectedAgent.attributes.Strategy}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                      <div 
                        className="bg-yellow-400 h-1.5 rounded-full" 
                        style={{ width: `${selectedAgent.attributes.Strategy}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 