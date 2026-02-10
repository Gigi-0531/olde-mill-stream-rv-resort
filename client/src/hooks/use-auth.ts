// Re-export from the context for backwards compatibility
export { useAuth } from "@/contexts/AuthContext";
// AuthContext.tsx
import React, { createContext, useContext } from "react";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma"; // replace with your DB client

interface AuthContextType {
  register: (username: string, password: string) => Promise<void>;
  loginAdmin: (username: string, password: string) => Promise<void>;
  loginResident: (lotNumber: string, lastName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Basic input sanitization (letters, numbers only)
  const sanitize = (input: string) => input.replace(/[^a-zA-Z0-9]/g, "");

  // Registration function
  const register = async (username: string, password: string) => {
    const cleanUsername = sanitize(username);
    const cleanPassword = sanitize(password);

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(cleanPassword, saltRounds);

    await prisma.user.create({
      data: {
        username: cleanUsername,
        password: hashedPassword,
      },
    });
  };

  // Admin login
  const loginAdmin = async (username: string, password: string) => {
    const cleanUsername = sanitize(username);
    const cleanPassword = sanitize(password);

    const user = await prisma.user.findUnique({ where: { username: cleanUsername } });
    if (!user) throw new Error("Almost there… just one step away from your admin dashboard!");

    const match = await bcrypt.compare(cleanPassword, user.password);
    if (!match) throw new Error("Almost there… just one step away from your admin dashboard!");
  };

  // RV park resident login
  const loginResident = async (lotNumber: string, lastName: string) => {
    const cleanLot = sanitize(lotNumber);
    const cleanName = sanitize(lastName);

    const user = await prisma.resident.findFirst({
      where: { lotNumber: cleanLot, lastName: cleanName },
    });

    if (!user) throw new Error("One step from your lot! Your RV is waiting—try again.");
  };

  return (
    <AuthContext.Provider value={{ register, loginAdmin, loginResident }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
import bcrypt from 'bcrypt';
import { prisma } from './prismaClient';

export async function loginUser(username: string, password: string) {
  const user = await prisma.user.findUnique({ where: { username } });

  if (!user) {
    throw new Error('Login failed'); // security-safe message
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    throw new Error('Login failed'); // same message for wrong password
  }

  return user; // login success
}
export function useAuth() {
  const register = async (username: string, password: string) => {
    return await registerUser(username, password);
  };

  const login = async (username: string, password: string) => {
    return await loginUser(username, password);
  };

  return { register, login };
}
const safeInput = username.replace(/[^a-zA-Z0-9]/g, '');
