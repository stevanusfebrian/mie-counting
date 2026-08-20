"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";

const MenuTab = dynamic(() => import("./components/MenuTab"), { ssr: false });
const TitipanTab = dynamic(() => import("./components/TitipanTab"), { ssr: false });
const PengeluaranTab = dynamic(() => import("./components/PengeluaranTab"), { ssr: false });
const ResepBomTab = dynamic(() => import("./components/ResepBomTab"), { ssr: false });

const tabs = [
  { key: "menu", label: "Master Menu" },
  { key: "titipan", label: "Master Titipan" },
  { key: "pengeluaran", label: "Master Pengeluaran" },
  { key: "resep_bom", label: "Master Resep (BOM)" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

export default function MasterDataPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("menu");
  const [openedTabs, setOpenedTabs] = useState<Set<TabKey>>(new Set(["menu"]));

  const openTab = (key: TabKey) => {
    setActiveTab(key);
    setOpenedTabs((previous) => new Set(previous).add(key));
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-3 py-4 text-zinc-900 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500 sm:text-sm">Modul 2</p>
            <h1 className="text-2xl font-bold sm:text-3xl">Master Data</h1>
          </div>
          <Link href="/" className="min-h-11 rounded border border-zinc-300 bg-white px-4 py-2 text-center text-base font-medium text-zinc-700 hover:bg-zinc-100 sm:text-sm">Kembali ke Dashboard</Link>
        </header>

        <nav className="mb-4 flex gap-1 overflow-x-auto border-b border-zinc-200" aria-label="Master data tabs">
          {tabs.map((tab) => (
            <button key={tab.key} type="button" onClick={() => openTab(tab.key)} className={`min-h-12 shrink-0 border-b-2 px-3 py-2 text-base font-medium sm:px-4 sm:text-sm ${activeTab === tab.key ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-800"}`}>
              {tab.label}
            </button>
          ))}
        </nav>

        <div className={activeTab === "menu" ? "block" : "hidden"}>{openedTabs.has("menu") && <MenuTab />}</div>
        <div className={activeTab === "titipan" ? "block" : "hidden"}>{openedTabs.has("titipan") && <TitipanTab />}</div>
        <div className={activeTab === "pengeluaran" ? "block" : "hidden"}>{openedTabs.has("pengeluaran") && <PengeluaranTab />}</div>
        <div className={activeTab === "resep_bom" ? "block" : "hidden"}>{openedTabs.has("resep_bom") && <ResepBomTab />}</div>
      </div>
    </main>
  );
}
