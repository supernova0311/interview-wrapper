"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Code, BookOpen, Bot } from "lucide-react";
import { SignInButton, SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const [isHovering, setIsHovering] = useState<number | null>(null);

  useEffect(() => {
    if (isSignedIn) {
      router.push("/app");
    }
  }, [isSignedIn, router]);

  const features = [
    {
      title: "Live Coding",
      description:
        "Real-time collaborative coding environment with syntax highlighting and execution",
      icon: <Code className="h-8 w-8" />,
      color: "from-blue-400 to-blue-600",
    },
    {
      title: "AI Interview Prep",
      description:
        "AI-powered interview prep with curated questions and dynamically generated study materials, tailored by skill level and topic.",
      icon: <BookOpen className="h-8 w-8" />,
      color: "from-emerald-400 to-emerald-600",
    },
    {
      title: "AI Analysis",
      description:
        "Smart evaluation with performance metrics and improvement suggestions",
      icon: <Bot className="h-8 w-8" />,
      color: "from-purple-400 to-purple-600",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white overflow-hidden relative">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-emerald-500/10"
            initial={{
              x: Math.random() * 100,
              y: Math.random() * 100,
              width: Math.random() * 300 + 100,
              height: Math.random() * 300 + 100,
              opacity: 0.1,
            }}
            animate={{
              x: Math.random() * 100 - 50,
              y: Math.random() * 100 - 50,
              transition: {
                duration: Math.random() * 15 + 10,
                repeat: Infinity,
                repeatType: "reverse",
              },
            }}
          />
        ))}
      </div>

      {/* Glowing Border */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent animate-pulse" />

      <SignedOut>
        {/* Navigation */}
        <motion.nav
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative flex justify-between items-center p-6 max-w-7xl mx-auto"
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent"
          >
            Interview-Wrapper
          </motion.div>
          <div className="flex gap-4">
            <SignInButton >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 backdrop-blur-sm">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            </SignInButton>
          </div>
        </motion.nav>

        {/* Hero Section */}
        <section className="relative container mx-auto px-6 py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                Modernize
              </span>{" "}
              Your Interview Process
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-10">
              The complete platform for conducting and managing technical
              interviews with ease.
            </p>
            <div className="flex justify-center gap-4">
              <SignInButton >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 backdrop-blur-sm"
                  >
                    Start Free Trial
                  </Button>
                </motion.div>
              </SignInButton>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  size="lg"
                  variant="outline"
                  className="border-gray-600 text-white hover:bg-gray-700 backdrop-blur-sm"
                >
                  Learn More
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* Features Section */}
        <section
          id="features"
          className="relative bg-gray-800/50 py-16 backdrop-blur-sm"
        >
          <div className="container mx-auto px-6">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-3xl font-bold text-center mb-12"
            >
              Key Features
            </motion.h2>
            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -10 }}
                  onHoverStart={() => setIsHovering(index)}
                  onHoverEnd={() => setIsHovering(null)}
                  className={cn(
                    "bg-gray-700/50 p-8 rounded-xl transition-all border border-gray-600/50 hover:border-emerald-400/30 relative overflow-hidden",
                    isHovering === index ? "shadow-lg" : ""
                  )}
                >
                  <div className="absolute inset-0 bg-gradient-to-br opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  <div
                    className={`bg-gradient-to-r ${feature.color} bg-clip-text text-transparent mb-4`}
                  >
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-300">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </SignedOut>

      <SignedIn>
        <div className="flex items-center justify-center min-h-screen">
          <p>Redirecting to app...</p>
        </div>
      </SignedIn>
    </div>
  );
}
