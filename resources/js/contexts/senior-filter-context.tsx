import { createContext, useContext, useState } from 'react';

export const SENIOR_COLORS = ['#10b981','#06b6d4','#f59e0b','#ec4899','#6366f1','#84cc16'];

interface Value {
    checkedSeniors: number[];
    toggleSenior: (id: number) => void;
}

const Ctx = createContext<Value>({ checkedSeniors: [], toggleSenior: () => {} });

export function SeniorFilterProvider({ children }: { children: React.ReactNode }) {
    const [checkedSeniors, setCheckedSeniors] = useState<number[]>([]);
    const toggleSenior = (id: number) =>
        setCheckedSeniors(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
    return <Ctx.Provider value={{ checkedSeniors, toggleSenior }}>{children}</Ctx.Provider>;
}

export const useSeniorFilter = () => useContext(Ctx);
