"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { FaRobot, FaTrophy, FaSkull, FaHandPointer, FaEye, FaArrowRight } from "react-icons/fa";
import { useAIAgent } from "@/contexts/AIAgentContext";
import AgentStats from "@/components/game/AgentStats";

type Marble = {
  id: number;
  owner: "player" | "opponent";
  selected: boolean;
};

type MarbleGuess = {
  odd: boolean;
  count: number;
};

export default function MarblesPage() {
  const { agent } = useAIAgent();
  const [gameState, setGameState] = useState<"ready" | "playing" | "won" | "lost">("ready");
  const [countdown, setCountdown] = useState(3);
  const [round, setRound] = useState(1);
  const [playerMarbles, setPlayerMarbles] = useState<Marble[]>([]);
  const [opponentMarbles, setOpponentMarbles] = useState<Marble[]>([]);
  const [playerTurn, setPlayerTurn] = useState(true);
  const [playerHiddenMarbles, setPlayerHiddenMarbles] = useState<Marble[]>([]);
  const [opponentHiddenMarbles, setOpponentHiddenMarbles] = useState<Marble[]>([]);
  
  const [playerGuess, setPlayerGuess] = useState<MarbleGuess>({ odd: true, count: 1 });
  const [opponentGuess, setOpponentGuess] = useState<MarbleGuess>({ odd: false, count: 0 });
  
  const [selectedMarbleCount, setSelectedMarbleCount] = useState(0);
  const [showGuessUI, setShowGuessUI] = useState(false);
  const [showHiddenMarbles, setShowHiddenMarbles] = useState(false);
  const [roundResult, setRoundResult] = useState<"won" | "lost" | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const aiTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Start the game
  const startGame = () => {
    setGameState("playing");
    setCountdown(3);
    setRound(1);
    setPlayerTurn(Math.random() > 0.5); // Random starting player
    setRoundResult(null);
    setShowGuessUI(false);
    setShowHiddenMarbles(false);
    setAiThinking(false);
    
    // Initialize marbles
    const initialPlayerMarbles = Array.from({ length: 10 }, (_, index) => ({
      id: index,
      owner: "player" as const,
      selected: false,
    }));
    
    const initialOpponentMarbles = Array.from({ length: 10 }, (_, index) => ({
      id: index + 10,
      owner: "opponent" as const,
      selected: false,
    }));
    
    setPlayerMarbles(initialPlayerMarbles);
    setOpponentMarbles(initialOpponentMarbles);
    setPlayerHiddenMarbles([]);
    setOpponentHiddenMarbles([]);
    
    // Start countdown
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  // Handle marble selection (for player)
  const handleMarbleSelect = (marble: Marble) => {
    if (!playerTurn || showGuessUI || playerMarbles.length === 0) return;
    
    setPlayerMarbles(prev => 
      prev.map(m => 
        m.id === marble.id 
          ? { ...m, selected: !m.selected } 
          : m
      )
    );
    
    setSelectedMarbleCount(prev => 
      marble.selected ? prev - 1 : prev + 1
    );
  };
  
  // Handle hiding marbles (placing your bet)
  const handleHideMarbles = () => {
    if (selectedMarbleCount === 0) return;
    
    const selected = playerMarbles.filter(m => m.selected);
    const notSelected = playerMarbles.filter(m => !m.selected);
    
    setPlayerHiddenMarbles(selected);
    setPlayerMarbles(notSelected);
    setSelectedMarbleCount(0);
    setShowGuessUI(true);
  };
  
  // Handle player guess (odd or even)
  const handleOddEvenSelect = (odd: boolean) => {
    setPlayerGuess(prev => ({ ...prev, odd }));
  };
  
  // Handle player guess (count)
  const handleCountChange = (count: number) => {
    if (count < 1 || count > opponentHiddenMarbles.length) return;
    setPlayerGuess(prev => ({ ...prev, count }));
  };
  
  // Handle player's final guess submission
  const handleGuessSubmit = () => {
    if (!showGuessUI) return;
    
    // Check if the guess is correct
    const isOdd = opponentHiddenMarbles.length % 2 === 1;
    const guessCorrect = playerGuess.odd === isOdd && playerGuess.count === opponentHiddenMarbles.length;
    
    // Show hidden marbles
    setShowHiddenMarbles(true);
    
    // Process round result
    setTimeout(() => {
      if (guessCorrect) {
        // Player wins the round
        setRoundResult("won");
        
        // Transfer marbles
        setPlayerMarbles(prev => [
          ...prev, 
          ...opponentHiddenMarbles.map(m => ({ ...m, owner: "player" }))
        ]);
        setOpponentHiddenMarbles([]);
        
      } else {
        // Player loses the round
        setRoundResult("lost");
        
        // Transfer marbles
        setOpponentMarbles(prev => [
          ...prev, 
          ...playerHiddenMarbles.map(m => ({ ...m, owner: "opponent" }))
        ]);
        setPlayerHiddenMarbles([]);
      }
      
      // Check for game end
      setTimeout(() => {
        if (playerMarbles.length === 0 && playerHiddenMarbles.length === 0) {
          setGameState("lost");
        } else if (opponentMarbles.length === 0 && opponentHiddenMarbles.length === 0) {
          setGameState("won");
        } else {
          // Next round
          setRound(prev => prev + 1);
          setPlayerTurn(!playerTurn);
          setShowGuessUI(false);
          setShowHiddenMarbles(false);
          setRoundResult(null);
        }
      }, 2000);
    }, 1500);
  };
  
  // AI logic - makes decisions when it's not player's turn
  useEffect(() => {
    if (gameState !== "playing" || playerTurn || countdown > 0) return;
    
    // AI selects marbles to hide
    if (opponentHiddenMarbles.length === 0 && opponentMarbles.length > 0) {
      setAiThinking(true);
      
      aiTimeoutRef.current = setTimeout(() => {
        const maxMarbles = Math.min(opponentMarbles.length, 3); // AI won't bet all marbles at once
        const marblesToHide = Math.floor(Math.random() * maxMarbles) + 1;
        
        const selected = opponentMarbles.slice(0, marblesToHide);
        const notSelected = opponentMarbles.slice(marblesToHide);
        
        setOpponentHiddenMarbles(selected);
        setOpponentMarbles(notSelected);
        setAiThinking(false);
        setShowGuessUI(true);
      }, 2000);
      
      return () => {
        if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
      };
    }
    
    // AI makes a guess
    if (showGuessUI && playerHiddenMarbles.length > 0) {
      setAiThinking(true);
      
      aiTimeoutRef.current = setTimeout(() => {
        // AI's guess is based on its "intelligence" attribute
        const intelligenceLevel = agent?.attributes.Intelligence || 50;
        const guessAccuracy = intelligenceLevel / 100;
        
        // With higher intelligence, AI has better chance of guessing correctly
        let aiGuessOdd: boolean;
        let aiGuessCount: number;
        
        if (Math.random() < guessAccuracy) {
          // Correct guess
          aiGuessOdd = playerHiddenMarbles.length % 2 === 1;
          aiGuessCount = playerHiddenMarbles.length;
        } else {
          // Random guess
          aiGuessOdd = Math.random() > 0.5;
          aiGuessCount = Math.floor(Math.random() * 3) + 1;
        }
        
        setOpponentGuess({
          odd: aiGuessOdd,
          count: aiGuessCount
        });
        
        setAiThinking(false);
        setShowHiddenMarbles(true);
        
        // Process AI guess
        setTimeout(() => {
          const guessCorrect = aiGuessOdd === (playerHiddenMarbles.length % 2 === 1) && 
                             aiGuessCount === playerHiddenMarbles.length;
          
          if (guessCorrect) {
            // AI wins the round
            setRoundResult("lost");
            
            // Transfer marbles
            setOpponentMarbles(prev => [
              ...prev, 
              ...playerHiddenMarbles.map(m => ({ ...m, owner: "opponent" }))
            ]);
            setPlayerHiddenMarbles([]);
            
          } else {
            // AI loses the round
            setRoundResult("won");
            
            // Transfer marbles
            setPlayerMarbles(prev => [
              ...prev, 
              ...opponentHiddenMarbles.map(m => ({ ...m, owner: "player" }))
            ]);
            setOpponentHiddenMarbles([]);
          }
          
          // Check for game end
          setTimeout(() => {
            if (playerMarbles.length === 0 && playerHiddenMarbles.length === 0) {
              setGameState("lost");
            } else if (opponentMarbles.length === 0 && opponentHiddenMarbles.length === 0) {
              setGameState("won");
            } else {
              // Next round
              setRound(prev => prev + 1);
              setPlayerTurn(!playerTurn);
              setShowGuessUI(false);
              setShowHiddenMarbles(false);
              setRoundResult(null);
            }
          }, 2000);
        }, 1500);
      }, 3000);
      
      return () => {
        if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
      };
    }
  }, [playerTurn, opponentMarbles, opponentHiddenMarbles, showGuessUI, playerHiddenMarbles, gameState, countdown, agent]);
  
  // Clean up intervals on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    };
  }, []);
  
  return (
    <div className="container mx-auto py-12 px-4">
      <h1 className="text-4xl font-bold text-squid-pink mb-8 text-center">Marbles</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Game Info */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-squid-dark mb-4">Game Rules</h2>
            <p className="text-gray-700 mb-4">
              Play a game of marbles against your opponent. Hide marbles in your hand and guess how many marbles your opponent is hiding.
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4">
              <li>Select marbles to hide in your hand</li>
              <li>Guess if your opponent is holding an odd or even number of marbles</li>
              <li>Guess the exact count of marbles</li>
              <li>If you guess correctly, you win your opponent's marbles</li>
              <li>If you guess incorrectly, your opponent wins your marbles</li>
              <li>Lose all your marbles and you're eliminated</li>
            </ul>
            
            {gameState === "ready" && (
              <button
                className="w-full bg-squid-pink text-white py-3 rounded-md font-bold hover:bg-opacity-90 transition-colors"
                onClick={startGame}
              >
                Start Game
              </button>
            )}
            
            {gameState === "won" && (
              <div className="text-center">
                <FaTrophy className="text-yellow-500 text-5xl mx-auto mb-2" />
                <p className="text-xl font-bold text-green-600 mb-2">You Won!</p>
                <button
                  className="w-full bg-squid-pink text-white py-3 rounded-md font-bold hover:bg-opacity-90 transition-colors"
                  onClick={startGame}
                >
                  Play Again
                </button>
              </div>
            )}
            
            {gameState === "lost" && (
              <div className="text-center">
                <FaSkull className="text-red-500 text-5xl mx-auto mb-2" />
                <p className="text-xl font-bold text-red-600 mb-2">Eliminated!</p>
                <button
                  className="w-full bg-squid-pink text-white py-3 rounded-md font-bold hover:bg-opacity-90 transition-colors"
                  onClick={startGame}
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
          
          <AgentStats />
        </div>
        
        {/* Game Area */}
        <div className="lg:col-span-2">
          {gameState === "playing" && countdown > 0 ? (
            <div className="bg-squid-dark rounded-lg shadow-lg p-20 flex items-center justify-center">
              <div className="text-7xl font-bold text-squid-pink">{countdown}</div>
            </div>
          ) : (
            <div className="bg-squid-dark rounded-lg shadow-lg p-6 relative">
              {/* Game Status */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center mr-2">
                    <span className="text-white font-bold">{round}</span>
                  </div>
                  <span className="text-white font-bold">Round {round}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-white font-bold mr-2">Turn:</span>
                  {playerTurn ? (
                    <span className="text-squid-pink font-bold">Your Turn</span>
                  ) : (
                    <span className="text-blue-400 font-bold">Opponent's Turn</span>
                  )}
                </div>
              </div>
              
              {/* Round Result */}
              {roundResult && (
                <div className={`mb-6 p-3 rounded-md text-center ${roundResult === "won" ? "bg-green-500" : "bg-red-500"}`}>
                  <p className="text-white font-bold">
                    {roundResult === "won" 
                      ? "You won this round! You take your opponent's marbles." 
                      : "You lost this round! Your opponent takes your marbles."}
                  </p>
                </div>
              )}
              
              {/* Opponent Area */}
              <div className="mb-6">
                <h3 className="text-white font-bold mb-2">Opponent</h3>
                <div className="bg-gray-800 p-4 rounded-md">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mr-2">
                        <FaRobot className="text-white" />
                      </div>
                      <span className="text-white">Enemy-001</span>
                    </div>
                    <div className="bg-blue-500 rounded-full px-3 py-1">
                      <span className="text-white font-bold">{opponentMarbles.length + opponentHiddenMarbles.length} marbles</span>
                    </div>
                  </div>
                  
                  {/* Opponent Hand (Hidden Marbles) */}
                  {opponentHiddenMarbles.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center mb-2">
                        <FaHandPointer className="text-blue-400 mr-2" />
                        <span className="text-white">Hidden in hand</span>
                      </div>
                      <div className="flex justify-center p-4 bg-gray-700 rounded-md relative">
                        {!showHiddenMarbles ? (
                          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
                            <FaEye className="text-white text-xl" />
                          </div>
                        ) : (
                          <div className="flex flex-wrap justify-center gap-2">
                            {opponentHiddenMarbles.map(marble => (
                              <motion.div 
                                key={marble.id}
                                className="w-8 h-8 bg-blue-500 rounded-full"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 0.3 }}
                              />
                            ))}
                          </div>
                        )}
                        
                        {showHiddenMarbles && (
                          <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-gray-800 px-2 py-1 rounded-full">
                            <span className="text-white text-xs font-bold">
                              {opponentHiddenMarbles.length} marbles ({opponentHiddenMarbles.length % 2 === 1 ? "Odd" : "Even"})
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* AI Thinking Indicator */}
                  {aiThinking && (
                    <div className="flex justify-center items-center p-4 bg-gray-700 rounded-md mb-4">
                      <div className="animate-pulse flex items-center">
                        <div className="bg-blue-500 rounded-full h-2 w-2 mr-1"></div>
                        <div className="bg-blue-500 rounded-full h-2 w-2 mr-1 animate-pulse delay-75"></div>
                        <div className="bg-blue-500 rounded-full h-2 w-2 animate-pulse delay-150"></div>
                        <span className="text-white ml-2">Thinking...</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Opponent's Guess */}
                  {!playerTurn && showHiddenMarbles && (
                    <div className="p-4 bg-gray-700 rounded-md mb-4">
                      <p className="text-white text-center">
                        Opponent guessed: <span className="font-bold">{opponentGuess.odd ? "Odd" : "Even"}</span>, 
                        Count: <span className="font-bold">{opponentGuess.count}</span>
                      </p>
                    </div>
                  )}
                  
                  {/* Opponent's Available Marbles */}
                  <div>
                    <div className="flex items-center mb-2">
                      <span className="text-white">Available marbles</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {opponentMarbles.map(marble => (
                        <div 
                          key={marble.id}
                          className="w-8 h-8 bg-blue-500 rounded-full"
                        />
                      ))}
                      {opponentMarbles.length === 0 && (
                        <p className="text-gray-400 italic">No available marbles</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Center Divider */}
              <div className="flex justify-center items-center mb-6">
                <div className="w-16 h-1 bg-squid-pink rounded-full"></div>
              </div>
              
              {/* Player Area */}
              <div>
                <h3 className="text-white font-bold mb-2">You</h3>
                <div className="bg-gray-800 p-4 rounded-md">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-squid-pink rounded-full flex items-center justify-center mr-2">
                        <FaRobot className="text-white" />
                      </div>
                      <span className="text-white">{agent?.name || "Player"}</span>
                    </div>
                    <div className="bg-squid-pink rounded-full px-3 py-1">
                      <span className="text-white font-bold">{playerMarbles.length + playerHiddenMarbles.length} marbles</span>
                    </div>
                  </div>
                  
                  {/* Player Hand (Hidden Marbles) */}
                  {playerHiddenMarbles.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center mb-2">
                        <FaHandPointer className="text-squid-pink mr-2" />
                        <span className="text-white">Hidden in your hand</span>
                      </div>
                      <div className="flex justify-center p-4 bg-gray-700 rounded-md relative">
                        {!showHiddenMarbles ? (
                          <div className="w-16 h-16 bg-squid-pink rounded-full flex items-center justify-center">
                            <FaEye className="text-white text-xl" />
                          </div>
                        ) : (
                          <div className="flex flex-wrap justify-center gap-2">
                            {playerHiddenMarbles.map(marble => (
                              <motion.div 
                                key={marble.id}
                                className="w-8 h-8 bg-squid-pink rounded-full"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 0.3 }}
                              />
                            ))}
                          </div>
                        )}
                        
                        {showHiddenMarbles && (
                          <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-gray-800 px-2 py-1 rounded-full">
                            <span className="text-white text-xs font-bold">
                              {playerHiddenMarbles.length} marbles ({playerHiddenMarbles.length % 2 === 1 ? "Odd" : "Even"})
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Player's Available Marbles */}
                  <div className="mb-4">
                    <div className="flex items-center mb-2">
                      <span className="text-white">Available marbles</span>
                      {playerTurn && playerMarbles.length > 0 && !showGuessUI && (
                        <span className="text-gray-400 ml-2 text-sm">
                          (Click to select marbles to hide)
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {playerMarbles.map(marble => (
                        <motion.div 
                          key={marble.id}
                          className={`w-8 h-8 bg-squid-pink rounded-full cursor-pointer ${
                            marble.selected ? "ring-2 ring-white" : ""
                          }`}
                          whileHover={{ scale: playerTurn && !showGuessUI ? 1.1 : 1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleMarbleSelect(marble)}
                        />
                      ))}
                      {playerMarbles.length === 0 && (
                        <p className="text-gray-400 italic">No available marbles</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Player Controls - Hide Marbles */}
                  {playerTurn && !showGuessUI && playerMarbles.length > 0 && (
                    <button
                      className={`w-full py-3 rounded-md font-bold ${
                        selectedMarbleCount > 0 
                          ? "bg-squid-pink text-white hover:bg-opacity-90" 
                          : "bg-gray-600 text-gray-400 cursor-not-allowed"
                      }`}
                      onClick={handleHideMarbles}
                      disabled={selectedMarbleCount === 0}
                    >
                      Hide Selected Marbles ({selectedMarbleCount})
                    </button>
                  )}
                  
                  {/* Player Guess UI */}
                  {playerTurn && showGuessUI && (
                    <div className="p-4 bg-gray-700 rounded-md">
                      <h4 className="text-white font-bold mb-3">Make Your Guess</h4>
                      
                      <div className="mb-4">
                        <p className="text-white mb-2">Is it odd or even?</p>
                        <div className="flex gap-2">
                          <button
                            className={`px-4 py-2 rounded-md font-bold ${
                              playerGuess.odd 
                                ? "bg-squid-pink text-white" 
                                : "bg-gray-600 text-white"
                            }`}
                            onClick={() => handleOddEvenSelect(true)}
                          >
                            Odd
                          </button>
                          <button
                            className={`px-4 py-2 rounded-md font-bold ${
                              !playerGuess.odd 
                                ? "bg-squid-pink text-white" 
                                : "bg-gray-600 text-white"
                            }`}
                            onClick={() => handleOddEvenSelect(false)}
                          >
                            Even
                          </button>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <p className="text-white mb-2">How many marbles?</p>
                        <div className="flex items-center justify-center">
                          <button
                            className="w-10 h-10 bg-gray-600 rounded-full text-white font-bold"
                            onClick={() => handleCountChange(playerGuess.count - 1)}
                            disabled={playerGuess.count <= 1}
                          >
                            -
                          </button>
                          <div className="mx-4 w-12 h-12 bg-squid-pink rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-xl">{playerGuess.count}</span>
                          </div>
                          <button
                            className="w-10 h-10 bg-gray-600 rounded-full text-white font-bold"
                            onClick={() => handleCountChange(playerGuess.count + 1)}
                            disabled={playerGuess.count >= opponentHiddenMarbles.length}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      
                      <button
                        className="w-full bg-squid-pink text-white py-3 rounded-md font-bold hover:bg-opacity-90"
                        onClick={handleGuessSubmit}
                      >
                        Submit Guess
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 