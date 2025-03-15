"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAIAgent } from "@/contexts/AIAgentContext";
import BotIcon from "@/components/ui/BotIcon";
import Link from "next/link";
import { FaTrophy, FaMedal, FaGamepad, FaBolt, FaBrain, FaShieldAlt, FaChessKnight, FaFire, FaHistory, FaStar, FaCrown, FaExclamationTriangle } from "react-icons/fa";

export default function ProfilePage() {
  const { agent, updateAgent } = useAIAgent();
  const [selectedTab, setSelectedTab] = useState("stats");
  const [showEditName, setShowEditName] = useState(false);
  const [newName, setNewName] = useState("");
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);

  useEffect(() => {
    if (agent) {
      setNewName(agent.name);
    }
  }, [agent]);

  if (!agent) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 rounded-xl p-8 max-w-md w-full shadow-xl border-2 border-yellow-600"
        >
          <div className="flex items-center justify-center mb-6">
            <FaExclamationTriangle className="text-yellow-500 text-4xl" />
          </div>
          <h1 className="text-2xl font-bold text-white text-center mb-4">No AI Agent Found</h1>
          <p className="text-gray-300 text-center mb-6">
            You need to create an AI agent to view this profile page. Visit the training center to create your custom AI agent.
          </p>
          <Link
            href="/train"
            className="block w-full bg-squid-pink hover:bg-opacity-90 text-white text-center py-3 rounded-lg font-bold transition duration-200"
          >
            Create Your Agent
          </Link>
        </motion.div>
      </div>
    );
  }

  const handleUpdateName = () => {
    if (newName.trim() && updateAgent) {
      updateAgent({
        ...agent,
        name: newName.trim()
      });
      setShowEditName(false);
      setShowSuccessNotification(true);
      
      setTimeout(() => {
        setShowSuccessNotification(false);
      }, 3000);
    }
  };

  // Define badges based on agent achievements, etc.
  const badges = [
    { id: 1, icon: <FaTrophy className="text-yellow-400 text-xl" />, name: "Champion", description: "Won a tournament" },
    { id: 2, icon: <FaMedal className="text-blue-400 text-xl" />, name: "Survivor", description: "Completed 10 games" },
    { id: 3, icon: <FaFire className="text-orange-400 text-xl" />, name: "Streak", description: "Won 5 games in a row" },
    { id: 4, icon: <FaCrown className="text-purple-400 text-xl" />, name: "Elite", description: "Reached Level 10" },
    { id: 5, icon: <FaStar className="text-yellow-400 text-xl" />, name: "All-Star", description: "High performance in all games" },
  ];

  // Only show badges that have been earned
  const earnedBadges = badges.filter(badge => {
    // Mock logic based on agent level - in a real app, this would be based on actual achievements
    if (badge.id === 1) return agent.level >= 8;
    if (badge.id === 2) return agent.level >= 5;
    if (badge.id === 3) return agent.level >= 3;
    if (badge.id === 4) return agent.level >= 10;
    if (badge.id === 5) return agent.level >= 15;
    return false;
  });

  // Mock game history data
  const gameHistory = [
    { id: 1, game: "Red Light, Green Light", result: "Won", date: "2025-03-15", reward: "+100 XP" },
    { id: 2, game: "Tug of War", result: "Lost", date: "2025-03-14", reward: "+20 XP" },
    { id: 3, game: "Marbles", result: "Won", date: "2025-03-12", reward: "+150 XP" },
    { id: 4, game: "Glass Bridge", result: "Won", date: "2025-03-10", reward: "+200 XP" },
    { id: 5, game: "Red Light, Green Light", result: "Won", date: "2025-03-08", reward: "+100 XP" },
  ];

  // Mock tournament history
  const tournamentHistory = [
    { id: 1, name: "Spring Deathmatch Series", placement: "3rd Place", date: "2025-03-01", reward: "Epic NFT Agent" },
    { id: 2, name: "Weekend Challenge Cup", placement: "1st Place", date: "2025-02-15", reward: "3 ETH + Epic NFT Agent" },
  ];

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-12">
        {/* Success Notification */}
        <AnimatePresence>
          {showSuccessNotification && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg z-50"
            >
              Agent name updated successfully!
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Agent Profile Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 rounded-xl overflow-hidden shadow-lg mb-8 border border-gray-700"
        >
          <div className="relative h-40 bg-gradient-to-r from-pink-500 to-purple-600">
            <div className="absolute -bottom-16 left-6 md:left-10">
              <div className={`w-32 h-32 rounded-full border-4 border-gray-800 shadow-glow-${agent.botType}`}>
                <BotIcon type={agent.botType} size="lg" className="w-full h-full" />
              </div>
            </div>
          </div>
          
          <div className="pt-20 pb-6 px-6 md:px-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                {showEditName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-squid-pink"
                      placeholder="Enter agent name"
                    />
                    <button
                      onClick={handleUpdateName}
                      className="bg-squid-pink hover:bg-opacity-90 text-white px-4 py-2 rounded-lg transition duration-200"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setShowEditName(false);
                        if (agent) setNewName(agent.name);
                      }}
                      className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-white">{agent.name}</h1>
                    <button
                      onClick={() => setShowEditName(true)}
                      className="text-gray-400 hover:text-white"
                    >
                      ✏️
                    </button>
                  </div>
                )}
                <div className="flex items-center mt-1">
                  <div className="px-2 py-1 bg-squid-pink rounded-md text-xs font-semibold text-white mr-2">
                    Level {agent.level}
                  </div>
                  <div className="text-gray-300">
                    {agent.xp} / {(agent.level + 1) * 1000} XP
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Link href="/train" className="bg-squid-pink hover:bg-opacity-90 text-white px-4 py-2 rounded-lg font-semibold transition duration-200">
                  Train Agent
                </Link>
                <Link href="/game" className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold transition duration-200">
                  Play Games
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Agent Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div 
            className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-blue-500 bg-opacity-20 flex items-center justify-center mr-4">
                <FaBolt className="text-blue-400 text-xl" />
              </div>
              <div>
                <h3 className="text-gray-400 text-sm">Speed</h3>
                <p className="text-2xl font-bold text-white">{agent.attributes.speed}</p>
              </div>
            </div>
            <div className="mt-4 bg-gray-700 w-full h-2 rounded-full overflow-hidden">
              <div 
                className="bg-blue-500 h-full" 
                style={{ width: `${(agent.attributes.speed / 10) * 100}%` }}
              ></div>
            </div>
          </motion.div>
          
          <motion.div 
            className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-purple-500 bg-opacity-20 flex items-center justify-center mr-4">
                <FaBrain className="text-purple-400 text-xl" />
              </div>
              <div>
                <h3 className="text-gray-400 text-sm">Intelligence</h3>
                <p className="text-2xl font-bold text-white">{agent.attributes.intelligence}</p>
              </div>
            </div>
            <div className="mt-4 bg-gray-700 w-full h-2 rounded-full overflow-hidden">
              <div 
                className="bg-purple-500 h-full" 
                style={{ width: `${(agent.attributes.intelligence / 10) * 100}%` }}
              ></div>
            </div>
          </motion.div>
          
          <motion.div 
            className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-green-500 bg-opacity-20 flex items-center justify-center mr-4">
                <FaShieldAlt className="text-green-400 text-xl" />
              </div>
              <div>
                <h3 className="text-gray-400 text-sm">Defense</h3>
                <p className="text-2xl font-bold text-white">{agent.attributes.defense}</p>
              </div>
            </div>
            <div className="mt-4 bg-gray-700 w-full h-2 rounded-full overflow-hidden">
              <div 
                className="bg-green-500 h-full" 
                style={{ width: `${(agent.attributes.defense / 10) * 100}%` }}
              ></div>
            </div>
          </motion.div>
          
          <motion.div 
            className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-yellow-500 bg-opacity-20 flex items-center justify-center mr-4">
                <FaChessKnight className="text-yellow-400 text-xl" />
              </div>
              <div>
                <h3 className="text-gray-400 text-sm">Strategy</h3>
                <p className="text-2xl font-bold text-white">{agent.attributes.strategy}</p>
              </div>
            </div>
            <div className="mt-4 bg-gray-700 w-full h-2 rounded-full overflow-hidden">
              <div 
                className="bg-yellow-500 h-full" 
                style={{ width: `${(agent.attributes.strategy / 10) * 100}%` }}
              ></div>
            </div>
          </motion.div>
        </div>
        
        {/* Tabs */}
        <div className="border-b border-gray-700 mb-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setSelectedTab("stats")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                selectedTab === "stats"
                  ? "border-squid-pink text-squid-pink"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              Statistics
            </button>
            <button
              onClick={() => setSelectedTab("badges")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                selectedTab === "badges"
                  ? "border-squid-pink text-squid-pink"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              Badges & Achievements
            </button>
            <button
              onClick={() => setSelectedTab("history")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                selectedTab === "history"
                  ? "border-squid-pink text-squid-pink"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              Game History
            </button>
          </div>
        </div>
        
        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {selectedTab === "stats" && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700"
            >
              <h2 className="text-xl font-bold text-white mb-6">Agent Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Performance</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Games Played</span>
                      <span className="text-white font-medium">{15 + Math.floor(agent.level * 2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Win Rate</span>
                      <span className="text-white font-medium">{60 + Math.floor(agent.level * 1.5)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Longest Win Streak</span>
                      <span className="text-white font-medium">{3 + Math.floor(agent.level * 0.3)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Tournaments Entered</span>
                      <span className="text-white font-medium">{Math.floor(agent.level * 0.3)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Best Tournament Finish</span>
                      <span className="text-white font-medium">
                        {agent.level >= 8 ? "1st Place" : agent.level >= 5 ? "3rd Place" : "Participant"}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Game Success Rates</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-300">Red Light, Green Light</span>
                        <span className="text-white font-medium">{75 + Math.min(20, agent.attributes.speed * 2)}%</span>
                      </div>
                      <div className="bg-gray-700 w-full h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-squid-pink h-full" 
                          style={{ width: `${75 + Math.min(20, agent.attributes.speed * 2)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-300">Tug of War</span>
                        <span className="text-white font-medium">{60 + Math.min(35, agent.attributes.defense * 3)}%</span>
                      </div>
                      <div className="bg-gray-700 w-full h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-squid-pink h-full" 
                          style={{ width: `${60 + Math.min(35, agent.attributes.defense * 3)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-300">Marbles</span>
                        <span className="text-white font-medium">{50 + Math.min(45, agent.attributes.intelligence * 4)}%</span>
                      </div>
                      <div className="bg-gray-700 w-full h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-squid-pink h-full" 
                          style={{ width: `${50 + Math.min(45, agent.attributes.intelligence * 4)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-300">Glass Bridge</span>
                        <span className="text-white font-medium">{40 + Math.min(55, agent.attributes.strategy * 5)}%</span>
                      </div>
                      <div className="bg-gray-700 w-full h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-squid-pink h-full" 
                          style={{ width: `${40 + Math.min(55, agent.attributes.strategy * 5)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          
          {selectedTab === "badges" && (
            <motion.div
              key="badges"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700"
            >
              <h2 className="text-xl font-bold text-white mb-6">Badges & Achievements</h2>
              
              {earnedBadges.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {earnedBadges.map(badge => (
                    <motion.div
                      key={badge.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: badge.id * 0.1 }}
                      className="bg-gray-700 rounded-lg p-6 shadow-md border border-gray-600 text-center"
                    >
                      <div className="w-16 h-16 mx-auto bg-gray-800 rounded-full flex items-center justify-center mb-4 shadow-lg">
                        {badge.icon}
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-1">{badge.name}</h3>
                      <p className="text-gray-300 text-sm">{badge.description}</p>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FaTrophy className="text-gray-600 text-5xl mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Badges Yet</h3>
                  <p className="text-gray-400">
                    Continue training and playing games to earn badges and achievements.
                  </p>
                </div>
              )}
              
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-white mb-4">Locked Badges</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {badges
                    .filter(badge => !earnedBadges.includes(badge))
                    .map(badge => (
                      <div
                        key={badge.id}
                        className="bg-gray-700 rounded-lg p-6 shadow-md border border-gray-600 text-center opacity-60"
                      >
                        <div className="w-16 h-16 mx-auto bg-gray-800 rounded-full flex items-center justify-center mb-4 filter grayscale">
                          {badge.icon}
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-1">{badge.name}</h3>
                        <p className="text-gray-300 text-sm">{badge.description}</p>
                        <div className="mt-2 bg-gray-600 text-xs text-white px-2 py-1 rounded inline-block">
                          Locked
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </motion.div>
          )}
          
          {selectedTab === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700"
            >
              <h2 className="text-xl font-bold text-white mb-6">Game & Tournament History</h2>
              
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <FaGamepad className="mr-2" /> Recent Games
                </h3>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-700">
                        <th className="px-4 py-3 text-left text-gray-300 font-medium">Game</th>
                        <th className="px-4 py-3 text-left text-gray-300 font-medium">Result</th>
                        <th className="px-4 py-3 text-left text-gray-300 font-medium">Date</th>
                        <th className="px-4 py-3 text-left text-gray-300 font-medium">Reward</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {gameHistory.map(game => (
                        <tr key={game.id} className="hover:bg-gray-700 transition duration-150">
                          <td className="px-4 py-3 text-white">{game.game}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              game.result === "Won" ? "bg-green-500 bg-opacity-20 text-green-400" : "bg-red-500 bg-opacity-20 text-red-400"
                            }`}>
                              {game.result}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-300">{formatDate(game.date)}</td>
                          <td className="px-4 py-3 text-gray-300">{game.reward}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-4 text-center">
                  <Link
                    href="/profile/game-history"
                    className="text-squid-pink hover:text-pink-400 text-sm font-medium"
                  >
                    View Full Game History
                  </Link>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <FaTrophy className="mr-2" /> Tournament History
                </h3>
                
                {tournamentHistory.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-gray-700">
                          <th className="px-4 py-3 text-left text-gray-300 font-medium">Tournament Name</th>
                          <th className="px-4 py-3 text-left text-gray-300 font-medium">Placement</th>
                          <th className="px-4 py-3 text-left text-gray-300 font-medium">Date</th>
                          <th className="px-4 py-3 text-left text-gray-300 font-medium">Reward</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {tournamentHistory.map(tournament => (
                          <tr key={tournament.id} className="hover:bg-gray-700 transition duration-150">
                            <td className="px-4 py-3 text-white">{tournament.name}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                tournament.placement.includes("1st") 
                                  ? "bg-yellow-500 bg-opacity-20 text-yellow-400" 
                                  : tournament.placement.includes("2nd")
                                    ? "bg-gray-400 bg-opacity-20 text-gray-300"
                                    : tournament.placement.includes("3rd")
                                      ? "bg-amber-600 bg-opacity-20 text-amber-500"
                                      : "bg-blue-500 bg-opacity-20 text-blue-400"
                              }`}>
                                {tournament.placement}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-300">{formatDate(tournament.date)}</td>
                            <td className="px-4 py-3 text-gray-300">{tournament.reward}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-700 rounded-lg">
                    <FaHistory className="text-gray-500 text-4xl mx-auto mb-3" />
                    <h4 className="text-white font-medium mb-1">No Tournament History</h4>
                    <p className="text-gray-400 text-sm">
                      Enter tournaments to build your history and earn rewards.
                    </p>
                  </div>
                )}
                
                <div className="mt-4 text-center">
                  <Link
                    href="/tournament"
                    className="text-squid-pink hover:text-pink-400 text-sm font-medium"
                  >
                    View Available Tournaments
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
} 