import { createFileRoute } from "@tanstack/react-router";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Compass,
  Crown,
  Flame,
  Globe2,
  GraduationCap,
  History,
  Layers,
  Scale,
  Shield,
  Sparkles,
  Swords,
  Target,
  Zap,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { AppShell, SectionTitle } from "../components/AppShell";
import { KbachDivider } from "../components/KhmerOrnament";
import { OukPiece } from "../components/OukPiece";
import { useI18n } from "../lib/i18n";
import { PIECE_NAMES } from "../lib/khmer-chess";
import { HANDBOOK_I18N, LESSONS } from "../lib/handbook-data";

export const Route = createFileRoute("/tactics")({
  head: () => ({
    meta: [
      { title: "Learn & Tactics — Ouk Chatrang" },
      {
        name: "description",
        content:
          "Learn authentic Ouk Chatrang rules, piece movements, standard openings, folk vs international SEA Games standards, and endgame counting rules.",
      },
      { property: "og:title", content: "Learn & Tactics — Ouk Chatrang" },
      {
        property: "og:description",
        content: "Complete handbook and guided lessons on ancient Khmer chess of Angkor.",
      },
    ],
  }),
  component: TacticsPage,
});

export function TacticsPage() {
  const { t, lang } = useI18n();
  const [activeTab, setActiveTab] = useState<"handbook" | "lessons">("handbook");
  const [done, setDone] = useState<string[]>([]);
  const [openLesson, setOpenLesson] = useState<string | null>(LESSONS[0]!.id);
  const [expandedSection, setExpandedSection] = useState<number | null>(1);

  const h = (key: string) => HANDBOOK_I18N[key]?.[lang] ?? HANDBOOK_I18N[key]?.en ?? "";

  return (
    <AppShell title={t("learn")} subtitle={t("app_subtitle")}>
      {/* Tab Switcher */}
      <div className="animate-rise mb-5 flex rounded-2xl border border-gold/40 bg-card/80 p-1 backdrop-blur">
        <button
          type="button"
          onClick={() => setActiveTab("handbook")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-all ${
            activeTab === "handbook"
              ? "bg-royal text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>{t("guide_tab_handbook")}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("lessons")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-all ${
            activeTab === "lessons"
              ? "bg-royal text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          <span>{t("guide_tab_lessons")}</span>
        </button>
      </div>

      {activeTab === "handbook" ? (
        <div className="animate-rise space-y-4">
          {/* Handbook Hero Banner */}
          <section className="kbach-frame relative overflow-hidden rounded-3xl bg-card p-4.5 border border-gold/30 shadow-sm">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gold/20 blur-2xl pointer-events-none" />
            <div className="flex items-center gap-3.5">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-gold/40 bg-secondary text-gold-dark">
                <BookOpen className="h-6 w-6 text-gold-dark" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="rounded-full border border-gold/40 bg-secondary/80 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-gold-dark">
                  {h("angkor_badge")}
                </span>
                <h2 className="font-serif text-base font-bold text-foreground mt-1 truncate">
                  {t("handbook_title")}
                </h2>
                <p className="text-[11px] text-muted-foreground truncate">
                  {t("handbook_subtitle")}
                </p>
              </div>
            </div>
          </section>

          {/* Section 1: Introduction to Ancient Ouk Chatrang */}
          <HandbookAccordionItem
            id={1}
            open={expandedSection === 1}
            onToggle={() => setExpandedSection(expandedSection === 1 ? null : 1)}
            icon={History}
            title={t("guide_sec1_title")}
            subtitle={t("guide_sec1_subtitle")}
          >
            <div className="space-y-3 pt-2 text-xs leading-relaxed text-foreground/90">
              <p>{h("sec1_text")}</p>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-2xl border border-gold/30 bg-secondary/50 p-3">
                  <span className="font-bold text-gold-dark">{h("sec1_box1_title")}</span>
                  <p className="mt-1 text-muted-foreground">{h("sec1_box1_desc")}</p>
                </div>
                <div className="rounded-2xl border border-gold/30 bg-secondary/50 p-3">
                  <span className="font-bold text-gold-dark">{h("sec1_box2_title")}</span>
                  <p className="mt-1 text-muted-foreground">{h("sec1_box2_desc")}</p>
                </div>
              </div>
            </div>
          </HandbookAccordionItem>

          {/* Section 2: Board & Standard Setup */}
          <HandbookAccordionItem
            id={2}
            open={expandedSection === 2}
            onToggle={() => setExpandedSection(expandedSection === 2 ? null : 2)}
            icon={Layers}
            title={t("guide_sec2_title")}
            subtitle={t("guide_sec2_subtitle")}
          >
            <div className="space-y-3 pt-2 text-xs leading-relaxed text-foreground/90">
              <p>{h("sec2_text")}</p>
              <div className="rounded-2xl border border-border bg-secondary/40 p-3 space-y-2">
                <div className="flex items-center justify-between font-mono text-[11px] font-bold text-gold-dark border-b border-border/60 pb-1.5">
                  <span>{h("sec2_backline_title")}</span>
                  <span>Tuuk - Ses - Koul - Neang - Ang - Koul - Ses - Tuuk</span>
                </div>
                <p className="text-[11px] text-muted-foreground">{h("sec2_backline_desc")}</p>
                <div className="flex items-center justify-between font-mono text-[11px] font-bold text-gold-dark border-t border-border/60 pt-1.5">
                  <span>{h("sec2_pawnline_title")}</span>
                  <span>{h("sec2_pawnline_desc")}</span>
                </div>
              </div>
            </div>
          </HandbookAccordionItem>

          {/* Section 3: Six Royal Pieces */}
          <HandbookAccordionItem
            id={3}
            open={expandedSection === 3}
            onToggle={() => setExpandedSection(expandedSection === 3 ? null : 3)}
            icon={Crown}
            title={t("guide_sec3_title")}
            subtitle={t("guide_sec3_subtitle")}
          >
            <div className="space-y-3 pt-2 text-xs leading-relaxed text-foreground/90">
              <div className="grid gap-2.5">
                {/* King Ang */}
                <div className="flex items-start gap-3 rounded-2xl border border-border bg-card/60 p-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-gold/30 bg-secondary/80">
                    <OukPiece type="k" color="w" className="h-8 w-8" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-foreground">
                      {PIECE_NAMES.k.km} · {PIECE_NAMES.k[lang] ?? PIECE_NAMES.k.en}
                    </h4>
                    <p className="mt-0.5 text-muted-foreground">{h("piece_k_desc")}</p>
                  </div>
                </div>

                {/* Queen Neang */}
                <div className="flex items-start gap-3 rounded-2xl border border-border bg-card/60 p-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-gold/30 bg-secondary/80">
                    <OukPiece type="q" color="w" className="h-8 w-8" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-foreground">
                      {PIECE_NAMES.q.km} · {PIECE_NAMES.q[lang] ?? PIECE_NAMES.q.en}
                    </h4>
                    <p className="mt-0.5 text-muted-foreground">{h("piece_q_desc")}</p>
                  </div>
                </div>

                {/* Elephant Koul */}
                <div className="flex items-start gap-3 rounded-2xl border border-border bg-card/60 p-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-gold/30 bg-secondary/80">
                    <OukPiece type="b" color="w" className="h-8 w-8" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-foreground">
                      {PIECE_NAMES.b.km} · {PIECE_NAMES.b[lang] ?? PIECE_NAMES.b.en}
                    </h4>
                    <p className="mt-0.5 text-muted-foreground">{h("piece_b_desc")}</p>
                  </div>
                </div>

                {/* Horse Ses */}
                <div className="flex items-start gap-3 rounded-2xl border border-border bg-card/60 p-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-gold/30 bg-secondary/80">
                    <OukPiece type="n" color="w" className="h-8 w-8" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-foreground">
                      {PIECE_NAMES.n.km} · {PIECE_NAMES.n[lang] ?? PIECE_NAMES.n.en}
                    </h4>
                    <p className="mt-0.5 text-muted-foreground">{h("piece_n_desc")}</p>
                  </div>
                </div>

                {/* Boat Tuuk */}
                <div className="flex items-start gap-3 rounded-2xl border border-border bg-card/60 p-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-gold/30 bg-secondary/80">
                    <OukPiece type="r" color="w" className="h-8 w-8" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-foreground">
                      {PIECE_NAMES.r.km} · {PIECE_NAMES.r[lang] ?? PIECE_NAMES.r.en}
                    </h4>
                    <p className="mt-0.5 text-muted-foreground">{h("piece_r_desc")}</p>
                  </div>
                </div>

                {/* Fish Trey */}
                <div className="flex items-start gap-3 rounded-2xl border border-border bg-card/60 p-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-gold/30 bg-secondary/80">
                    <OukPiece type="p" color="w" className="h-8 w-8" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-foreground">
                      {PIECE_NAMES.p.km} · {PIECE_NAMES.p[lang] ?? PIECE_NAMES.p.en} /{" "}
                      {PIECE_NAMES.f[lang] ?? PIECE_NAMES.f.en}
                    </h4>
                    <p className="mt-0.5 text-muted-foreground">{h("piece_p_desc")}</p>
                  </div>
                </div>
              </div>
            </div>
          </HandbookAccordionItem>

          {/* Section 4: Piece Movements & Powers */}
          <HandbookAccordionItem
            id={4}
            open={expandedSection === 4}
            onToggle={() => setExpandedSection(expandedSection === 4 ? null : 4)}
            icon={Compass}
            title={t("guide_sec4_title")}
            subtitle={t("guide_sec4_subtitle")}
          >
            <div className="space-y-3 pt-2 text-xs leading-relaxed text-foreground/90">
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-2xl border border-border bg-secondary/50 p-3">
                  <span className="font-bold text-gold-dark">
                    {PIECE_NAMES.k.km} ({PIECE_NAMES.k[lang] ?? PIECE_NAMES.k.en})
                  </span>
                  <p className="mt-1 text-muted-foreground">{h("mov_ang")}</p>
                </div>
                <div className="rounded-2xl border border-border bg-secondary/50 p-3">
                  <span className="font-bold text-gold-dark">
                    {PIECE_NAMES.q.km} ({PIECE_NAMES.q[lang] ?? PIECE_NAMES.q.en})
                  </span>
                  <p className="mt-1 text-muted-foreground">{h("mov_neang")}</p>
                </div>
                <div className="rounded-2xl border border-border bg-secondary/50 p-3">
                  <span className="font-bold text-gold-dark">
                    {PIECE_NAMES.b.km} ({PIECE_NAMES.b[lang] ?? PIECE_NAMES.b.en})
                  </span>
                  <p className="mt-1 text-muted-foreground">{h("mov_koul")}</p>
                </div>
                <div className="rounded-2xl border border-border bg-secondary/50 p-3">
                  <span className="font-bold text-gold-dark">
                    {PIECE_NAMES.n.km} ({PIECE_NAMES.n[lang] ?? PIECE_NAMES.n.en})
                  </span>
                  <p className="mt-1 text-muted-foreground">{h("mov_ses")}</p>
                </div>
                <div className="rounded-2xl border border-border bg-secondary/50 p-3">
                  <span className="font-bold text-gold-dark">
                    {PIECE_NAMES.r.km} ({PIECE_NAMES.r[lang] ?? PIECE_NAMES.r.en})
                  </span>
                  <p className="mt-1 text-muted-foreground">{h("mov_tuuk")}</p>
                </div>
                <div className="rounded-2xl border border-border bg-secondary/50 p-3">
                  <span className="font-bold text-gold-dark">
                    {PIECE_NAMES.p.km} ({PIECE_NAMES.p[lang] ?? PIECE_NAMES.p.en}) /{" "}
                    {PIECE_NAMES.f.km} ({PIECE_NAMES.f[lang] ?? PIECE_NAMES.f.en})
                  </span>
                  <p className="mt-1 text-muted-foreground">{h("mov_trey")}</p>
                </div>
              </div>
            </div>
          </HandbookAccordionItem>

          {/* Section 5: Check & Checkmate (Ouk & Ouk Ngueb) */}
          <HandbookAccordionItem
            id={5}
            open={expandedSection === 5}
            onToggle={() => setExpandedSection(expandedSection === 5 ? null : 5)}
            icon={Target}
            title={t("guide_sec5_title")}
            subtitle={t("guide_sec5_subtitle")}
          >
            <div className="space-y-3 pt-2 text-xs leading-relaxed text-foreground/90">
              <div className="rounded-2xl border border-gold/30 bg-secondary/50 p-3.5 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-gold/20 border border-gold/50 px-2 py-0.5 text-[10px] font-bold text-gold-dark">
                    Ouk!
                  </span>
                  <h4 className="font-serif font-bold text-foreground">{h("sec5_check_title")}</h4>
                </div>
                <p className="text-muted-foreground text-[11px]">{h("sec5_check_desc")}</p>
              </div>

              <div className="rounded-2xl border border-royal/40 bg-secondary/50 p-3.5 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-royal/20 border border-royal/50 px-2 py-0.5 text-[10px] font-bold text-gold-dark">
                    Ouk Ngueb!
                  </span>
                  <h4 className="font-serif font-bold text-foreground">{h("sec5_mate_title")}</h4>
                </div>
                <p className="text-muted-foreground text-[11px]">{h("sec5_mate_desc")}</p>
              </div>
            </div>
          </HandbookAccordionItem>

          {/* Section 6: Fundamental Openings */}
          <HandbookAccordionItem
            id={6}
            open={expandedSection === 6}
            onToggle={() => setExpandedSection(expandedSection === 6 ? null : 6)}
            icon={Zap}
            title={t("guide_sec6_title")}
            subtitle={t("guide_sec6_subtitle")}
          >
            <div className="space-y-3 pt-2 text-xs leading-relaxed text-foreground/90">
              <div className="grid gap-2 text-[11px]">
                <div className="rounded-2xl border border-border bg-secondary/40 p-3">
                  <span className="font-bold text-gold-dark">{h("sec6_open1_title")}</span>
                  <p className="mt-0.5 text-muted-foreground">{h("sec6_open1_desc")}</p>
                </div>
                <div className="rounded-2xl border border-border bg-secondary/40 p-3">
                  <span className="font-bold text-gold-dark">{h("sec6_open2_title")}</span>
                  <p className="mt-0.5 text-muted-foreground">{h("sec6_open2_desc")}</p>
                </div>
                <div className="rounded-2xl border border-border bg-secondary/40 p-3">
                  <span className="font-bold text-gold-dark">{h("sec6_open3_title")}</span>
                  <p className="mt-0.5 text-muted-foreground">{h("sec6_open3_desc")}</p>
                </div>
              </div>
            </div>
          </HandbookAccordionItem>

          {/* Section 7: Basic Tactics & Combinations */}
          <HandbookAccordionItem
            id={7}
            open={expandedSection === 7}
            onToggle={() => setExpandedSection(expandedSection === 7 ? null : 7)}
            icon={Swords}
            title={t("guide_sec7_title")}
            subtitle={t("guide_sec7_subtitle")}
          >
            <div className="space-y-3 pt-2 text-xs leading-relaxed text-foreground/90">
              <div className="grid gap-2 text-[11px]">
                <div className="rounded-2xl border border-border bg-secondary/40 p-3">
                  <span className="font-bold text-gold-dark">{h("sec7_tac1_title")}</span>
                  <p className="mt-0.5 text-muted-foreground">{h("sec7_tac1_desc")}</p>
                </div>
                <div className="rounded-2xl border border-border bg-secondary/40 p-3">
                  <span className="font-bold text-gold-dark">{h("sec7_tac2_title")}</span>
                  <p className="mt-0.5 text-muted-foreground">{h("sec7_tac2_desc")}</p>
                </div>
              </div>
            </div>
          </HandbookAccordionItem>

          {/* Section 8: Traditional Folk Rules */}
          <HandbookAccordionItem
            id={8}
            open={expandedSection === 8}
            onToggle={() => setExpandedSection(expandedSection === 8 ? null : 8)}
            icon={Flame}
            title={t("guide_sec8_title")}
            subtitle={t("guide_sec8_subtitle")}
          >
            <div className="space-y-3 pt-2 text-xs leading-relaxed text-foreground/90">
              <div className="rounded-2xl border border-gold/30 bg-secondary/50 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-gold-dark" />
                  <span className="font-bold text-foreground">{h("sec8_header")}</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[11px]">
                  <li>{h("sec8_rule1")}</li>
                  <li>{h("sec8_rule2")}</li>
                  <li>{h("sec8_rule3")}</li>
                </ul>
              </div>
            </div>
          </HandbookAccordionItem>

          {/* Section 9: International & SEA Games Rules */}
          <HandbookAccordionItem
            id={9}
            open={expandedSection === 9}
            onToggle={() => setExpandedSection(expandedSection === 9 ? null : 9)}
            icon={Globe2}
            title={t("guide_sec9_title")}
            subtitle={t("guide_sec9_subtitle")}
          >
            <div className="space-y-3 pt-2 text-xs leading-relaxed text-foreground/90">
              <div className="rounded-2xl border border-gold/30 bg-secondary/50 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-gold-dark" />
                  <span className="font-bold text-foreground">{h("sec9_header")}</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[11px]">
                  <li>{h("sec9_rule1")}</li>
                  <li>{h("sec9_rule2")}</li>
                  <li>{h("sec9_rule3")}</li>
                  <li>{h("sec9_rule4")}</li>
                </ul>
              </div>
            </div>
          </HandbookAccordionItem>

          {/* Section 10: Endgame Counting Rules (Mij / Viel) */}
          <HandbookAccordionItem
            id={10}
            open={expandedSection === 10}
            onToggle={() => setExpandedSection(expandedSection === 10 ? null : 10)}
            icon={Scale}
            title={t("guide_sec10_title")}
            subtitle={t("guide_sec10_subtitle")}
          >
            <div className="space-y-3 pt-2 text-xs leading-relaxed text-foreground/90">
              <p>{h("sec10_intro")}</p>

              {/* Viel K'dar (Board Counting) */}
              <div className="rounded-2xl border border-border bg-secondary/40 p-3 space-y-1.5">
                <span className="font-serif font-bold text-gold-dark">
                  {h("sec10_board_count_title")}
                </span>
                <p className="text-muted-foreground text-[11px]">{h("sec10_board_count_desc")}</p>
              </div>

              {/* Viel L'koun (Piece Counting) */}
              <div className="rounded-2xl border border-gold/30 bg-secondary/40 p-3 space-y-1.5">
                <span className="font-serif font-bold text-gold-dark">
                  {h("sec10_piece_count_title")}
                </span>
                <p className="text-muted-foreground text-[11px]">{h("sec10_piece_count_desc")}</p>
                <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-xl border border-border bg-secondary/50 p-2.5">
                    <span className="font-semibold text-foreground">{h("c_2boats")}</span>{" "}
                    <span className="font-bold text-gold-dark">8 {h("moves_unit")}</span>
                  </div>
                  <div className="rounded-xl border border-border bg-secondary/50 p-2.5">
                    <span className="font-semibold text-foreground">{h("c_1boat")}</span>{" "}
                    <span className="font-bold text-gold-dark">16 {h("moves_unit")}</span>
                  </div>
                  <div className="rounded-xl border border-border bg-secondary/50 p-2.5">
                    <span className="font-semibold text-foreground">{h("c_2elephants")}</span>{" "}
                    <span className="font-bold text-gold-dark">22 {h("moves_unit")}</span>
                  </div>
                  <div className="rounded-xl border border-border bg-secondary/50 p-2.5">
                    <span className="font-semibold text-foreground">{h("c_2horses")}</span>{" "}
                    <span className="font-bold text-gold-dark">32 {h("moves_unit")}</span>
                  </div>
                  <div className="rounded-xl border border-border bg-secondary/50 p-2.5">
                    <span className="font-semibold text-foreground">{h("c_1elephant")}</span>{" "}
                    <span className="font-bold text-gold-dark">44 {h("moves_unit")}</span>
                  </div>
                  <div className="rounded-xl border border-border bg-secondary/50 p-2.5">
                    <span className="font-semibold text-foreground">{h("c_1horse_or_other")}</span>{" "}
                    <span className="font-bold text-gold-dark">64 {h("moves_unit")}</span>
                  </div>
                </div>
              </div>
            </div>
          </HandbookAccordionItem>
        </div>
      ) : (
        <div className="animate-rise space-y-4">
          {/* Lessons Progress Banner */}
          <section className="kbach-frame flex items-center gap-3 rounded-3xl bg-card p-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-gold/40 bg-secondary">
              <GraduationCap className="h-6 w-6 text-gold-dark" />
            </span>
            <div className="flex-1">
              <p className="font-serif text-sm font-semibold text-foreground">
                {t("tactics_title")}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {done.length}/{LESSONS.length} {t("solved")}
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="bg-royal h-full rounded-full transition-all duration-500"
                  style={{ width: `${(done.length / LESSONS.length) * 100}%` }}
                />
              </div>
            </div>
          </section>

          <div className="my-2">
            <KbachDivider />
          </div>

          <SectionTitle icon={Swords}>{t("guide_tab_lessons")}</SectionTitle>

          <ul className="grid gap-2.5">
            {LESSONS.map((l) => {
              const solved = done.includes(l.id);
              const expanded = openLesson === l.id;
              const title = l.title[lang] ?? l.title.en;
              const goal = l.goal[lang] ?? l.goal.en;
              const details = l.details[lang] ?? l.details.en;

              return (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => setOpenLesson(expanded ? null : l.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-300 ${
                      solved
                        ? "border-jade/50 bg-jade/10"
                        : "border-border bg-card hover:border-gold/60"
                    }`}
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-gold/30 bg-secondary/80 p-1.5">
                      <OukPiece type={l.piece} color="w" className="h-7 w-7" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-serif text-sm font-semibold text-foreground">
                        {title}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {PIECE_NAMES[l.piece].km} ·{" "}
                        {PIECE_NAMES[l.piece][lang] ?? PIECE_NAMES[l.piece].en}
                      </span>
                    </span>
                    {solved ? <CheckCircle2 className="h-5 w-5 text-jade shrink-0" /> : null}
                  </button>

                  {expanded ? (
                    <div className="animate-rise mt-1.5 rounded-2xl border border-gold/30 bg-secondary/50 p-3.5 space-y-2.5">
                      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-dark">
                        <Target className="h-3.5 w-3.5" />
                        <span>{t("objective")}</span>
                      </div>
                      <p className="text-xs font-medium leading-relaxed text-foreground">{goal}</p>
                      <p className="text-xs leading-relaxed text-muted-foreground">{details}</p>
                      <button
                        type="button"
                        onClick={() =>
                          setDone((d) =>
                            d.includes(l.id) ? d.filter((x) => x !== l.id) : [...d, l.id],
                          )
                        }
                        className="bg-royal mt-2 w-full rounded-xl px-4 py-2.5 text-xs font-semibold text-primary-foreground transition-transform duration-300 active:scale-95"
                      >
                        {solved ? t("lesson_complete") : t("solved")}
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </AppShell>
  );
}

function HandbookAccordionItem({
  id,
  open,
  onToggle,
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  id: number;
  open: boolean;
  onToggle: () => void;
  icon: typeof Shield;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card shadow-sm transition-all duration-300">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-gold/30 bg-secondary text-gold-dark">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-serif text-sm font-bold text-foreground truncate">{title}</h3>
            <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
          </div>
        </div>
        <ChevronDown
          className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-300 ${
            open ? "rotate-180 text-gold-dark" : ""
          }`}
        />
      </button>
      {open ? (
        <div className="animate-rise border-t border-border/60 px-4 pb-4">{children}</div>
      ) : null}
    </div>
  );
}
