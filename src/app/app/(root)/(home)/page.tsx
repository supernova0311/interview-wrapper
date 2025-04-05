"use client";

import ActionCard from "@/components/ActionCard";
import { QUICK_ACTIONS } from "@/constants";
import { useUserRole } from "@/hooks/useUserRole";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import MeetingModal from "@/components/MeetingModal";
import LoaderUI from "@/components/LoaderUI";
import { Loader2Icon } from "lucide-react";
import MeetingCard from "@/components/MeetingCard";
import { motion } from "framer-motion";

export default function Home() {
  const router = useRouter();
  const { isInterviewer, isCandidate, isLoading } = useUserRole();
  const interviews = useQuery(api.interviews.getMyInterviews);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"start" | "join">();

  const handleQuickAction = (title: string) => {
    switch (title) {
      case "New Call":
        setModalType("start");
        setShowModal(true);
        break;
      case "Join Interview":
        setModalType("join");
        setShowModal(true);
        break;
      default:
        router.push(`/${title.toLowerCase()}`);
    }
  };

  if (isLoading) return <LoaderUI />;

  return (
    <div className="container max-w-7xl mx-auto p-6">
      {/* WELCOME SECTION */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl bg-gradient-to-br from-gray-900 to-gray-800 p-6 border border-gray-700 shadow-lg mb-10"
      >
        <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
          Welcome back!
        </h1>
        <p className="text-gray-400 mt-2">
          {isInterviewer
            ? "Manage your interviews and review candidates effectively"
            : "Access your upcoming interviews and preparations"}
        </p>
      </motion.div>

      {isInterviewer ? (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {QUICK_ACTIONS.map((action, index) => (
              <motion.div
                key={action.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <ActionCard
                  action={action}
                  onClick={() => handleQuickAction(action.title)}
                />
              </motion.div>
            ))}
          </div>

          <MeetingModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            title={modalType === "join" ? "Join Meeting" : "Start Meeting"}
            isJoinMeeting={modalType === "join"}
          />
        </>
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h1 className="text-3xl font-bold text-gray-200">Your Interviews</h1>
            <p className="text-gray-400 mt-1">View and join your scheduled interviews</p>
          </motion.div>

          <div className="mt-8">
            {interviews === undefined ? (
              <div className="flex justify-center py-12">
                <Loader2Icon className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : interviews.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {interviews.map((interview, index) => (
                  <motion.div
                    key={interview._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <MeetingCard interview={interview} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 text-gray-400 rounded-lg border border-gray-700 bg-gray-900/50"
              >
                You have no scheduled interviews at the moment
              </motion.div>
            )}
          </div>
        </>
      )}
    </div>
  );
}