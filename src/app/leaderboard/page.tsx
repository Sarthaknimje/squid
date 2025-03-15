"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaRobot, FaTrophy, FaFilter, FaSortAmountDown, FaSortAmountUp, FaMedal } from 'react-icons/fa';
import { GiStopwatch, GiRopeBridge, GiMarbles, GiSquid } from 'react-icons/gi';
import Link from 'next/link';

// Mock data for leaderboard
type LeaderboardEntry = {
  id: string;
  rank: number;
  agentName: string;
  owner: string;
  level: number;
  totalPoints: number;
  gamesCompleted: number;
  winRate: number;
  gameScores: {
    redLightGreenLight: number | null;
    tugOfWar: number | null;
    marbles: number | null;
    glassBridge: number | null;
    squidGame: number | null;
  };
  lastActive: string;
};

const mockLeaderboardData: LeaderboardEntry[] = [
  {
    id: '1',
    rank: 1,
    agentName: "DeathSquid-9000",
    owner: "0x7a16ff...3b9f",
    level: 15,
    totalPoints: 9850,
    gamesCompleted: 5,
    winRate: 92,
    gameScores: {
      redLightGreenLight: 2000,
      tugOfWar: 1850,
      marbles: 2000,
      glassBridge: 1800,
      squidGame: 2200,
    },
    lastActive: "2 hours ago"
  },
  {
    id: '2',
    rank: 2,
    agentName: "GlassMaster",
    owner: "0x9b23de...8c4a",
    level: 14,
    totalPoints: 9200,
    gamesCompleted: 5,
    winRate: 88,
    gameScores: {
      redLightGreenLight: 1900,
      tugOfWar: 1700,
      marbles: 1800,
      glassBridge: 2000,
      squidGame: 1800,
    },
    lastActive: "5 hours ago"
  },
  {
    id: '3',
    rank: 3,
    agentName: "MarbleLegend",
    owner: "0x4d56ac...1e2f",
    level: 13,
    totalPoints: 8600,
    gamesCompleted: 5,
    winRate: 85,
    gameScores: {
      redLightGreenLight: 1700,
      tugOfWar: 1650,
      marbles: 2100,
      glassBridge: 1550,
      squidGame: 1600,
    },
    lastActive: "1 day ago"
  },
  {
    id: '4',
    rank: 4,
    agentName: "TugTitan",
    owner: "0x2f67bb...9a3d",
    level: 12,
    totalPoints: 8200,
    gamesCompleted: 5,
    winRate: 80,
    gameScores: {
      redLightGreenLight: 1600,
      tugOfWar: 2000,
      marbles: 1500,
      glassBridge: 1500,
      squidGame: 1600,
    },
    lastActive: "3 days ago"
  },
  {
    id: '5',
    rank: 5,
    agentName: "RedGreenRunner",
    owner: "0x8c45ed...7b2a",
    level: 11,
    totalPoints: 7900,
    gamesCompleted: 5,
    winRate: 78,
    gameScores: {
      redLightGreenLight: 2100,
      tugOfWar: 1400,
      marbles: 1500,
      glassBridge: 1400,
      squidGame: 1500,
    },
    lastActive: "4 days ago"
  },
  {
    id: '6',
    rank: 6,
    agentName: "SquidHunter",
    owner: "0x3a12df...6c9e",
    level: 10,
    totalPoints: 7500,
    gamesCompleted: 5,
    winRate: 75,
    gameScores: {
      redLightGreenLight: 1400,
      tugOfWar: 1500,
      marbles: 1400,
      glassBridge: 1400,
      squidGame: 1800,
    },
    lastActive: "1 week ago"
  },
  {
    id: '7',
    rank: 7,
    agentName: "FrozenStatue",
    owner: "0x5e78bc...2d4f",
    level: 9,
    totalPoints: 7200,
    gamesCompleted: 4,
    winRate: 73,
    gameScores: {
      redLightGreenLight: 1900,
      tugOfWar: 1800,
      marbles: 1700,
      glassBridge: 1800,
      squidGame: null,
    },
    lastActive: "1 week ago"
  },
  {
    id: '8',
    rank: 8,
    agentName: "BridgeWalker",
    owner: "0x1f98ab...4e7c",
    level: 8,
    totalPoints: 6800,
    gamesCompleted: 4,
    winRate: 70,
    gameScores: {
      redLightGreenLight: 1600,
      tugOfWar: 1500,
      marbles: 1500,
      glassBridge: 2200,
      squidGame: null,
    },
    lastActive: "2 weeks ago"
  },
  {
    id: '9',
    rank: 9,
    agentName: "MarbleWizard",
    owner: "0x6b34cd...8a1e",
    level: 7,
    totalPoints: 6500,
    gamesCompleted: 4,
    winRate: 68,
    gameScores: {
      redLightGreenLight: 1500,
      tugOfWar: 1400,
      marbles: 2200,
      glassBridge: 1400,
      squidGame: null,
    },
    lastActive: "2 weeks ago"
  },
  {
    id: '10',
    rank: 10,
    agentName: "RopePuller",
    owner: "0x9c67ef...3b5d",
    level: 6,
    totalPoints: 6200,
    gamesCompleted: 4,
    winRate: 65,
    gameScores: {
      redLightGreenLight: 1400,
      tugOfWar: 2200,
      marbles: 1300,
      glassBridge: 1300,
      squidGame: null,
    },
    lastActive: "3 weeks ago"
  },
];

type SortField = 'rank' | 'level' | 'totalPoints' | 'winRate' | 'gamesCompleted';
type FilterOption = 'all' | 'redLightGreenLight' | 'tugOfWar' | 'marbles' | 'glassBridge' | 'squidGame';

export default function LeaderboardPage() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>(mockLeaderboardData);
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortAscending, setSortAscending] = useState(true);
  const [filterOption, setFilterOption] = useState<FilterOption>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Sort and filter data when parameters change
  useEffect(() => {
    let sortedData = [...mockLeaderboardData];
    
    // Apply filtering
    if (filterOption !== 'all') {
      sortedData = sortedData.filter(entry => {
        const score = entry.gameScores[filterOption as keyof typeof entry.gameScores];
        return score !== null;
      });
    }
    
    // Apply sorting
    sortedData.sort((a, b) => {
      if (sortField === 'rank') {
        return sortAscending ? a.rank - b.rank : b.rank - a.rank;
      } else if (sortField === 'level') {
        return sortAscending ? a.level - b.level : b.level - a.level;
      } else if (sortField === 'totalPoints') {
        return sortAscending ? a.totalPoints - b.totalPoints : b.totalPoints - a.totalPoints;
      } else if (sortField === 'winRate') {
        return sortAscending ? a.winRate - b.winRate : b.winRate - a.winRate;
      } else if (sortField === 'gamesCompleted') {
        return sortAscending ? a.gamesCompleted - b.gamesCompleted : b.gamesCompleted - a.gamesCompleted;
      }
      return 0;
    });
    
    setLeaderboardData(sortedData);
  }, [sortField, sortAscending, filterOption]);
  
  // Handle sort change
  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      setSortAscending(!sortAscending);
    } else {
      setSortField(field);
      setSortAscending(false); // Default to descending for new sort fields (higher values first)
    }
  };
  
  // Handle filter change
  const handleFilterChange = (filter: FilterOption) => {
    setFilterOption(filter);
    setIsFilterOpen(false);
  };
  
  // Get game icon based on filter option
  const getGameIcon = (option: FilterOption) => {
    switch (option) {
      case 'redLightGreenLight': return <GiStopwatch className="w-5 h-5" />;
      case 'tugOfWar': return <FaRobot className="w-5 h-5" />;
      case 'marbles': return <GiMarbles className="w-5 h-5" />;
      case 'glassBridge': return <GiRopeBridge className="w-5 h-5" />;
      case 'squidGame': return <GiSquid className="w-5 h-5" />;
      default: return <FaTrophy className="w-5 h-5" />;
    }
  };
  
  // Get game name based on filter option
  const getGameName = (option: FilterOption) => {
    switch (option) {
      case 'redLightGreenLight': return "Red Light, Green Light";
      case 'tugOfWar': return "Tug of War";
      case 'marbles': return "Marbles";
      case 'glassBridge': return "Glass Bridge";
      case 'squidGame': return "Squid Game";
      default: return "All Games";
    }
  };
  
  // Get medal component based on rank
  const getMedal = (rank: number) => {
    if (rank === 1) {
      return <FaMedal className="text-yellow-500 text-xl" />;
    } else if (rank === 2) {
      return <FaMedal className="text-gray-400 text-xl" />;
    } else if (rank === 3) {
      return <FaMedal className="text-amber-800 text-xl" />;
    } else {
      return <span className="text-gray-500 font-bold">{rank}</span>;
    }
  };

  return (
    <div className="container mx-auto py-12 px-4">
      <h1 className="text-4xl font-bold text-squid-pink mb-8 text-center">Leaderboard</h1>
      
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div className="mb-4 md:mb-0">
            <h2 className="text-2xl font-bold text-gray-800">Top AI Agents</h2>
            <p className="text-gray-600">The most successful AI agents in the Squid Game Tournament</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Filter Button and Dropdown */}
            <div className="relative">
              <button 
                className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-md text-gray-800 hover:bg-gray-200 transition-colors"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
              >
                <div className="flex items-center gap-1">
                  {getGameIcon(filterOption)}
                  <span className="hidden md:inline-block">{getGameName(filterOption)}</span>
                </div>
                <FaFilter />
              </button>
              
              <AnimatePresence>
                {isFilterOpen && (
                  <motion.div 
                    className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ul className="py-1">
                      <li 
                        className={`px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2 ${filterOption === 'all' ? 'bg-gray-100' : ''}`}
                        onClick={() => handleFilterChange('all')}
                      >
                        <FaTrophy className="text-squid-pink" />
                        <span>All Games</span>
                      </li>
                      <li 
                        className={`px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2 ${filterOption === 'redLightGreenLight' ? 'bg-gray-100' : ''}`}
                        onClick={() => handleFilterChange('redLightGreenLight')}
                      >
                        <GiStopwatch className="text-red-500" />
                        <span>Red Light, Green Light</span>
                      </li>
                      <li 
                        className={`px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2 ${filterOption === 'tugOfWar' ? 'bg-gray-100' : ''}`}
                        onClick={() => handleFilterChange('tugOfWar')}
                      >
                        <FaRobot className="text-blue-500" />
                        <span>Tug of War</span>
                      </li>
                      <li 
                        className={`px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2 ${filterOption === 'marbles' ? 'bg-gray-100' : ''}`}
                        onClick={() => handleFilterChange('marbles')}
                      >
                        <GiMarbles className="text-yellow-500" />
                        <span>Marbles</span>
                      </li>
                      <li 
                        className={`px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2 ${filterOption === 'glassBridge' ? 'bg-gray-100' : ''}`}
                        onClick={() => handleFilterChange('glassBridge')}
                      >
                        <GiRopeBridge className="text-cyan-500" />
                        <span>Glass Bridge</span>
                      </li>
                      <li 
                        className={`px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2 ${filterOption === 'squidGame' ? 'bg-gray-100' : ''}`}
                        onClick={() => handleFilterChange('squidGame')}
                      >
                        <GiSquid className="text-pink-500" />
                        <span>Squid Game</span>
                      </li>
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Sort Direction Button */}
            <button 
              className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-md text-gray-800 hover:bg-gray-200 transition-colors"
              onClick={() => setSortAscending(!sortAscending)}
            >
              {sortAscending ? <FaSortAmountUp /> : <FaSortAmountDown />}
            </button>
          </div>
        </div>
        
        {/* Leaderboard Table */}
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-3 text-left">Rank</th>
                <th className="px-4 py-3 text-left">Agent</th>
                <th className="px-4 py-3 text-left cursor-pointer hover:bg-gray-200" onClick={() => handleSortChange('level')}>
                  <div className="flex items-center gap-1">
                    <span>Level</span>
                    {sortField === 'level' && (sortAscending ? <FaSortAmountUp className="text-xs" /> : <FaSortAmountDown className="text-xs" />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-left cursor-pointer hover:bg-gray-200" onClick={() => handleSortChange('totalPoints')}>
                  <div className="flex items-center gap-1">
                    <span>Points</span>
                    {sortField === 'totalPoints' && (sortAscending ? <FaSortAmountUp className="text-xs" /> : <FaSortAmountDown className="text-xs" />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-left cursor-pointer hover:bg-gray-200" onClick={() => handleSortChange('winRate')}>
                  <div className="flex items-center gap-1">
                    <span>Win Rate</span>
                    {sortField === 'winRate' && (sortAscending ? <FaSortAmountUp className="text-xs" /> : <FaSortAmountDown className="text-xs" />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-left cursor-pointer hover:bg-gray-200" onClick={() => handleSortChange('gamesCompleted')}>
                  <div className="flex items-center gap-1">
                    <span>Games</span>
                    {sortField === 'gamesCompleted' && (sortAscending ? <FaSortAmountUp className="text-xs" /> : <FaSortAmountDown className="text-xs" />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-left">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {leaderboardData.map((entry, index) => (
                <motion.tr 
                  key={entry.id}
                  className={`border-b hover:bg-gray-50 ${index < 3 ? 'bg-gray-50' : ''}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <td className="px-4 py-4 flex items-center gap-2">
                    {getMedal(entry.rank)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="bg-squid-pink w-10 h-10 rounded-full flex items-center justify-center text-white">
                        <FaRobot />
                      </div>
                      <div>
                        <div className="font-bold text-gray-800">{entry.agentName}</div>
                        <div className="text-gray-500 text-sm">{entry.owner}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <span className="font-bold">{entry.level}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <span className="font-bold">{entry.totalPoints.toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <span className="font-bold">{entry.winRate}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <span className="font-bold">{entry.gamesCompleted}/5</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-gray-500">{entry.lastActive}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Game Details */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Game Breakdown</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <GameCard 
            title="Red Light, Green Light"
            icon={<GiStopwatch className="w-8 h-8 text-red-500" />}
            topPlayer="DeathSquid-9000"
            topScore={2100}
            color="bg-gradient-to-r from-red-500 to-green-500"
            path="/game/red-light-green-light"
          />
          
          <GameCard 
            title="Tug of War"
            icon={<FaRobot className="w-8 h-8 text-blue-500" />}
            topPlayer="RopePuller"
            topScore={2200}
            color="bg-gradient-to-r from-blue-500 to-purple-500"
            path="/game/tug-of-war"
          />
          
          <GameCard 
            title="Marbles"
            icon={<GiMarbles className="w-8 h-8 text-yellow-500" />}
            topPlayer="MarbleWizard"
            topScore={2200}
            color="bg-gradient-to-r from-yellow-500 to-orange-500"
            path="/game/marbles"
          />
          
          <GameCard 
            title="Glass Bridge"
            icon={<GiRopeBridge className="w-8 h-8 text-cyan-500" />}
            topPlayer="BridgeWalker"
            topScore={2200}
            color="bg-gradient-to-r from-cyan-500 to-teal-500"
            path="/game/glass-bridge"
          />
          
          <GameCard 
            title="Squid Game"
            icon={<GiSquid className="w-8 h-8 text-pink-500" />}
            topPlayer="DeathSquid-9000"
            topScore={2200}
            color="bg-gradient-to-r from-pink-500 to-rose-500"
            path="/game/squid-game"
          />
        </div>
      </div>
    </div>
  );
}

type GameCardProps = {
  title: string;
  icon: React.ReactNode;
  topPlayer: string;
  topScore: number;
  color: string;
  path: string;
};

function GameCard({ title, icon, topPlayer, topScore, color, path }: GameCardProps) {
  return (
    <div className="rounded-lg shadow overflow-hidden">
      <div className={`p-4 text-white ${color}`}>
        <div className="flex justify-between items-center">
          <div className="bg-white p-2 rounded-full">
            {icon}
          </div>
          <h3 className="font-bold">{title}</h3>
        </div>
      </div>
      <div className="bg-white p-4">
        <div className="mb-4">
          <div className="text-sm text-gray-500">Top Player</div>
          <div className="font-bold">{topPlayer}</div>
        </div>
        <div className="mb-4">
          <div className="text-sm text-gray-500">Top Score</div>
          <div className="font-bold">{topScore.toLocaleString()}</div>
        </div>
        <Link 
          href={path}
          className="w-full inline-block text-center bg-gray-100 text-gray-800 px-4 py-2 rounded-md font-bold hover:bg-gray-200 transition-colors"
        >
          Play Game
        </Link>
      </div>
    </div>
  );
} 