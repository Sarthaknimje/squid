"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAIAgent } from "@/contexts/AIAgentContext";
import BotIcon from "@/components/ui/BotIcon";
import { FaBrain, FaRunning, FaShieldAlt, FaChessKnight, FaTrophy, FaBolt, FaCheck } from "react-icons/fa";
import AgentStats from "@/components/game/AgentStats";

// Training exercise type
type TrainingExercise = {
  id: string;
  name: string;
  attribute: keyof typeof AttributeIcon;
  description: string;
  duration: number; // in seconds
  improvement: number; // attribute points gained
  energy: number; // energy cost
  icon: React.ReactNode;
};

// Attribute icons mapping
const AttributeIcon = {
  Intelligence: <FaBrain className="text-blue-400" />,
  Speed: <FaRunning className="text-yellow-400" />,
  Defense: <FaShieldAlt className="text-red-400" />,
  Strategy: <FaChessKnight className="text-green-400" />,
};

export default function TrainPage() {
  const { agent, updateAgentAttribute } = useAIAgent();
  const [activeExercise, setActiveExercise] = useState<TrainingExercise | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [energy, setEnergy] = useState(100);
  const [showSuccess, setShowSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(false);

  // Training exercises
  const trainingExercises: TrainingExercise[] = [
    {
      id: "puzzle-solving",
      name: "Neural Puzzle Solving",
      attribute: "Intelligence",
      description: "Enhance cognitive abilities through complex puzzle-solving simulations.",
      duration: 10,
      improvement: 3,
      energy: 20,
      icon: <FaBrain className="text-3xl" />,
    },
    {
      id: "reflex-training",
      name: "Reaction Time Training",
      attribute: "Speed",
      description: "Improve response times with high-frequency stimulus training.",
      duration: 8,
      improvement: 2,
      energy: 15,
      icon: <FaRunning className="text-3xl" />,
    },
    {
      id: "defense-scenarios",
      name: "Defensive Protocols",
      attribute: "Defense",
      description: "Strengthen defensive mechanisms through simulated attack scenarios.",
      duration: 12,
      improvement: 4,
      energy: 25,
      icon: <FaShieldAlt className="text-3xl" />,
    },
    {
      id: "strategic-planning",
      name: "Strategic Analysis",
      attribute: "Strategy",
      description: "Develop long-term planning abilities through strategic game simulations.",
      duration: 15,
      improvement: 5,
      energy: 30,
      icon: <FaChessKnight className="text-3xl" />,
    },
  ];

  // Energy regeneration effect
  useEffect(() => {
    if (energy < 100) {
      const timer = setTimeout(() => {
        setEnergy(prev => Math.min(prev + 5, 100));
      }, 10000); // Regenerate 5 energy every 10 seconds
      return () => clearTimeout(timer);
    }
  }, [energy]);

  // Training countdown effect
  useEffect(() => {
    if (activeExercise && timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (activeExercise && timeRemaining === 0) {
      // Training complete
      updateAgentAttribute(
        activeExercise.attribute,
        agent?.attributes[activeExercise.attribute] + activeExercise.improvement
      );
      setActiveExercise(null);
      setShowSuccess(true);
      setCooldown(true);
      
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
      
      setTimeout(() => {
        setCooldown(false);
      }, 5000);
    }
  }, [activeExercise, timeRemaining, agent, updateAgentAttribute]);

  const startTraining = (exercise: TrainingExercise) => {
    if (cooldown) return;
    
    if (energy >= exercise.energy) {
      setActiveExercise(exercise);
      setTimeRemaining(exercise.duration);
      setEnergy(prev => prev - exercise.energy);
    }
  };

  const cancelTraining = () => {
    setActiveExercise(null);
    // No energy refund for cancellation
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">AI Agent Training Center</h1>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Enhance your AI agent's capabilities through specialized training exercises.
            Each exercise improves specific attributes vital for surviving the deadly games.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Agent Stats */}
          <div className="order-2 lg:order-1">
            <AgentStats />
            
            {/* Energy Meter */}
            <motion.div 
              className="mt-6 bg-gray-800 rounded-lg shadow-lg p-6 border-2 border-gray-700"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <FaBolt className="text-yellow-400 mr-2" /> Training Energy
              </h3>
              <div className="mb-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300">Energy Available</span>
                  <span className="font-bold text-white">{energy}/100</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
                  <motion.div
                    className="bg-yellow-400 h-2.5"
                    style={{ width: `${energy}%` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${energy}%` }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="w-full h-full relative">
                      <div className="absolute inset-0 bg-white opacity-20 animate-pulse-strong"></div>
                    </div>
                  </motion.div>
                </div>
              </div>
              <p className="text-gray-400 text-sm">
                Energy regenerates over time. Each training exercise consumes energy.
              </p>
            </motion.div>
          </div>

          {/* Training Simulation */}
          <div className="col-span-2 order-1 lg:order-2">
            {/* Active Training Exercise */}
            {activeExercise ? (
              <motion.div 
                className="bg-gray-800 rounded-lg shadow-lg p-6 border-2 border-gray-700 mb-8"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-white flex items-center">
                    {AttributeIcon[activeExercise.attribute]} 
                    <span className="ml-2">{activeExercise.name}</span>
                  </h3>
                  <div className="text-xl font-bold text-white">
                    {timeRemaining}s
                  </div>
                </div>
                
                <div className="relative h-40 mb-6 overflow-hidden rounded-lg border border-gray-700">
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900 opacity-50"></div>
                  
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <motion.div
                        animate={{ 
                          scale: [1, 1.1, 1],
                          rotate: [0, 5, 0, -5, 0] 
                        }}
                        transition={{ 
                          duration: 2, 
                          repeat: Infinity,
                          repeatType: "loop" 
                        }}
                      >
                        <BotIcon 
                          type={agent?.attributes.Strategy > 70 ? 'strategic' : 
                                agent?.attributes.Speed > 70 ? 'speedy' : 
                                agent?.attributes.Defense > 70 ? 'defensive' : 
                                agent?.attributes.Intelligence > 70 && agent?.attributes.Strategy > 60 ? 'balanced' : 'default'}
                          size="lg"
                          level={agent?.level}
                        />
                      </motion.div>
                      <motion.div 
                        className="mt-4 text-white font-bold"
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        Training in progress...
                      </motion.div>
                    </div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-300">Progress</span>
                    <span className="font-bold text-white">
                      {Math.floor(((activeExercise.duration - timeRemaining) / activeExercise.duration) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
                    <motion.div
                      className="bg-squid-pink h-2.5"
                      initial={{ width: 0 }}
                      animate={{ width: `${((activeExercise.duration - timeRemaining) / activeExercise.duration) * 100}%` }}
                      transition={{ duration: 0.5 }}
                    >
                      <div className="w-full h-full relative">
                        <div className="absolute inset-0 bg-white opacity-20 animate-pulse-strong"></div>
                      </div>
                    </motion.div>
                  </div>
                </div>
                
                <div className="text-center">
                  <button
                    onClick={cancelTraining}
                    className="px-6 py-3 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition duration-200"
                  >
                    Cancel Training
                  </button>
                </div>
              </motion.div>
            ) : (
              <AnimatePresence>
                {showSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-green-500 text-white p-4 rounded-lg mb-6 flex items-center shadow-lg"
                  >
                    <FaCheck className="mr-2" />
                    <span>Training completed successfully! Your agent has improved.</span>
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            {/* Training Exercises List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {trainingExercises.map((exercise) => (
                <motion.div
                  key={exercise.id}
                  className={`bg-gray-800 rounded-lg shadow-lg p-6 border-2 ${
                    activeExercise?.id === exercise.id
                      ? "border-squid-pink"
                      : energy < exercise.energy || cooldown
                      ? "border-gray-700 opacity-50"
                      : "border-gray-700 hover:border-squid-pink"
                  } transition-all duration-300`}
                  whileHover={
                    energy >= exercise.energy && !cooldown && !activeExercise
                      ? { y: -5, scale: 1.02 }
                      : {}
                  }
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => {
                    if (!activeExercise && energy >= exercise.energy && !cooldown) {
                      startTraining(exercise);
                    }
                  }}
                >
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center mr-4">
                      {exercise.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{exercise.name}</h3>
                      <p className="text-sm text-squid-pink">
                        Improves {exercise.attribute}
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-gray-300 text-sm mb-4">
                    {exercise.description}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div className="bg-gray-700 p-2 rounded text-center">
                      <span className="text-gray-400 block">Duration</span>
                      <span className="text-white font-bold">{exercise.duration}s</span>
                    </div>
                    <div className="bg-gray-700 p-2 rounded text-center">
                      <span className="text-gray-400 block">Energy Cost</span>
                      <span className="text-white font-bold">{exercise.energy}</span>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <button
                      className={`w-full py-2 rounded-md font-bold ${
                        energy >= exercise.energy && !cooldown && !activeExercise
                          ? "bg-squid-pink text-white hover:bg-opacity-80"
                          : "bg-gray-700 text-gray-500 cursor-not-allowed"
                      } transition-colors`}
                      disabled={energy < exercise.energy || cooldown || !!activeExercise}
                    >
                      {energy < exercise.energy
                        ? "Not Enough Energy"
                        : cooldown
                        ? "Cooling Down..."
                        : activeExercise
                        ? "Training in Progress"
                        : "Start Training"}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 