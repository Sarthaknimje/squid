"use client";

import { motion } from "framer-motion";
import { FaRobot, FaGamepad, FaTrophy, FaUserAlt, FaMedal } from "react-icons/fa";
import Link from "next/link";

// Guide step type
type GuideStep = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  link: {
    url: string;
    text: string;
  };
  color: string;
};

export default function GuidePage() {
  // Guide steps
  const steps: GuideStep[] = [
    {
      id: "create-agent",
      title: "Create Your AI Agent",
      description: 
        "Start by creating your AI agent. Give it a name and choose its initial attributes. This agent will compete in the Squid Game tournament on your behalf.",
      icon: <FaRobot className="text-3xl" />,
      link: {
        url: "/train",
        text: "Create Agent"
      },
      color: "bg-blue-500"
    },
    {
      id: "train-agent",
      title: "Train Your Agent",
      description: 
        "Train your AI agent to improve its abilities. Spend training points to enhance specific attributes like strength, intelligence, and speed.",
      icon: <FaRobot className="text-3xl" />,
      link: {
        url: "/train",
        text: "Train Agent"
      },
      color: "bg-green-500"
    },
    {
      id: "play-games",
      title: "Complete Individual Games",
      description: 
        "Have your agent compete in individual games to gain experience and earn points. Start with easier games like Red Light, Green Light before advancing to more challenging ones.",
      icon: <FaGamepad className="text-3xl" />,
      link: {
        url: "/game",
        text: "Play Games"
      },
      color: "bg-purple-500"
    },
    {
      id: "check-progress",
      title: "Track Your Progress",
      description: 
        "Visit your profile to see your game history, achievements, and overall stats. Monitor your agent's performance and identify areas for improvement.",
      icon: <FaUserAlt className="text-3xl" />,
      link: {
        url: "/profile",
        text: "View Profile"
      },
      color: "bg-yellow-500"
    },
    {
      id: "join-tournament",
      title: "Join Tournaments",
      description: 
        "Enter your agent into tournaments to compete against other players' agents. Win tournaments to earn APTOS tokens and exclusive rewards.",
      icon: <FaTrophy className="text-3xl" />,
      link: {
        url: "/tournament",
        text: "Join Tournament"
      },
      color: "bg-red-500"
    },
    {
      id: "earn-achievements",
      title: "Unlock Achievements",
      description: 
        "Complete special challenges to earn achievements. These range from winning your first game to completing a perfect run of all games in sequence.",
      icon: <FaMedal className="text-3xl" />,
      link: {
        url: "/profile",
        text: "View Achievements"
      },
      color: "bg-indigo-500"
    },
  ];

  // Variants for animations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
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
          Quick Start Guide
        </h1>
        <p className="text-xl text-gray-700 dark:text-gray-300 max-w-3xl mx-auto">
          Welcome to AI Deathmatch: Squid Game Tournament! Follow these steps to get started on your journey to becoming the ultimate champion.
        </p>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        {steps.map((step, index) => (
          <motion.div
            key={step.id}
            variants={itemVariants}
            className="bg-white dark:bg-squid-dark rounded-lg shadow-lg overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-4">
              <div className={`${step.color} p-8 flex items-center justify-center`}>
                <div className="bg-white rounded-full p-4 text-gray-800">
                  {step.icon}
                </div>
              </div>
              <div className="p-8 md:col-span-3">
                <div className="flex items-center mb-4">
                  <span className="bg-squid-pink text-white text-lg font-bold w-8 h-8 rounded-full flex items-center justify-center mr-3">
                    {index + 1}
                  </span>
                  <h2 className="text-2xl font-bold">{step.title}</h2>
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-6">
                  {step.description}
                </p>
                <Link 
                  href={step.link.url}
                  className="bg-squid-pink text-white px-6 py-2 rounded-md font-medium hover:bg-opacity-90 transition-colors inline-flex items-center"
                >
                  {step.link.text}
                </Link>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="mt-16 bg-gray-100 dark:bg-gray-800 rounded-xl p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Need More Help?</h2>
        <p className="text-gray-700 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
          Explore our detailed documentation for more information about game rules, agent training strategies, and tournament mechanics.
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
            Start Playing
          </Link>
        </div>
      </div>
    </div>
  );
} 