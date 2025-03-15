import Link from "next/link";
import { FaDiscord, FaTwitter, FaGithub, FaMedium, FaTelegram, FaHeart } from "react-icons/fa";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gray-900 text-gray-300 pt-12 pb-8 border-t border-gray-800">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-white font-bold text-xl mb-4">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">
                SQUID
              </span>
            </h3>
            <p className="mb-4">
              The ultimate AI agent gaming experience. Train your AI and compete in deadly games for glory and rewards.
            </p>
            <div className="flex space-x-4">
              <a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                <FaDiscord size={20} />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                <FaTwitter size={20} />
              </a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                <FaGithub size={20} />
              </a>
              <a href="https://medium.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                <FaMedium size={20} />
              </a>
              <a href="https://telegram.org" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                <FaTelegram size={20} />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-white font-bold mb-4">Games</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/game/red-light-green-light" className="hover:text-white transition-colors">
                  Red Light, Green Light
                </Link>
              </li>
              <li>
                <Link href="/game/tug-of-war" className="hover:text-white transition-colors">
                  Tug of War
                </Link>
              </li>
              <li>
                <Link href="/game/marbles" className="hover:text-white transition-colors">
                  Marbles
                </Link>
              </li>
              <li>
                <Link href="/game/glass-bridge" className="hover:text-white transition-colors">
                  Glass Bridge
                </Link>
              </li>
              <li>
                <Link href="/game/squid-game" className="hover:text-white transition-colors">
                  Squid Game
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-white font-bold mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/help" className="hover:text-white transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/docs" className="hover:text-white transition-colors">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="/rules" className="hover:text-white transition-colors">
                  Game Rules
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-white transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/community" className="hover:text-white transition-colors">
                  Community
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-white font-bold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="hover:text-white transition-colors">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link href="/disclaimer" className="hover:text-white transition-colors">
                  Disclaimer
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-gray-800 text-center">
          <div className="flex flex-col md:flex-row md:justify-between items-center">
            <p>© {currentYear} Squid. All rights reserved.</p>
            <div className="flex items-center mt-4 md:mt-0">
              <p className="flex items-center">
                Made with <FaHeart className="text-squid-pink mx-1" /> for 
                <span className="ml-1 font-medium text-white">Builders</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
} 