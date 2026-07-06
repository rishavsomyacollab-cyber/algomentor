"use client";

import { create } from "zustand";
import type { Topic } from "@/lib/types";

interface TopicStore {
  selectedTopic: Topic | null;
  setSelectedTopic: (topic: Topic | null) => void;
}

export const useTopicStore = create<TopicStore>((set) => ({
  selectedTopic: null,
  setSelectedTopic: (topic) => set({ selectedTopic: topic }),
}));
