import React from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ChevronRight,
  Leaf,
  Play
} from 'lucide-react';
import leafImage from '../assets/leaf.jpg';
import { Marquee3D } from '../effect/Component';
import Market from '../components/Market';

const ScrollIndicator = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <motion.div
      style={{ scaleX }}
      className="fixed top-0 right-0 left-0 z-50 h-1 origin-left bg-[#63A361]"
    />
  );
};

export const Home: React.FC = () => {
  return (
    <div className="overflow-hidden relative bg-white">
      <ScrollIndicator />

      {/* Hero Section */}
      <div className="relative">
        <section className="relative min-h-[95vh] py-12 sm:py-16 lg:py-20 lg:pb-8">
          <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8 overflow-hidden">
            <div className="relative grid max-w-lg grid-cols-1 mx-auto lg:max-w-full lg:items-center lg:grid-cols-2 gap-y-12 lg:gap-x-8 overflow-visible lg:overflow-hidden">
              <div className="relative z-10">
                <div className="text-center lg:text-left">
                  {/* Market Insights CTA */}
                  <div className="inline-block mb-8">
                    <Link
                      to="/market"
                      className="flex items-center space-x-2.5 border border-[#5B532C]/20 rounded-full bg-[#FDE7B3]/30 p-1 text-sm text-[#5B532C]"
                    >
                      <p className="pl-3">Get real-time market prices and insights</p>
                      <div className="flex items-center px-3 py-1 space-x-1 text-[#5B532C] rounded-2xl bg-[#FFC50F]/40">
                        <p>Check</p>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </Link>
                  </div>

                  <h1 className="text-4xl font-bold leading-tight text-[#5B532C] sm:text-5xl sm:leading-tight lg:leading-tight lg:text-6xl">
                    Smart Farming Made Simple with{' '}
                    <span
                      className="relative inline-block align-middle"
                      style={{
                        WebkitTextFillColor: 'transparent',
                        WebkitTextStroke: '3px',
                        backgroundImage: `url(${leafImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        WebkitBackgroundClip: 'text',
                        backgroundClip: 'text',
                        color: 'transparent',
                        fontWeight: 800,
                        letterSpacing: '0.03em'
                      }}
                    >
                      GENERATIVE AI
                    </span>
                  </h1>
                  <p className="mt-3 mb-4 text-lg text-[#5B532C]/70 sm:mt-6">
                    Use AI to make better farming decisions, detect crop diseases early, and maximize your yield.
                  </p>

                  {/* CTA Buttons */}
                  <div className="flex flex-col gap-4 justify-center items-center mb-12 sm:flex-row lg:justify-start">
                    <Link
                      to="/consult"
                      className="inline-flex gap-2 items-center px-6 py-3 text-base font-semibold text-white bg-[#63A361] rounded-xl"
                    >
                      <Play className="w-4 h-4" />
                      Get Started
                      <ChevronRight className="w-4 h-4" />
                    </Link>

                    <Link
                      to="/monitor"
                      className="inline-flex gap-2 items-center px-6 py-3 text-base font-semibold text-[#5B532C] rounded-xl border border-[#5B532C]/20 bg-white"
                    >
                      <Leaf className="w-4 h-4 text-[#63A361]" />
                      Monitor Your Farm
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-center mt-10 space-x-6 lg:justify-start sm:space-x-8">
                    <div className="flex items-center">
                      <p className="text-3xl font-bold text-[#63A361] sm:text-4xl">95%</p>
                      <p className="ml-3 text-sm text-[#5B532C]/70">
                        Monitoring
                        <br />
                        Accuracy
                      </p>
                    </div>

                    <div className="hidden sm:block w-px h-10 bg-[#5B532C]/20" />

                    <div className="flex items-center">
                      <p className="text-3xl font-bold text-[#63A361] sm:text-4xl">50+</p>
                      <p className="ml-3 text-sm text-[#5B532C]/70">
                        Crops
                        <br />
                        Supported
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Marquee3D Component */}
              <div className="hidden lg:flex absolute top-0 right-0 bottom-0 w-1/2 z-0 pointer-events-none">
                <div className="w-full h-full flex items-center justify-center pr-8">
                  <Marquee3D />
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* Market Section */}
      <section className="relative border-t border-[#5B532C]/10">
        <Market />
      </section>
    </div>
  );
};

export default Home;