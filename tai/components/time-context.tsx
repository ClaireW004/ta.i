"use client"
import { createContext, useContext } from "react";

export const TimeContext = createContext<number>(0);
export const useTotalSeconds = () => useContext(TimeContext);
