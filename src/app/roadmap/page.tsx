"use client";

import { motion } from "framer-motion";
import { 
  FaRocket, 
  FaGamepad, 
  FaUsers, 
  FaGlobe, 
  FaVrCardboard, 
  FaChartLine,
  FaArrowRight,
  FaCheckCircle
} from "react-icons/fa";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { MetaverseVision } from "@/components/roadmap/MetaverseVision";
import { BlockchainIntegration } from "@/components/roadmap/BlockchainIntegration";

// Phase type definition
type Phase = {
  id: string;
  number: number;
  title: string;
  timeframe: string;
  description: string;
  features: string[];
  icon: React.ReactNode;
  color: string;
  status: "completed" | "current" | "upcoming";
};

export default function RoadmapPage() {
  // Roadmap phases
  const phases: Phase[] = [
    {
      id: "phase-1",
      number: 1,
      title: "Foundation & Core Gameplay",
      timeframe: "Q2 2023 - Hackathon Release",
      description: 
        "Launch of the initial platform with core mini-games and basic blockchain integration on Aptos testnet.",
      features: [
        "Initial mini-games: Simon Says, Red Light Green Light, Rock Paper Scissors",
        "Basic Aptos wallet integration",
        "Virtual escrow contracts for game rewards",
        "Socket server for multiplayer functionality",
        "Tournament lobby system"
      ],
      icon: <FaRocket className="text-3xl" />,
      color: "bg-squid-pink",
      status: "completed"
    },
    {
      id: "phase-2",
      number: 2,
      title: "Enhanced Gameplay & Economics",
      timeframe: "Q3 2023",
      description: 
        "Expansion of game variety, improved tokenomics, and deeper blockchain integration with real rewards.",
      features: [
        "Additional mini-games: Tug of War, Marbles, Glass Bridge",
        "Character customization and progression system",
        "Fully implemented smart contracts for all games",
        "Enhanced matchmaking algorithm",
        "In-game NFT collectibles for achievements"
      ],
      icon: <FaGamepad className="text-3xl" />,
      color: "bg-indigo-600",
      status: "current"
    },
    {
      id: "phase-3",
      number: 3,
      title: "Social & Community Features",
      timeframe: "Q4 2023",
      description: 
        "Building a thriving community with social features, governance, and competitive leagues.",
      features: [
        "Guild/team system for collaborative play",
        "Seasonal tournaments with significant prize pools",
        "Community governance for tournament rules",
        "Spectator mode for watching high-stakes games",
        "Creator tools for community-made challenges"
      ],
      icon: <FaUsers className="text-3xl" />,
      color: "bg-blue-600",
      status: "upcoming"
    },
    {
      id: "phase-4",
      number: 4,
      title: "Metaverse Integration",
      timeframe: "Q1-Q2 2024",
      description: 
        "Creating an immersive 3D world for the Squid Game experience with virtual avatars and environments.",
      features: [
        "3D game environments mimicking the Squid Game arenas",
        "Full-body avatars with motion-based gameplay",
        "Voice chat for team coordination",
        "VR support for compatible headsets",
        "Interactive spectating in the metaverse arena"
      ],
      icon: <FaVrCardboard className="text-3xl" />,
      color: "bg-purple-600",
      status: "upcoming"
    },
    {
      id: "phase-5",
      number: 5,
      title: "Global Expansion & Mainstream Adoption",
      timeframe: "Q3-Q4 2024",
      description: 
        "Scaling the platform for global reach with professional esports integration and mainstream partnerships.",
      features: [
        "Mobile applications for iOS and Android",
        "Professional esports leagues and tournaments",
        "Celebrity and brand partnerships",
        "Cross-chain functionality",
        "Real-world events and competitions"
      ],
      icon: <FaGlobe className="text-3xl" />,
      color: "bg-green-600",
      status: "upcoming"
    },
  ];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="container mx-auto py-12 px-4 md:px-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl md:text-5xl font-bold text-squid-pink mb-4">
          Project Roadmap
        </h1>
        <p className="text-xl text-gray-700 dark:text-gray-300 max-w-3xl mx-auto">
          Our vision for the future of AI Deathmatch: The Squid Game Tournament. From hackathon project to global metaverse competition.
        </p>
      </motion.div>

      {/* Timeline visualization */}
      <div className="relative mb-20 overflow-hidden">
        <div className="absolute top-1/2 left-0 w-full h-2 bg-gray-200 dark:bg-gray-700 -translate-y-1/2"></div>
        <div className="flex justify-between relative max-w-5xl mx-auto">
          {phases.map((phase) => (
            <motion.div
              key={`timeline-${phase.id}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: phase.number * 0.2 }}
              className="relative"
            >
              <div 
                className={cn(
                  "w-8 h-8 md:w-12 md:h-12 rounded-full flex items-center justify-center z-10 relative",
                  phase.status === "completed" ? "bg-green-500" : 
                  phase.status === "current" ? phase.color : 
                  "bg-gray-400 dark:bg-gray-600"
                )}
              >
                {phase.status === "completed" ? (
                  <FaCheckCircle className="text-white text-lg md:text-xl" />
                ) : (
                  <span className="text-white font-bold text-sm md:text-lg">{phase.number}</span>
                )}
              </div>
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs md:text-sm font-medium">
                {phase.timeframe}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-12"
      >
        {phases.map((phase) => (
          <motion.div
            key={phase.id}
            variants={itemVariants}
            className={cn(
              "border-l-4 rounded-lg shadow-lg overflow-hidden",
              phase.status === "completed" ? "border-green-500" :
              phase.status === "current" ? `border-${phase.color.split('-')[1]}` :
              "border-gray-300 dark:border-gray-700"
            )}
          >
            <div className="bg-white dark:bg-squid-dark p-8">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className={`${phase.color} p-4 rounded-full flex items-center justify-center self-start`}>
                  {phase.icon}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-4 mb-2">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Phase {phase.number}</h2>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-xs font-semibold",
                      phase.status === "completed" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" :
                      phase.status === "current" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100" :
                      "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                    )}>
                      {phase.status.charAt(0).toUpperCase() + phase.status.slice(1)}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 text-sm">{phase.timeframe}</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-3">{phase.title}</h3>
                  <p className="text-gray-700 dark:text-gray-300 mb-6">
                    {phase.description}
                  </p>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-3">Key Features:</h4>
                    <ul className="space-y-2">
                      {phase.features.map((feature, index) => (
                        <li key={index} className="flex items-start">
                          <FaArrowRight className="text-squid-pink mt-1 mr-2 flex-shrink-0" />
                          <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Blockchain Integration Section */}
      <div className="mt-20 mb-20">
        <BlockchainIntegration />
      </div>

      {/* Metaverse Vision Section */}
      <div className="mt-20 mb-20">
        <MetaverseVision />
      </div>

      {/* Investment opportunity section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="mt-20 bg-gradient-to-r from-squid-pink to-purple-600 rounded-xl p-8 text-white"
      >
        <div className="max-w-3xl mx-auto text-center">
          <FaChartLine className="text-5xl mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">Investment Opportunity</h2>
          <p className="text-lg mb-6">
            We're seeking strategic partners and investors to help bring this vision to life. 
            The Squid Game Tournament platform represents a unique opportunity at the intersection 
            of gaming, blockchain, and metaverse technologies.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <h3 className="font-bold text-xl mb-2">$3.2B</h3>
              <p className="text-sm">Projected Market Size for Play-to-Earn by 2025</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <h3 className="font-bold text-xl mb-2">500K+</h3>
              <p className="text-sm">Projected Active Users by End of Phase 4</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <h3 className="font-bold text-xl mb-2">5M+</h3>
              <p className="text-sm">Projected Daily Transactions on Full Deployment</p>
            </div>
          </div>
          <Link 
            href="/contact"
            className="bg-white text-squid-pink px-8 py-3 rounded-md font-bold hover:bg-opacity-90 transition-colors inline-block"
          >
            Contact for Investment
          </Link>
        </div>
      </motion.div>

      <div className="mt-16 bg-gray-100 dark:bg-gray-800 rounded-xl p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Join Us On This Journey</h2>
        <p className="text-gray-700 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
          Be part of the Squid Game Tournament from the beginning. Play our games, provide feedback, 
          and help shape the future of blockchain gaming.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link 
            href="/"
            className="bg-squid-pink text-white px-6 py-3 rounded-md font-bold hover:bg-opacity-90 transition-colors"
          >
            Return Home
          </Link>
          <Link 
            href="/game"
            className="bg-gray-700 text-white px-6 py-3 rounded-md font-bold hover:bg-opacity-90 transition-colors"
          >
            Try Games Now
          </Link>
        </div>
      </div>
    </div>
  );
} 